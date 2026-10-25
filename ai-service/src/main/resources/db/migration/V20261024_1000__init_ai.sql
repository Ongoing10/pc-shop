-- ai-service V1: kho tri thức RAG + pgvector.
-- Extension nằm trong schema "extensions" (giống Supabase) nên kiểu và operator class được ghi đầy đủ tên schema.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE knowledge_documents (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    source_type     INTEGER      NOT NULL,     -- 1-PRODUCT, 2-GUIDE, 3-POLICY, 4-FAQ
    source_ref      VARCHAR(50),               -- sku (PRODUCT) hoặc media.files.id
    content_hash    VARCHAR(64),               -- không đổi thì bỏ qua re-embed
    status          INTEGER      NOT NULL,     -- 1-PENDING, 2-INDEXING, 3-INDEXED, 4-FAILED, 5-ARCHIVED
    chunk_count     INTEGER      NOT NULL DEFAULT 0,
    embedding_model VARCHAR(100),
    error_message   TEXT,
    indexed_at      TIMESTAMP,
    created_by      UUID,
    created_at      TIMESTAMP,
    updated_by      UUID,
    updated_at      TIMESTAMP
);
CREATE INDEX idx_knowledge_documents_source ON knowledge_documents (source_type, source_ref);
CREATE INDEX idx_knowledge_documents_status ON knowledge_documents (status);

-- LUÔN XÓA THẬT khi re-index hoặc gỡ tài liệu: chunk còn nằm lại thì chatbot vẫn truy xuất được.
CREATE TABLE document_chunks (
    id          BIGSERIAL PRIMARY KEY,
    document_id BIGINT  NOT NULL REFERENCES knowledge_documents (id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content     TEXT    NOT NULL,
    token_count INTEGER,
    metadata    JSONB,                         -- {"category":"GPU","brand":"MSI","sku":"..."}
    embedding   extensions.vector(1024),       -- bge-m3 = 1024 chiều; đổi model khác số chiều phải migrate
    content_tsv TSVECTOR,                      -- full-text cho hybrid search
    created_at  TIMESTAMP,
    CONSTRAINT uk_document_chunks_doc_index UNIQUE (document_id, chunk_index)
);
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX idx_chunks_tsv       ON document_chunks USING gin (content_tsv);
CREATE INDEX idx_chunks_metadata  ON document_chunks USING gin (metadata jsonb_path_ops);

CREATE TABLE ai_request_logs (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          VARCHAR(64),
    user_id             UUID,
    request_type        INTEGER NOT NULL,      -- 1-CHAT, 2-PC_BUILD, 3-COMPAT_EXPLAIN, 4-SEMANTIC_SEARCH, 5-REVIEW_SUMMARY
    model               VARCHAR(100),
    prompt_tokens       INTEGER,
    completion_tokens   INTEGER,
    latency_ms          INTEGER,
    retrieved_chunk_ids BIGINT[],
    tool_calls          JSONB,
    status              INTEGER NOT NULL,      -- 1-SUCCESS, 2-ERROR, 3-FALLBACK
    error_message       TEXT,
    feedback            SMALLINT,              -- 1 hữu ích, -1 không hữu ích
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_request_logs_type_created ON ai_request_logs (request_type, created_at);

CREATE TABLE eval_cases (
    id                 BIGSERIAL PRIMARY KEY,
    question           TEXT NOT NULL,
    expected_answer    TEXT,
    expected_skus      VARCHAR(50)[],
    expected_chunk_ids BIGINT[],
    category           VARCHAR(50),            -- TU_VAN, TUONG_THICH, BUILD_PC, CHINH_SACH
    is_active          INTEGER NOT NULL DEFAULT 1,
    created_by         UUID,
    created_at         TIMESTAMP,
    updated_by         UUID,
    updated_at         TIMESTAMP
);

CREATE TABLE eval_results (
    id            BIGSERIAL PRIMARY KEY,
    case_id       BIGINT      NOT NULL REFERENCES eval_cases (id),
    run_code      VARCHAR(50) NOT NULL,        -- RUN_NO_RAG, RUN_RAG, RUN_RAG_TOOL
    answer        TEXT,
    recall_at_k   NUMERIC(5, 4),
    is_correct    BOOLEAN,
    is_compatible BOOLEAN,
    latency_ms    INTEGER,
    created_at    TIMESTAMP,
    CONSTRAINT uk_eval_results_run_case UNIQUE (run_code, case_id)
);
