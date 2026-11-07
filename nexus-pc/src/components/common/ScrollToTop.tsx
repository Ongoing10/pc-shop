import React, { useState, useEffect } from 'react';
import { ArrowUpOutlined } from '@ant-design/icons';

export const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      type="button"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 999,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgb(25 25 28 / 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 8px 30px var(--accent-soft)',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.boxShadow = '0 12px 35px var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.boxShadow = '0 8px 30px var(--accent-soft)';
      }}
    >
      <ArrowUpOutlined style={{ fontSize: 18 }} />
    </button>
  );
};
