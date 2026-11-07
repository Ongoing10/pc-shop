import React from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';
import { useTranslation } from 'react-i18next';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  return (
    <Link to="/" className={`logo ${className}`} aria-label="NEXUS PC – Trang chủ">
      <LogoMark size={36} />
      <span>
        <b>
          NEXUS<span>PC</span>
        </b>
        <small>{t('common.appTagline', 'Linh kiện PC & PC Builder')}</small>
      </span>
    </Link>
  );
};
