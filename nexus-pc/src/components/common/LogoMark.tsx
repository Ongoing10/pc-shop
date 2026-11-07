import React from 'react';

/** Biểu tượng NEXUS PC (public/logo.svg). Chữ "NEXUS PC" bên cạnh để dạng text, không nằm trong SVG. */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => (
  <img
    src="/logo.svg"
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    className={`logo-mark ${className}`.trim()}
    draggable={false}
  />
);
