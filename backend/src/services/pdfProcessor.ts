//pdfProcessor.ts
import fs from 'fs'
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"

/**
 * Extracts human-readable text from a PDF, grouped by page.
 *
 * Uses pdfjs page objects (not heuristic separators) to preserve
 * authoritative page boundaries as defined in the PDF structure.
 *
 * Note:
 * - Text is returned in reading order as provided by pdfjs.
 * - Layout, columns, and formatting are not preserved.
 * - Some PDFs may yield empty text for image-only pages.
 *
 * @param filePath Absolute or relative path to a PDF file on disk.
 * @returns Promise resolving to an array of pages, each containing:
 *          - pageNumber: 1-based page index
 *          - text: concatenated text content for that page
 */

export async function extractTextPerPage(filePath: string): Promise<{ pageNumber: number; text: string }[]> {
    const loadingTask = pdfjs.getDocument(filePath)
    const pdf = await loadingTask.promise

    const pages: { pageNumber: number; text: string }[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()

        const text = content.items
            .map((item: any) => item.str)
            .join(" ")

        pages.push({ pageNumber: i, text })
        
    }
    console.log(pages)
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
