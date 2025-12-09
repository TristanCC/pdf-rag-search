# main.py - Python microservice server

from fastapi import FastAPI
from pydantic import BaseModel
from embedder import embedChunks, embedQuery
from typing import Optional
from fastapi.responses import JSONResponse

class Chunk(BaseModel):
    content: str
    metadata: dict
    embedding: Optional[list] = None  # Add default None

class ChunkRequest(BaseModel):
    chunks: list[Chunk]

class QueryRequest(BaseModel):
    queryText: str

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World!"}

@app.post("/embed")
async def embed(req: ChunkRequest):
    print("Received request:", req)
    
    chunks = req.chunks
    print(f"Number of chunks to embed: {len(chunks)}")
    
    try:
        chunksWithEmbeddings = embedChunks(chunks)
        print(f"Successfully embedded {len(chunksWithEmbeddings)} chunks")
        return {"chunks": chunksWithEmbeddings}
    
    except Exception as e:
        print("Error in embedding:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)
    
@app.post("/embed-query")
async def embed(req: QueryRequest):
    print("Received request:", req)
    queryText = req.queryText
    try:
        embeddedQuery = embedQuery(queryText)

        # Convert ndarray to list so FastAPI can JSON-encode it
        return {"embeddedQuery": embeddedQuery.tolist()}
    
    except Exception as e: 
        print("Error in embedding:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)
