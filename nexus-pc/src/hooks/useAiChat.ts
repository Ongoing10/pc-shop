import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError } from '../services/api/ApiError';
import { aiService } from '../services/api/aiService';
import { ChatMessage } from '../types/chat';

const STORAGE_KEY = 'nexus_ai_chat';
/** Chỉ giữ lại phần cuối hội thoại trong trình duyệt */
const MAX_STORED = 40;

interface Stored {
  sessionId?: string;
  messages: ChatMessage[];
}

const load = (): Stored => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    // bộ nhớ trình duyệt bị chặn hoặc dữ liệu hỏng: bắt đầu hội thoại mới
  }
  return { messages: [] };
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * Hội thoại với trợ lý tư vấn. Lưu sessionId + tin nhắn ở localStorage để mở lại không mất nội dung;
 * backend giữ bộ nhớ hội thoại theo sessionId (Mongo, 30 ngày). Câu trả lời đi qua SSE: trong lúc chờ,
 * `status` là việc trợ lý đang làm (tra kho tri thức, tra giá, kiểm tra tương thích...).
 */
export function useAiChat() {
  const [stored] = useState(load);
  const [messages, setMessages] = useState<ChatMessage[]>(stored.messages);
  const [sessionId, setSessionId] = useState<string | undefined>(stored.sessionId);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sessionId, messages: messages.slice(-MAX_STORED) } satisfies Stored)
      );
    } catch {
      // không lưu được: hội thoại vẫn chạy trong phiên hiện tại
    }
  }, [sessionId, messages]);

  const ask = useCallback(async (text: string, userId: string) => {
    setPending(true);
    setStatus(null);
    try {
      const reply = await aiService.chatStream(text, sessionRef.current, { onStatus: setStatus });
      setSessionId(reply.sessionId);
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userId ? { ...m, failed: false } : m)),
        { id: newId(), role: 'assistant', text: reply.answer, requestId: reply.requestId },
      ]);
    } catch (e) {
      // Phiên lưu ở trình duyệt thuộc tài khoản khác (đổi tài khoản trên cùng máy): gửi lại sẽ mở phiên mới
      if (isApiError(e) && e.status === 403) setSessionId(undefined);
      setMessages((prev) => prev.map((m) => (m.id === userId ? { ...m, failed: true } : m)));
    } finally {
      setPending(false);
      setStatus(null);
    }
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || pending) return;
      const id = newId();
      setMessages((prev) => [...prev, { id, role: 'user', text }]);
      void ask(text, id);
    },
    [ask, pending]
  );

  const retry = useCallback(
    (id: string) => {
      const target = messages.find((m) => m.id === id);
      if (target && !pending) void ask(target.text, id);
    },
    [ask, messages, pending]
  );

  /** Hữu ích / không hữu ích. Đổi ngay trên giao diện; gửi lỗi thì trả lại như cũ */
  const rate = useCallback((id: string, value: 1 | -1) => {
    const target = messages.find((m) => m.id === id);
    const session = sessionRef.current;
    if (!target?.requestId || !session || target.feedback === value) return;
    const previous = target.feedback;
    const setFeedback = (feedback: 1 | -1 | undefined) =>
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, feedback } : m)));
    setFeedback(value);
    aiService.feedback(session, target.requestId, value).catch(() => setFeedback(previous));
  }, [messages]);

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
  }, []);

  return { messages, pending, status, send, retry, rate, reset };
}
