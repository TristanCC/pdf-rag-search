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

export async function insertRows(file: any) {
  try {
    //file = file.map((row:any) => `(${row.})`)

    const response = await client.query(`INSERT INTO embeddings (chunktext, embedding, metadata) VALUES ${embeddings}`)
    const responseData = response.rows
    console.log("debug: ", responseData)
    console.log("row inserted")
  }
  catch (err) {
    console.error("Failed to insert row", err)
  }
}

export default client;
