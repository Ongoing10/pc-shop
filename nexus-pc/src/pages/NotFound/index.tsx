import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty } from 'antd';
import { useTranslation } from 'react-i18next';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <main className="container page" style={{ textAlign: 'center', padding: '80px 0' }}>
      <Empty
        description={
          <div>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>404 - Trang không tồn tại</h2>
            <p style={{ color: 'var(--muted)' }}>Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.</p>
          </div>
        }
      >
        <Link to="/">
          <Button type="primary" size="large">
            {t('checkout.backToHome', 'Về trang chủ')}
          </Button>
        </Link>
      </Empty>
    </main>
  );
};
