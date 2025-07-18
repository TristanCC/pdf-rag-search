# main.py - Python microservice server

from fastapi import FastAPI
from pydantic import BaseModel
from embedder import embedChunks

class Chunk(BaseModel):
    content: str
    metadata: dict

class ChunkRequest(BaseModel):
    chunks: list[Chunk]

app = FastAPI()

@app.get("/")

async def root():
    print("HELLO WORLD!")


@app.post("/embed")

async def embed(req: ChunkRequest):
    texts = [chunk.content for chunk in req.chunks]
    print(texts)
    embeddings = embedChunks(texts)
    return {"embeddings": embeddings.tolist()}

