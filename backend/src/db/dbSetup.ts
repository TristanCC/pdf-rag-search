// db.ts
import { Client } from "pg";
import "dotenv/config"

/*
            const embeddedFile= {
                message: "received pdf!",
                file: req.file,
                fileBody: req.body,
                extracted: extractedText,
                numChunks: chunks.length,
                previewChunk: chunks[0],
                embeddings: embeddings
            }
*/

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5433,
  user: process.env.DB_USER || "raguser",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "ragdb",
});

export async function connectDB() {
  try {
    await client.connect();
    console.log("Postgres connected!");
  } catch (err) {
    console.error("Failed to connect to Postgres", err);
    process.exit(1); // stop server if DB fails
  }
}

export async function test(data: any) {
  try {
    const response = await client.query("SELECT * FROM test")
    const responseData = response.rows
    console.log("debug: ", responseData)
    console.log("row inserted")
  }
  catch (err) {
    console.error("Failed to insert row", err)
  }
}

export async function insertRows(chunks: any[]) {
  try {
    // Insert each chunk with its embedding
    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO embeddings (chunktext, embedding, metadata) 
         VALUES ($1, $2, $3)`,
        [
          chunk.content,
          JSON.stringify(chunk.embedding), // Convert array to JSON string
          JSON.stringify(chunk.metadata)   // Convert metadata object to JSON string
        ]
      );
    }
    console.log(`Successfully inserted ${chunks.length} rows`);
  } catch (err) {
    console.error("Failed to insert rows:", err);
    throw err; // Re-throw so the caller knows it failed
  }
}

export default client;
