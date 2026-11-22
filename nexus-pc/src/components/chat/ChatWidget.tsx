import React, { useEffect, useRef, useState } from 'react';
import { Button, FloatButton, Input, Tooltip } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import {
  BsArrowUp,
  BsChatDots,
  BsCheck2,
  BsCopy,
  BsHandThumbsDown,
  BsHandThumbsDownFill,
  BsHandThumbsUp,
  BsHandThumbsUpFill,
  BsPlusLg,
  BsXLg,
} from 'react-icons/bs';
import { useAiChat } from '../../hooks/useAiChat';
import { LogoMark } from '../common/LogoMark';
import { ChatText } from './ChatText';
import './chat.css';

/** Gợi ý là những phân vân thật khi chọn linh kiện; bấm là gửi luôn câu hỏi */
/** Model chạy local có thể mất vài chục giây: sau ngần này thì báo cho khách biết là vẫn đang xử lý */
const SLOW_AFTER_MS = 8000;
const MOBILE_QUERY = '(max-width: 768px)';
/** Khớp thời gian của animation đóng trong chat.css */
const CLOSE_MS = 180;

const STARTERS = [
  { label: 'Build PC gaming 20 triệu', question: 'Build PC gaming khoảng 20 triệu nên chọn gì?' },
  { label: 'Mainboard cho Ryzen 7 7800X3D', question: 'Ryzen 7 7800X3D đi với mainboard nào?' },
  { label: 'Nguồn 650W cho RTX 4070', question: 'Nguồn 650W có đủ cho RTX 4070 không?' },
  { label: 'SSD NVMe hay SATA', question: 'SSD NVMe và SATA khác nhau thế nào?' },
];

export const ChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState('');
  const { messages, pending, status, send, retry, rate, reset } = useAiChat();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<TextAreaRef>(null);
  const [slow, setSlow] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const openChat = () => {
    setMounted(true);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    const wait = reducedMotion() ? 0 : CLOSE_MS;
    setTimeout(() => {
      setMounted(false);
      // trả focus về nút mở để người dùng bàn phím không bị mất vị trí
      setTimeout(() => document.querySelector<HTMLElement>('.chat-fab')?.focus(), 0);
    }, wait);
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      // trình duyệt chặn clipboard: giữ nguyên nút, người dùng vẫn chọn chữ để chép tay được
    }
  };

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTo({ top: log.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [messages.length, pending, status, open]);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  // Toàn màn hình trên điện thoại: khóa cuộn trang phía sau
  useEffect(() => {
    if (!open || !window.matchMedia(MOBILE_QUERY).matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = () => {
    if (!draft.trim() || pending) return;
    send(draft);
    setDraft('');
  };

  return (
    <>
      {!mounted && (
        <FloatButton
          className="chat-fab"
          type="primary"
          icon={<BsChatDots aria-hidden="true" />}
          tooltip="Hỏi AI"
          aria-label="Mở khung tư vấn AI"
          onClick={openChat}
        />
      )}

      {mounted && (
        <section className={`chat${open ? '' : ' is-closing'}`} role="dialog" aria-label="Tư vấn linh kiện">
          <header className="chat-head">
            <LogoMark size={36} />
            <div className="chat-head-title">
              <b>Tư vấn linh kiện</b>
              <small>Tra giá, tồn kho và độ tương thích</small>
            </div>
            <Tooltip title="Cuộc trò chuyện mới">
              <Button
                type="text"
                icon={<BsPlusLg />}
                onClick={reset}
                disabled={messages.length === 0 || pending}
                aria-label="Bắt đầu cuộc trò chuyện mới"
              />
            </Tooltip>
            <Button type="text" icon={<BsXLg />} onClick={close} aria-label="Đóng khung tư vấn" />
          </header>

          <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="Nội dung trò chuyện">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <LogoMark size={48} />
                <h2>Cần chọn linh kiện gì?</h2>
                <p>Hỏi về cấu hình, độ tương thích hoặc so sánh linh kiện.</p>
                <ul>
                  {STARTERS.map((s) => (
                    <li key={s.question}>
                      <button type="button" onClick={() => send(s.question)}>
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m) =>
                m.role === 'user' ? (
                  <div className="chat-row chat-row-user" key={m.id}>
                    <p className="chat-bubble">{m.text}</p>
                    {m.failed && (
                      <span className="chat-failed" role="alert">
                        Chưa gửi được.
                        <button type="button" onClick={() => retry(m.id)} disabled={pending}>
                          Gửi lại
                        </button>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="chat-row chat-row-bot" key={m.id}>
                    <LogoMark size={28} />
                    <div className="chat-bubble">
                      <ChatText text={m.text} />
                      <div className="chat-actions">
                        {m.requestId != null && (
                          <>
                            <button
                              type="button"
                              className="chat-copy"
                              aria-pressed={m.feedback === 1}
                              aria-label="Câu trả lời hữu ích"
                              title="Hữu ích"
                              onClick={() => rate(m.id, 1)}
                            >
                              {m.feedback === 1 ? <BsHandThumbsUpFill aria-hidden="true" /> : <BsHandThumbsUp aria-hidden="true" />}
                            </button>
                            <button
                              type="button"
                              className="chat-copy"
                              aria-pressed={m.feedback === -1}
                              aria-label="Câu trả lời chưa hữu ích"
                              title="Chưa hữu ích"
                              onClick={() => rate(m.id, -1)}
                            >
                              {m.feedback === -1 ? <BsHandThumbsDownFill aria-hidden="true" /> : <BsHandThumbsDown aria-hidden="true" />}
                            </button>
                          </>
                        )}
                        <button type="button" className="chat-copy" onClick={() => copy(m.id, m.text)}>
                          {copiedId === m.id ? <BsCheck2 aria-hidden="true" /> : <BsCopy aria-hidden="true" />}
                          {copiedId === m.id ? 'Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )
            )}

            {pending && (
              <div className="chat-row chat-row-bot" aria-label="Trợ lý đang soạn câu trả lời">
                <LogoMark size={28} />
                <div className="chat-bubble chat-typing">
                  <span />
                  <span />
                  <span />
                  {status ? <em>{status}…</em> : slow && <em>Đang soạn câu trả lời, có thể mất vài giây.</em>}
                </div>
              </div>
            )}
          </div>

          <footer className="chat-foot">
            <div className="chat-compose">
              <Input.TextArea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                autoSize={{ minRows: 1, maxRows: 5 }}
                maxLength={1000}
                placeholder="Nhập câu hỏi về linh kiện..."
                aria-label="Câu hỏi của bạn"
                variant="borderless"
              />
              <Button
                type="primary"
                icon={<BsArrowUp />}
                onClick={submit}
                disabled={!draft.trim() || pending}
                aria-label="Gửi câu hỏi"
              />
            </div>
            <small>Trợ lý có thể nhầm. Xem lại thông số trên trang sản phẩm trước khi đặt hàng.</small>
          </footer>
        </section>
      )}
    </>
  );
};
