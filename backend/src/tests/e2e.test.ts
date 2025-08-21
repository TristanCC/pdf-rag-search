import { describe, it, expect } from "vitest";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

describe("PDF Upload & Embedding E2E", () => {
  it("should extract and embed a sample PDF", async () => {
    const form = new FormData();
    const filePath = "./src/tests/test.pdf"; // Put a sample here
    const fileStream = fs.createReadStream(filePath);

    form.append("uploadedPDF", fileStream);

    const res = await fetch("http://127.0.0.1:4000/uploadPDF", {
      method: "POST",
      body: form as any,
      headers: form.getHeaders()
    });

    const data = await res.json();
    

    // BASIC ASSERTIONS
    expect(res.status).toBe(200);
    console.log(data)
    expect(data.numChunks).toBeGreaterThan(0);
    expect(data.embeddings.length).toBe(data.numChunks);
    expect(typeof data.embeddings[0][0]).toBe("number");
    expect(data.previewChunk.content.length).toBeGreaterThan(10);
    expect(data.previewChunk.metadata.filename).toMatch(/\.pdf$/i);
  });
});
