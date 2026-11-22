import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Hiển thị câu trả lời của trợ lý: đoạn văn, danh sách (- hoặc 1.), **đậm**, `mã`, [chữ](đường dẫn).
 * Tự dựng bằng React element (không dùng innerHTML) nên nội dung từ model không chèn được HTML.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

const inline = (text: string): React.ReactNode[] =>
  text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith('/')) return <Link key={i} to={href}>{label}</Link>;
      if (/^https?:\/\//.test(href)) {
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        );
      }
    }
    return part;
  });

const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

export const ChatText: React.FC<{ text: string }> = ({ text }) => {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  for (const line of text.split('\n')) {
    const bullet = BULLET.exec(line);
    const ordered = ORDERED.exec(line);
    const match = bullet ?? ordered;
    if (match) {
      flushPara();
      const isOrdered = !bullet;
      if (list && list.ordered !== isOrdered) flushList();
      list ??= { ordered: isOrdered, items: [] };
      list.items.push(match[1]);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return <div className="chat-text">{blocks}</div>;
};
