import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { TbArrowsDiff } from 'react-icons/tb';
import { FiX } from 'react-icons/fi';
import { useCompare } from '../../context/CompareContext';

export const CompareFloatBar: React.FC = () => {
  const { compareCount, clearCompare } = useCompare();
  const { t } = useTranslation();

  if (compareCount === 0) return null;

  return (
    <div className="compare-float" role="region" aria-label="Compare floating bar">
      <span>
        {t('compare.selectedCount', { count: compareCount, defaultValue: `${compareCount} sản phẩm đã chọn` })}
      </span>
      <Link to="/compare">
        <Button type="primary" size="small" icon={<TbArrowsDiff style={{ fontSize: 14 }} />}>
          {t('compare.compareNow', 'So sánh ngay')}
        </Button>
      </Link>
      <Button
        type="text"
        size="small"
        icon={<FiX style={{ fontSize: 16 }} />}
        onClick={clearCompare}
        aria-label="Clear compare list"
        style={{ color: 'var(--text-2)' }}
      />
    </div>
  );
};
