import fs from 'fs'
import pdfParse from 'pdf-parse'

export async function extractTextFromPdf(filePath: string) { 
    const fileBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(fileBuffer)
    return {
        text: data.text,
        numPages: data.numpages,
        info: data.info
    }   
}

//export function chunkText(text: string, chunkSize = 1000, overlap = 200) {
//    const chunks = []
//    let index = 0
//    for(let i = 0; i < text.length; i += chunkSize - overlap) {
//        chunks.push({
//            index: index,
//            content: text.slice(i, i+ chunkSize),
//
//        })
//    }
//    return chunks
//}

export function chunkText(text: string, chunkSize = 1000, overlap = 200) {
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        const end = Math.min(i + chunkSize, text.length)
        chunks.push({
            index: chunks.length,
            content: text.slice(i, end)
        })
        if (end === text.length) break
    }
    return chunks
}
