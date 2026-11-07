import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { IoLanguageOutline } from 'react-icons/io5';
import { FiCheck } from 'react-icons/fi';
import { useAppTheme } from '../../context/ThemeContext';

const LANGS = [
  { key: 'vi', label: 'Tiếng Việt' },
  { key: 'en', label: 'English' },
] as const;

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { setLanguage } = useAppTheme();
  const currentLang = i18n.language === 'en' ? 'en' : 'vi';

  const items: MenuProps['items'] = LANGS.map((lang) => ({
    key: lang.key,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minWidth: 120 }}>
        {lang.label}
        {currentLang === lang.key && <FiCheck style={{ color: 'var(--accent)' }} />}
      </span>
    ),
    onClick: () => setLanguage(lang.key),
  }));

  return (
    <Dropdown menu={{ items, selectedKeys: [currentLang] }} placement="bottomRight" trigger={['click']}>
      <button
        type="button"
        aria-label="Đổi ngôn ngữ / Change language"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 28,
          padding: '0 8px',
          color: 'var(--text-2)',
          background: 'none',
          border: '1px solid var(--line-strong)',
          borderRadius: 6,
          fontSize: 13,
        }}
      >
        <IoLanguageOutline style={{ fontSize: 15 }} />
        <span>{currentLang.toUpperCase()}</span>
      </button>
    </Dropdown>
  );
};
