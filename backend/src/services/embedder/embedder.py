from sentence_transformers import SentenceTransformer

# 1. Load a pretrained Sentence Transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

def embedChunks(chunks) :
    embeddings = model.encode(chunks)
    print("embeddings... type of embedding = " + type(embeddings))
    return embeddings
