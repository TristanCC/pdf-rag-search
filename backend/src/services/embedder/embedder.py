# embedder.py

from sentence_transformers import SentenceTransformer

# Load a pretrained Sentence Transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

def embedChunks(chunks):
    """
    Generate embeddings for all chunks in batch (faster)
    """
    # Extract all text content
    texts = [chunk.content for chunk in chunks]
    
    # Generate all embeddings at once (much faster than one at a time)
    embeddings = model.encode(texts)
    
    # Combine chunks with their embeddings
    embedded_chunks = []
    for i, chunk in enumerate(chunks):
        embedded_chunk = {
            "content": chunk.content,
            "metadata": chunk.metadata,
            "embedding": embeddings[i].tolist()  # Convert numpy array to list
        }
        embedded_chunks.append(embedded_chunk)
    
    return embedded_chunks

def embedQuery(queryText):

    embeddedQuery = model.encode(queryText)
    print("query embedding: ", embeddedQuery)
    return embeddedQuery
