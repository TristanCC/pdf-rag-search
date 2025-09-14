//pdfProcessor.ts
import fs from 'fs'
import pdf from 'pdf-parse'

export async function extractTextPerPage(filePath: string) {
    const fileBuffer = fs.readFileSync(filePath)
    const data = await pdf(fileBuffer)

    // pdf-parse gives full text, but not page-separated by default
    // so we split by `\f` which is the form-feed page separator
    const pages = data.text.split('\f').map((pageText, idx) => ({
        pageNumber: idx + 1,
        text: pageText.trim()
    }))

    return pages
}


export function chunkText(text: string, chunkSize = 1000, overlap = 200) {
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        const end = Math.min(i + chunkSize, text.length)
        chunks.push({
            content: text.slice(i, end)
        })
        if (end === text.length) break
    }
    return chunks
}
