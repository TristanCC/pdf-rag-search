# main.py - Python microservice server

from fastapi import FastAPI
from pydantic import BaseModel
from embedder import embedChunks
from fastapi.responses import JSONResponse

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
    print("hello")
    texts = []
    for chunk in req.chunks:
        if isinstance(chunk.content, str):
            texts.append(chunk.content)
        else:
            print("Non-string chunk found:", type(chunk.content))
            texts.append(str(chunk.content))  # Or skip it, depending on desired behavior
    print("Texts to embed:", texts)
    
    try:
        embeddings = embedChunks(texts)
        return {"embeddings": embeddings.tolist()}
    except Exception as e:
        print("Error in embedding:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)