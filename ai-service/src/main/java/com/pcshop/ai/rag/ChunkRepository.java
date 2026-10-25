package com.pcshop.ai.rag;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Truy cập bảng RAG bằng JDBC thuần (SQL tường minh để dễ giải thích khi bảo vệ).
 * Vector truyền dưới dạng chuỗi '[0.1,0.2,...]' rồi CAST sang extensions.vector.
 * Operator viết đầy đủ OPERATOR(extensions.<=>) để không phụ thuộc search_path (local lẫn Supabase).
 */
@ApplicationScoped
public class ChunkRepository {

    public static final int STATUS_INDEXED = 3;

    public record NewChunk(int index, String content, String metadataJson, float[] embedding) {
    }

    public record ScoredChunk(long chunkId, long documentId, String title, String content, String metadataJson,
                              double vectorScore, double textScore) {

        public double score() {
            return 0.7 * vectorScore + 0.3 * textScore;
        }
    }

    @Inject
    DataSource dataSource;

    /**
     * Ghi (hoặc ghi đè) một tài liệu cùng toàn bộ chunk trong MỘT transaction.
     * Tài liệu cùng (source_type, source_ref) đã có thì xóa thật chunk cũ trước (re-index).
     */
    @Transactional(rollbackOn = Exception.class)   // mặc định JTA KHÔNG rollback với checked exception như SQLException
    public long saveDocument(String title, int sourceType, String sourceRef, String contentHash, String model,
                             UUID createdBy, List<NewChunk> chunks) throws SQLException {
        try (Connection c = dataSource.getConnection()) {
            Long documentId = sourceRef == null ? null : findDocumentId(c, sourceType, sourceRef);
            if (documentId == null) {
                try (PreparedStatement ps = c.prepareStatement("""
                        INSERT INTO ai.knowledge_documents
                            (title, source_type, source_ref, content_hash, status, embedding_model, created_by, created_at)
                        VALUES (?, ?, ?, ?, 2, ?, ?, now())
                        RETURNING id""")) {
                    ps.setString(1, title);
                    ps.setInt(2, sourceType);
                    ps.setString(3, sourceRef);
                    ps.setString(4, contentHash);
                    ps.setString(5, model);
                    ps.setObject(6, createdBy, Types.OTHER);
                    try (ResultSet rs = ps.executeQuery()) {
                        rs.next();
                        documentId = rs.getLong(1);
                    }
                }
            } else {
                try (PreparedStatement ps = c.prepareStatement("DELETE FROM ai.document_chunks WHERE document_id = ?")) {
                    ps.setLong(1, documentId);
                    ps.executeUpdate();
                }
            }

            try (PreparedStatement ps = c.prepareStatement("""
                    INSERT INTO ai.document_chunks
                        (document_id, chunk_index, content, token_count, metadata, embedding, content_tsv, created_at)
                    VALUES (?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS extensions.vector), to_tsvector('simple', ?), now())""")) {
                for (NewChunk chunk : chunks) {
                    ps.setLong(1, documentId);
                    ps.setInt(2, chunk.index());
                    ps.setString(3, chunk.content());
                    ps.setInt(4, Math.max(1, chunk.content().length() / 4));   // ước lượng thô số token
                    ps.setString(5, chunk.metadataJson());
                    ps.setString(6, toVectorLiteral(chunk.embedding()));
                    ps.setString(7, chunk.content());
                    ps.addBatch();
                }
                ps.executeBatch();
            }

            try (PreparedStatement ps = c.prepareStatement("""
                    UPDATE ai.knowledge_documents
                    SET title = ?, content_hash = ?, status = 3, chunk_count = ?, embedding_model = ?,
                        indexed_at = now(), updated_at = now()
                    WHERE id = ?""")) {
                ps.setString(1, title);
                ps.setString(2, contentHash);
                ps.setInt(3, chunks.size());
                ps.setString(4, model);
                ps.setLong(5, documentId);
                ps.executeUpdate();
            }
            return documentId;
        }
    }

    /** Hash nội dung đã index của tài liệu; null nếu chưa có. Dùng để bỏ qua re-embed khi không đổi. */
    public String findContentHash(int sourceType, String sourceRef) throws SQLException {
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("""
                     SELECT content_hash FROM ai.knowledge_documents
                     WHERE source_type = ? AND source_ref = ? AND status = 3""")) {
            ps.setInt(1, sourceType);
            ps.setString(2, sourceRef);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString(1) : null;
            }
        }
    }

    /**
     * Hybrid retrieval 2 bước:
     * 1. Lấy 50 ứng viên gần nhất theo vector (dùng index HNSW);
     * 2. Xếp lại bằng 0.7 * điểm vector + 0.3 * điểm full-text, lấy top k.
     * category != null thì lọc theo metadata.
     */
    public List<ScoredChunk> search(float[] queryEmbedding, String queryText, String category, int k)
            throws SQLException {
        String vector = toVectorLiteral(queryEmbedding);
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("""
                     SELECT chunk_id, document_id, title, content, metadata, vector_score, text_score
                     FROM (
                         SELECT ch.id AS chunk_id, ch.document_id, d.title, ch.content, ch.metadata::text AS metadata,
                                1 - (ch.embedding OPERATOR(extensions.<=>) CAST(? AS extensions.vector)) AS vector_score,
                                ts_rank(ch.content_tsv, plainto_tsquery('simple', ?)) AS text_score
                         FROM ai.document_chunks ch
                         JOIN ai.knowledge_documents d ON d.id = ch.document_id
                         WHERE d.status = 3
                           AND (CAST(? AS text) IS NULL OR ch.metadata ->> 'category' = CAST(? AS text))
                         ORDER BY ch.embedding OPERATOR(extensions.<=>) CAST(? AS extensions.vector)
                         LIMIT 50
                     ) candidates
                     ORDER BY 0.7 * vector_score + 0.3 * text_score DESC
                     LIMIT ?""")) {
            ps.setString(1, vector);
            ps.setString(2, queryText);
            ps.setString(3, category);
            ps.setString(4, category);
            ps.setString(5, vector);
            ps.setInt(6, k);
            List<ScoredChunk> result = new ArrayList<>();
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    result.add(new ScoredChunk(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4),
                            rs.getString(5), rs.getDouble(6), rs.getDouble(7)));
                }
            }
            return result;
        }
    }

    private static Long findDocumentId(Connection c, int sourceType, String sourceRef) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT id FROM ai.knowledge_documents WHERE source_type = ? AND source_ref = ?")) {
            ps.setInt(1, sourceType);
            ps.setString(2, sourceRef);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getLong(1) : null;
            }
        }
    }

    static String toVectorLiteral(float[] v) {
        StringBuilder sb = new StringBuilder(v.length * 10).append('[');
        for (int i = 0; i < v.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(v[i]);
        }
        return sb.append(']').toString();
    }
}
