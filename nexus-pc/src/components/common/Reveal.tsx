import React, { useLayoutEffect, useRef, ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Nội dung luôn hiển thị mặc định. Chỉ phần tử nằm dưới màn hình đầu lúc mount mới
 * được ẩn tạm và trượt lên khi cuộn tới, để ảnh chụp/in/crawler không thấy khoảng trống.
 */
export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.classList.add('pending');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('pending');
          el.classList.add('shown');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ ['--delay' as string]: `${delay}ms` }}>
      {children}
    </div>
  );
};
