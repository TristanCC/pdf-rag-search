// index.ts

import express, { Request, Response } from "express";
import cors from "cors"
import "dotenv/config";
import multer from "multer"
import { stringify } from "querystring";
import { randomUUID } from "crypto";
import client from "./db/dbSetup.js";
import { connectDB, insertRows } from "./db/dbSetup.js";
import { extractTextPerPage, chunkText } from "./services/pdfProcessor.js";

const app = express()
const port = process.env.PORT

app.use(cors({ origin: "http://localhost:3000" }));
await connectDB()

// setup multer config for defining file storage location
const UPLOADLOCATION = process.env.UPLOADLOCATION ?? "uploads/"
var uniqueName = ""
const storage = multer.diskStorage({

    destination: (req, file, callback) => {
        callback(null, UPLOADLOCATION)
    },

    filename: (req, file, callback) => {
        uniqueName = Date.now() + "_" + randomUUID() + "_" + file.originalname
        callback(null, uniqueName)
    },

    

})

const upload = multer({dest: UPLOADLOCATION, storage, limits: {fileSize: 20 * 1024 * 1024} })  // 20MB filesize limit for now

app.use((req, res, next) => {
    console.log("i am middleware!")
    next()
})

app.get("/", (req,res) => {
    console.log("hello world!")
    res.send("hello world!")
})

app.post(`/uploadPDF`, upload.single('uploadedPDF'), async (req, res) => {
    const pdf = req.file
    if (pdf && pdf.mimetype == "application/pdf") {
        try {
            const extractedText = await extractTextPerPage(pdf.path)

            // Create chunks with metadata
            const chunks = extractedText.flatMap(page =>
                chunkText(page.text).map((chunk, i) => ({
                    content: chunk.content, // Make sure your chunkText returns {content: string}
                    metadata: {
                        filename: pdf.originalname,
                        pageNumber: page.pageNumber,
                        chunkIndex: i,
                        uploadedAt: new Date().toISOString()
                    }
                }))
            )
            
            console.log("Chunks to embed:", chunks.length)

            // Send to Python service for embedding
            const embeddingRes = await fetch("http://127.0.0.1:8000/embed", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({chunks})
            })

            if (!embeddingRes.ok) {
                throw new Error(`Embedding service error: ${embeddingRes.status}`)
            }

            const embeddingData = await embeddingRes.json()
            
            // embeddingData should be {chunks: [...]} from your Python service
            const embeddedChunks = embeddingData.chunks || embeddingData
            
            console.log("Received embeddings for", embeddedChunks.length, "chunks")

            // Now insert the chunks WITH embeddings
            await insertRows(embeddedChunks)

            const response = {
                message: "PDF uploaded and processed successfully!",
                filename: pdf.originalname,
                numChunks: embeddedChunks.length,
                previewChunk: embeddedChunks[0]
            }
            
            res.status(200).json(response)

        } catch (err) {
            console.error("Processing error:", err)
            res.status(500).json({ 
                error: "Failed to process PDF",
                details: err instanceof Error ? err.message : String(err)
            })
        }
    } else {
        res.status(400).json({ error: "Wrong file type or none selected." })
    }
})

app.post("/search", express.json(), async (req: Request, res: Response): Promise<void> => {
    try {
        const { queryText } = req.body;

        if (!queryText || queryText.trim() === "") {
            res.status(400).json({ error: "queryText is required" });
            return;
        }

        console.log("Search query received:", queryText);

        // 1️⃣ Get embedding from Python service
        const embedRes = await fetch("http://127.0.0.1:8000/embed-query", {   // <-- fixed IP
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ queryText })
        });

        if (!embedRes.ok) {
            const errBody = await embedRes.text();
            console.error("Embed service returned:", errBody);
            res.status(500).json({ error: `Embedding service failure: ${embedRes.status}`, details: errBody });
            return;
        }

        const { embeddedQuery } = await embedRes.json();

        if (!embeddedQuery) {
            res.status(500).json({ error: "Python microservice returned no embedding" });
            return;
        
        }

        console.log(embeddedQuery)

        // 2️⃣ Perform vector similarity search
        const dbRes = await client.query(
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

        console.log(`Returned ${dbRes.rows.length} search results`);

        // 3️⃣ Respond
        res.status(200).json({
            query: queryText,
            results: dbRes.rows,
        });
        return;

    } catch (err: any) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed", details: err.message ?? String(err) });
        return;
    }
});





app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})

