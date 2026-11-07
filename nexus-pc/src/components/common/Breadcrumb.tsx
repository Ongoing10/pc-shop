import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb as AntBreadcrumb } from 'antd';
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
    <AntBreadcrumb
      className="crumb"
      separator={
        <span className="crumb-sep">
          <FiChevronRight />
        </span>
      }
      items={[
        {
          title: (
            <Link to="/" className="crumb-home">
              <FiHome />
              <span>{t('common.home', 'Trang chủ')}</span>
            </Link>
          ),
        },
        ...items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = typeof item === 'string' ? item : item.label;
          const link = typeof item === 'string' ? undefined : item.link;
          return { title: link && !isLast ? <Link to={link}>{label}</Link> : label };
        }),
      ]}
    />
  );
};
