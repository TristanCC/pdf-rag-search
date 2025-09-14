import { describe, it, expect } from "vitest";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

type FileInfo = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
};

type PDFInfo = {
  PDFFormatVersion: string;
  IsAcroFormPresent: boolean;
  IsXFAPresent: boolean;
  Title: string;
  Author: string;
  Subject: string;
  Keywords: string;
  Creator: string;
  Producer: string;
  CreationDate: string;
  ModDate: string;
  Trapped: {
    name: string;
  };
};

type ExtractedData = {
  text: string;
  numPages: number;
  info: PDFInfo;
};

type PreviewChunkMetadata = {
  filename: string;
  chunkIndex: number;
  uploadedAt: string;
};

type PreviewChunk = {
  content: string;
  metadata: PreviewChunkMetadata;
};

type ResponseType = {
  message: string;
  file: FileInfo;
  fileBody: Record<string, unknown>; // empty object in your example
  extracted: ExtractedData;
  numChunks: number;
  previewChunk: PreviewChunk;
  embeddings: number[][];
};


function isResponseType(obj: any): obj is ResponseType {
  return (
    obj &&
    typeof obj.message === "string" &&
    obj.file &&
    typeof obj.numChunks === "number" &&
    Array.isArray(obj.embeddings) &&
    obj.previewChunk?.metadata?.filename
  );
}

describe("PDF Upload & Embedding E2E", () => {
  it("should extract and embed a sample PDF", async () => {
    const form = new FormData();
    const samplePath = "./src/tests/test.pdf"; 
    const fileStream = fs.createReadStream(samplePath);

    form.append("uploadedPDF", fileStream);

    const res = await fetch("http://127.0.0.1:4000/uploadPDF", {
      method: "POST",
      body: form as any,
      headers: form.getHeaders()
    });

    const raw = await res.json();
    if (!isResponseType(raw)) throw new Error("Invalid response type");
    const data: ResponseType = raw
    

    // BASIC ASSERTIONS
    expect(res.status).toBe(200);
    expect(data.numChunks).toBeGreaterThan(0);
    expect(data.embeddings.length).toBe(data.numChunks);
    expect(typeof data.embeddings[0][0]).toBe("number");
    expect(data.previewChunk.content.length).toBeGreaterThan(10);
    expect(data.previewChunk.metadata.filename).toMatch(/\.pdf$/i);


    console.log(`file name: ${data.file.filename}`)

    const uploadedPath = `./uploads/${data.file.filename}`;
    
    await new Promise(resolve => setTimeout(resolve, 3000));

      
    let result = 0;
    if (fs.existsSync(uploadedPath)) {
      await fs.promises.rm(uploadedPath, { force: true });
      result = 1;
    }
    expect(result).toBe(1);



  });
});
