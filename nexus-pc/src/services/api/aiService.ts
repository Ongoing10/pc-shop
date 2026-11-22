import { API_BASE_URL } from '../../config/env';
import type * as Api from '../../types/api';
import { ChatReply, ChatStreamHandlers } from '../../types/chat';
import { ApiError, describeError } from './ApiError';
import { BaseService } from './BaseService';
import { keycloakClient } from './keycloakClient';

/** Model chạy local trả lời chậm hơn các API thường (mặc định axios chờ 15 giây); chạy bằng CPU có thể vài phút */
const CHAT_TIMEOUT_MS = 300_000;

/** Đọc lỗi dạng envelope (lỗi trước khi stream bắt đầu: sessionId sai, phiên của người khác, 409 đang trả lời) */
const toApiError = async (res: Response): Promise<ApiError> => {
  try {
    const body = (await res.json()) as Partial<Api.ResponseData<unknown>>;
    return new ApiError(res.status, describeError(body.error_message || `Lỗi máy chủ (${res.status}).`, body.data),
      body.error_code ?? null, body.data ?? null);
  } catch {
    return new ApiError(res.status, `Lỗi máy chủ (${res.status}).`);
  }
};

/** Tách luồng SSE thành từng sự kiện `data:` (mỗi sự kiện kết thúc bằng một dòng trống) */
async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<Api.ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const data = buffer
        .slice(0, end)
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, ''))
        .join('\n');
      buffer = buffer.slice(end + 2);
      if (data) yield JSON.parse(data) as Api.ChatStreamEvent;
    }
  }
}

/** ai-service: chatbot tư vấn (RAG + tool giá/tồn kho/tương thích). Mở cho cả khách vãng lai. */
class AiService extends BaseService {
  constructor() {
    super('/ai');
  }

  /** Không gửi sessionId thì backend tạo phiên mới và trả về sessionId để dùng cho các lượt sau */
  chat(message: string, sessionId?: string) {
    return this.post<ChatReply>('/chat', { sessionId, message } satisfies Api.ChatRequest, { timeout: CHAT_TIMEOUT_MS });
  }

  /**
   * Như `chat` nhưng nhận tiến trình qua SSE (`POST /ai/chat/stream`): báo việc trợ lý đang làm (tra giá, kiểm tra
   * tương thích...) rồi tới câu trả lời. Dùng fetch vì EventSource không gửi được POST và header Authorization.
   */
  async chatStream(message: string, sessionId: string | undefined, handlers: ChatStreamHandlers = {}): Promise<ChatReply> {
    const token = await keycloakClient.getAccessToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, message } satisfies Api.ChatRequest),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      throw new ApiError(0, controller.signal.aborted ? 'Máy chủ phản hồi quá lâu.' : 'Không kết nối được máy chủ.');
    }

    try {
      if (!res.ok || !res.body || !res.headers.get('content-type')?.includes('text/event-stream')) {
        throw await toApiError(res);
      }
      let session = sessionId;
      let answer = '';
      for await (const event of readSse(res.body)) {
        switch (event.type) {
          case 'session':
            session = event.sessionId;
            break;
          case 'status':
            handlers.onStatus?.(event.text);
            break;
          case 'token':
            answer += event.text;
            handlers.onText?.(answer);
            break;
          case 'done':
            return { sessionId: event.sessionId, answer, requestId: event.requestId };
          case 'error':
            throw new ApiError(502, event.text);
        }
      }
      // Mất kết nối trước sự kiện done
      throw new ApiError(0, 'Mất kết nối khi đang nhận câu trả lời.', null, { sessionId: session });
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(0, controller.signal.aborted ? 'Máy chủ phản hồi quá lâu.' : 'Mất kết nối khi đang nhận câu trả lời.');
    } finally {
      clearTimeout(timer);
    }
  }

  feedback(sessionId: string, requestId: number, value: 1 | -1) {
    return this.post<null>('/chat/feedback', { sessionId, requestId, value } satisfies Api.ChatFeedbackRequest);
  }

  /** Các cuộc trò chuyện gần đây của user đang đăng nhập */
  listSessions(limit = 20) {
    return this.get<Api.ChatSessionSummary[]>('/chat/sessions', { limit });
  }

  getSession(sessionId: string) {
    return this.get<Api.ChatSessionDetail>(`/chat/sessions/${encodeURIComponent(sessionId)}`);
  }

  deleteSession(sessionId: string) {
    return this.remove<null>(`/chat/sessions/${encodeURIComponent(sessionId)}`);
  }
}

export const aiService = new AiService();
