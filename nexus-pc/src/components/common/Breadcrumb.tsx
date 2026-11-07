import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiChevronRight, FiHome } from 'react-icons/fi';

interface BreadcrumbItem {
  label: string;
  link?: string;
}

interface BreadcrumbProps {
  items: (string | BreadcrumbItem)[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const { t } = useTranslation();

  return (
    <nav className="crumb" aria-label="Breadcrumb">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <FiHome style={{ fontSize: 13 }} />
        <span>{t('common.home', 'Trang chủ')}</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const label = typeof item === 'string' ? item : item.label;
        const link = typeof item === 'string' ? undefined : item.link;

        return (
          <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FiChevronRight style={{ opacity: 0.6, fontSize: 13 }} />
            {link && !isLast ? <Link to={link}>{label}</Link> : <span>{label}</span>}
          </span>
        );
      })}
    </nav>
  );
};
