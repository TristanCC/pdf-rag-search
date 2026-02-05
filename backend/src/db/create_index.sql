-- Create/Upgrade pgvector index for sub-second semantic search
-- This index is critical for performance with large datasets (10k+ chunks)

-- First, ensure the pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Check existing indexes
DO $$
DECLARE
    existing_index_name TEXT;
    existing_index_type TEXT;
BEGIN
    -- Check if an index on the embedding column already exists
    SELECT indexname, 
           CASE 
               WHEN indexdef LIKE '%hnsw%' THEN 'hnsw'
               WHEN indexdef LIKE '%ivfflat%' THEN 'ivfflat'
               ELSE 'other'
           END
    INTO existing_index_name, existing_index_type
    FROM pg_indexes
    WHERE tablename = 'embeddings' 
      AND indexdef LIKE '%embedding%vector%'
    LIMIT 1;

    IF existing_index_name IS NOT NULL THEN
        RAISE NOTICE 'Existing index found: % (type: %)', existing_index_name, existing_index_type;
        
        -- If it's IVFFlat, suggest upgrading to HNSW for better performance
        IF existing_index_type = 'ivfflat' THEN
            RAISE NOTICE 'Consider upgrading from IVFFlat to HNSW for better performance with large datasets.';
            RAISE NOTICE 'To upgrade, drop the existing index and create HNSW:';
            RAISE NOTICE '  DROP INDEX idx_embeddings_embedding;';
            RAISE NOTICE '  CREATE INDEX idx_embeddings_embedding ON embeddings USING hnsw (embedding vector_cosine_ops);';
        ELSIF existing_index_type = 'hnsw' THEN
            RAISE NOTICE 'HNSW index already exists - no action needed!';
        END IF;
    ELSE
        -- No index exists, create HNSW (recommended for best performance)
        RAISE NOTICE 'No index found. Creating HNSW index...';
        EXECUTE 'CREATE INDEX idx_embeddings_embedding ON embeddings USING hnsw (embedding vector_cosine_ops)';
        RAISE NOTICE 'HNSW index created successfully!';
    END IF;
END $$;

-- Alternative: IVFFlat index (use for smaller datasets or if HNSW is not available)
-- If you prefer IVFFlat, uncomment below and comment out the HNSW creation above
-- CREATE INDEX IF NOT EXISTS idx_embeddings_embedding 
-- ON embeddings 
-- USING ivfflat (embedding vector_cosine_ops) 
-- WITH (lists = 100);

-- Verify current indexes
SELECT 
    indexname,
    CASE 
        WHEN indexdef LIKE '%hnsw%' THEN 'HNSW (recommended)'
        WHEN indexdef LIKE '%ivfflat%' THEN 'IVFFlat'
        ELSE 'Other'
    END as index_type,
    indexdef
FROM pg_indexes
WHERE tablename = 'embeddings'
ORDER BY indexname;
