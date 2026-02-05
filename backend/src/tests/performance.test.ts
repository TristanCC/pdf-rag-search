/**
 * Performance Test: Sub-Second Query Latency Verification
 * 
 * This test validates that semantic search queries complete in under 1 second
 * even with large datasets (10k+ chunks). It measures:
 * - Mean, median, P95, and P99 latency percentiles
 * - Performance across different dataset sizes (100, 1k, 5k, 10k chunks)
 * 
 * Prerequisites:
 * 1. Backend server running on port 4000 (default)
 * 2. Python embedding service running on port 8000 (default)
 * 3. PostgreSQL with pgvector extension running
 * 4. Database table 'embeddings' with columns: chunktext, embedding (vector), metadata
 * 
 * To run:
 *   npm test -- performance.test.ts
 * 
 * Note: For optimal performance, ensure you have a pgvector index:
 *   CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fetch from "node-fetch";
import { Client } from "pg";
import "dotenv/config";

// Database connection for seeding test data
const dbClient = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5433,
  user: process.env.DB_USER || "raguser",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "ragdb",
});

const API_BASE_URL = process.env.API_URL || "http://127.0.0.1:4000";
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://127.0.0.1:8000";

// all-MiniLM-L6-v2 produces 384-dimensional embeddings
const EMBEDDING_DIM = 384;

/**
 * Generate a random embedding vector (normalized for cosine similarity)
 */
function generateRandomEmbedding(): number[] {
  const vec = Array.from({ length: EMBEDDING_DIM }, () => Math.random() - 0.5);
  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
  return vec.map(x => x / norm); // Normalize
}

/**
 * Generate realistic chunk text
 */
function generateChunkText(index: number): string {
  const topics = [
    "machine learning", "neural networks", "data science", "artificial intelligence",
    "natural language processing", "computer vision", "deep learning", "statistics",
    "algorithm design", "software engineering", "database systems", "distributed systems"
  ];
  const topic = topics[index % topics.length];
  return `This document discusses ${topic} in detail. It covers various aspects including 
    theoretical foundations, practical applications, and recent developments in the field. 
    The content explores how ${topic} can be applied to solve real-world problems and 
    improve system performance. Researchers have found that ${topic} shows promising results 
    when combined with modern computational techniques.`.slice(0, 1000);
}

/**
 * Seed database with test chunks
 */
async function seedTestData(numChunks: number): Promise<void> {
  console.log(`Seeding database with ${numChunks} chunks...`);
  
  // Clear existing test data (optional - comment out if you want to keep existing data)
  await dbClient.query("DELETE FROM embeddings WHERE metadata->>'testData' = 'true'");
  
  const chunks = [];
  for (let i = 0; i < numChunks; i++) {
    chunks.push({
      content: generateChunkText(i),
      embedding: generateRandomEmbedding(),
      metadata: {
        fileName: `test-document-${Math.floor(i / 10)}.pdf`,
        pageNumber: (i % 10) + 1,
        chunkIndex: i % 10,
        testData: true, // Mark as test data for cleanup
      },
    });
  }

  // Insert in batches for better performance
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const params: any[] = [];
    const placeholders: string[] = [];
    
    batch.forEach((chunk, idx) => {
      const baseIdx = idx * 3;
      placeholders.push(`($${baseIdx + 1}, $${baseIdx + 2}::vector, $${baseIdx + 3})`);
      params.push(chunk.content);
      params.push(`[${chunk.embedding.join(",")}]`);
      params.push(JSON.stringify(chunk.metadata));
    });

    await dbClient.query(
      `INSERT INTO embeddings (chunktext, embedding, metadata) VALUES ${placeholders.join(", ")}`,
      params
    );
  }
  
  console.log(`✓ Seeded ${numChunks} chunks`);
}

/**
 * Measure search query latency
 */
async function measureSearchLatency(queryText: string): Promise<number> {
  const startTime = performance.now();
  
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queryText }),
  });
  
  const endTime = performance.now();
  
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json() as { results?: any[] };
  if (!data.results || data.results.length === 0) {
    throw new Error("Search returned no results");
  }
  
  return endTime - startTime; // Return latency in milliseconds
}

/**
 * Check if API server is available
 */
async function checkServerAvailable(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/`, {
      method: "GET",
      signal: controller.signal as any,
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch (error) {
    return false;
  }
}

/**
 * Measure search query latency directly against database (bypasses API)
 */
async function measureSearchLatencyDirect(queryText: string): Promise<number> {
  // Get embedding from Python service
  const embedStart = performance.now();
  const embedRes = await fetch(`${EMBEDDING_SERVICE_URL}/embed-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queryText }),
  });
  
  if (!embedRes.ok) {
    throw new Error(`Embedding service failed: ${embedRes.status}`);
  }
  
  const embedData = await embedRes.json() as { embeddedQuery?: number[] };
  if (!embedData.embeddedQuery) {
    throw new Error("Embedding service returned no embedding");
  }
  const { embeddedQuery } = embedData;
  const embedTime = performance.now() - embedStart;
  
  // Perform vector search directly
  const searchStart = performance.now();
  const dbRes = await dbClient.query(
    `
    SELECT 
        id,
        chunktext,
        metadata,
        embedding <=> $1::vector AS distance
    FROM embeddings
    ORDER BY embedding <=> $1::vector
    LIMIT 5;
    `,
    [`[${embeddedQuery.join(",")}]`]
  );
  const searchTime = performance.now() - searchStart;
  
  if (!dbRes.rows || dbRes.rows.length === 0) {
    throw new Error("Search returned no results");
  }
  
  // Return total latency (embedding + search)
  return embedTime + searchTime;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

describe("Search Performance - Sub-Second Query Latency", () => {
  const testQueries = [
    "machine learning algorithms",
    "neural network architecture",
    "data processing techniques",
    "artificial intelligence applications",
    "statistical analysis methods",
  ];
  
  let useDirectMode = false; // Whether to test directly against DB (bypasses API)

  beforeAll(async () => {
    // Connect to database
    await dbClient.connect();
    console.log("Connected to database for performance testing");
    
    // Check if API server is available
    const apiAvailable = await checkServerAvailable(API_BASE_URL);
    const embedServiceAvailable = await checkServerAvailable(EMBEDDING_SERVICE_URL);
    
    if (!embedServiceAvailable) {
      throw new Error(
        `Python embedding service not available at ${EMBEDDING_SERVICE_URL}\n` +
        "Please start the embedding service: cd backend/src/services/embedder && python -m uvicorn main:app --port 8000"
      );
    }
    
    if (!apiAvailable) {
      console.warn(
        `⚠️  API server not available at ${API_BASE_URL}\n` +
        "   Testing directly against database (bypassing API)\n" +
        "   To test full API stack, start the backend server: npm run dev"
      );
      useDirectMode = true;
    } else {
      console.log("✓ API server is available, testing full stack");
    }
    
    // Seed with different dataset sizes for comprehensive testing
    const datasetSizes = [100, 1000, 5000];
    
    for (const size of datasetSizes) {
      await seedTestData(size);
      // Wait a bit for index updates (if any)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Final seed with target size (10k chunks for realistic scenario)
    await seedTestData(10000);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    // Cleanup test data
    await dbClient.query("DELETE FROM embeddings WHERE metadata->>'testData' = 'true'");
    await dbClient.end();
  });

  it("should complete search queries in under 1 second (10k chunks)", async () => {
    const latencies: number[] = [];
    const numRuns = 10; // Run each query multiple times for statistical significance
    
    const measureFn = useDirectMode ? measureSearchLatencyDirect : measureSearchLatency;
    const mode = useDirectMode ? "direct DB" : "full API";
    
    console.log(`\nRunning ${numRuns} iterations of ${testQueries.length} queries (${mode} mode)...`);
    
    for (const query of testQueries) {
      for (let i = 0; i < numRuns; i++) {
        const latency = await measureFn(query);
        latencies.push(latency);
        
        // Small delay between queries to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Sort for percentile calculation
    latencies.sort((a, b) => a - b);
    
    const stats = {
      count: latencies.length,
      mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      median: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
    };
    
    console.log("\n=== Performance Statistics ===");
    console.log(`Total queries: ${stats.count}`);
    console.log(`Mean latency: ${stats.mean.toFixed(2)}ms`);
    console.log(`Median latency: ${stats.median.toFixed(2)}ms`);
    console.log(`P95 latency: ${stats.p95.toFixed(2)}ms`);
    console.log(`P99 latency: ${stats.p99.toFixed(2)}ms`);
    console.log(`Min latency: ${stats.min.toFixed(2)}ms`);
    console.log(`Max latency: ${stats.max.toFixed(2)}ms`);
    console.log("=============================\n");
    
    // Assertions: All queries should complete in under 1 second (1000ms)
    expect(stats.mean).toBeLessThan(1000);
    expect(stats.median).toBeLessThan(1000);
    expect(stats.p95).toBeLessThan(1000);
    expect(stats.max).toBeLessThan(1000); // Even worst case should be sub-second
    
    // Additional assertion: 95% of queries should be under 500ms for good UX
    expect(stats.p95).toBeLessThan(500);
  }, 120000); // 2 minute timeout for the test

  it("should maintain sub-second performance with varying dataset sizes", async () => {
    const datasetSizes = [100, 1000, 5000, 10000];
    const query = "machine learning";
    const results: Record<string, number> = {};
    
    const measureFn = useDirectMode ? measureSearchLatencyDirect : measureSearchLatency;
    
    for (const size of datasetSizes) {
      // Clear and seed fresh data for this size
      await dbClient.query("DELETE FROM embeddings WHERE metadata->>'testData' = 'true'");
      await seedTestData(size);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Measure average latency over 5 runs
      const latencies: number[] = [];
      for (let i = 0; i < 5; i++) {
        const latency = await measureFn(query);
        latencies.push(latency);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      results[size.toString()] = avgLatency;
      
      console.log(`${size} chunks: ${avgLatency.toFixed(2)}ms average`);
      
      expect(avgLatency).toBeLessThan(1000);
    }
    
    console.log("\n=== Performance by Dataset Size ===");
    Object.entries(results).forEach(([size, latency]) => {
      console.log(`${size.padStart(6)} chunks: ${latency.toFixed(2)}ms`);
    });
    console.log("===================================\n");
  }, 180000); // 3 minute timeout
});
