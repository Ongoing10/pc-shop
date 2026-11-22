/** Một lượt trong hội thoại với trợ lý tư vấn (ai-service) */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Lượt hỏi của khách gặp lỗi: hiện nút gửi lại */
  failed?: boolean;
  /** Lượt trả lời: id nhật ký ở backend để gửi phản hồi (không có thì ẩn nút phản hồi) */
  requestId?: number | null;
  /** Phản hồi khách đã gửi cho câu trả lời này */
  feedback?: 1 | -1;
}

export interface ChatReply {
  sessionId: string;
  answer: string;
  requestId: number | null;
}

/** Các mốc trong lúc trợ lý trả lời (stream) */
export interface ChatStreamHandlers {
  /** việc trợ lý đang làm, vd "Đang tra giá ..." */
  onStatus?: (text: string) => void;
  /** câu trả lời tới đâu (đã nối các đoạn) */
  onText?: (text: string) => void;
}
