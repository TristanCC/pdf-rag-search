// index.ts

import express, { Request, Response } from "express";
import "dotenv/config";
import multer from "multer"
import { stringify } from "querystring";
import { randomUUID } from "crypto";
import client from "./db/dbSetup.js";
import { connectDB } from "./db/dbSetup.js";
import { extractTextPerPage, chunkText } from "./services/pdfProcessor.js";

const app = express()
const port = process.env.PORT

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

            // append metadata to chunks 
        const chunks = extractedText.flatMap(page =>
            chunkText(page.text).map((chunk, i) => ({
                ...chunk,
                metadata: {
                    filename: pdf.originalname,
                    pageNumber: page.pageNumber,
                    chunkIndex: i,
                    uploadedAt: new Date().toISOString()
                }
            }))
        )
            const embeddingRes = await fetch("http://127.0.0.1:8000/embed", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({chunks})
            })

            const embeddings = await embeddingRes.json()

            res.status(200).json({
                message: "received pdf!",
                file: req.file,
                fileBody: req.body,
                extracted: extractedText,
                numChunks: chunks.length,
                previewChunk: chunks[0],
                embeddings: embeddings
            })

        } catch (err) {
            console.error("Extraction error:", err)
            res.status(500).json({ error: "Failed to extract PDF text." })
        }
    } else {
        res.status(400).json({ error: "Wrong file type or none selected." })
    }
})



app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})

