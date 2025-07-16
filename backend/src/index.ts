import express, { Request, Response } from "express";
import "dotenv/config";
import multer from "multer"
import { stringify } from "querystring";
import { randomUUID } from "crypto";

import { extractTextFromPdf, chunkText } from "./services/pdfProcessor";

const app = express()
const port = process.env.PORT

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

const upload = multer({dest: UPLOADLOCATION, storage, })

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
    if (pdf) {
        try {
            const extractedText = await extractTextFromPdf(pdf.path)
            const chunks = chunkText(extractedText.text).map((chunk, i) => ({
                ...chunk,
                filename: pdf.originalname,
                chunkIndex: i,
                uploadedAt: new Date().toISOString()
            })) 
            res.status(200).json({
                message: "received pdf!",
                file: req.file,
                fileBody: req.body,
                extracted: extractedText,
                numChunks: chunks.length,
                previewChunk: chunks[0]
            })
        } catch (err) {
            console.error("Extraction error:", err)
            res.status(500).json({ error: "Failed to extract PDF text." })
        }
    } else {
        res.status(400).json({ error: "No file uploaded." })
    }
})



app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})

