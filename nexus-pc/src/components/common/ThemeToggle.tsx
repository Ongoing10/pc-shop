import React from 'react';
import { Button, Tooltip } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../context/ThemeContext';

/** Nút đổi chế độ sáng / tối, dùng chung cho header trang khách và admin */
export const ThemeToggle: React.FC<{ size?: 'small' | 'middle' }> = ({ size = 'small' }) => {
  const { mode, toggleMode } = useAppTheme();
  const { t } = useTranslation();
  const label =
    mode === 'dark'
      ? t('common.switchToLight', 'Chuyển sang giao diện sáng')
      : t('common.switchToDark', 'Chuyển sang giao diện tối');
  return (
    <Tooltip title={label}>
      <Button
        size={size}
        type="text"
        icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        aria-label={label}
        onClick={toggleMode}
        style={{ color: 'var(--text-2)' }}
      />
    </Tooltip>
  );
};
