import type * as Api from '../../../types/api';
import { BaseService } from '../BaseService';

/** Embedding chạy bằng Ollama local: đồng bộ cả catalog hoặc tài liệu dài có thể mất vài chục giây */
const INDEX_TIMEOUT_MS = 180_000;

/** ai-service phía quản trị: kho tri thức RAG (/admin/knowledge, perm knowledge:write) */
class AdminKnowledgeService extends BaseService {
  constructor() {
    super('/admin/knowledge');
  }

  listDocuments(query: Api.KnowledgeDocumentQuery = {}) {
    return this.getAllPages<Api.KnowledgeDocument>('', { ...query });
  }
  getDocument(id: number) {
    return this.get<Api.KnowledgeDocumentDetail>(`/${id}`);
  }
  addDocument(body: Api.KnowledgeRequest) {
    return this.post<Api.IngestResult>('', body, { timeout: INDEX_TIMEOUT_MS });
  }
  /** Xóa thật chunk, tài liệu chuyển "Đã gỡ" */
  removeDocument(id: number) {
    return this.remove<null>(`/${id}`);
  }
  syncProducts() {
    return this.post<Api.SyncResult>('/sync-products', undefined, { timeout: INDEX_TIMEOUT_MS });
  }
  search(q: string, category?: string, k = 5) {
    return this.get<Api.ScoredChunk[]>('/search', { q, category, k }, { timeout: 60_000 });
  }
}

export const adminKnowledgeService = new AdminKnowledgeService();
