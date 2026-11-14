import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useAuth } from '../../context/AuthContext';

/** Đổi mật khẩu: mật khẩu nằm ở Keycloak nên chuyển sang trang quản lý tài khoản của Keycloak */
export const ChangePasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, changePassword } = useAuth();

  if (!isLoading && !isAuthenticated) return <Navigate to="/login?redirect=/change-password" replace />;

  return (
    <main className="container page">
      <Breadcrumb
        items={[
          { label: t('nav.account', 'Tài khoản'), link: '/account' },
          { label: t('auth.changePasswordTitle', 'Đổi mật khẩu') },
        ]}
      />

      <div className="pagehead">
        <div>
          <small>
            <SafetyCertificateOutlined style={{ marginRight: 6 }} />
            ACCOUNT SECURITY
          </small>
          <h1>{t('auth.changePasswordTitle', 'Đổi mật khẩu tài khoản')}</h1>
          <p>{t('auth.changePasswordSubtitle', 'Thay đổi mật khẩu định kỳ giúp bảo vệ tài khoản và lịch sử đơn hàng của bạn.')}</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '20px auto 60px', display: 'grid', gap: 16 }}>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
          {t('auth.changeKeycloak', 'Mật khẩu được quản lý bởi hệ thống đăng nhập tập trung. Bạn sẽ chuyển sang trang quản lý tài khoản để đổi mật khẩu.')}
        </p>
        <Button type="primary" size="large" onClick={() => changePassword()}>
          {t('account.updatePassword', 'Đổi mật khẩu')}
        </Button>
        <Link to="/account" style={{ color: 'var(--muted)', fontSize: 13 }}>
          {t('common.back', 'Quay lại tài khoản')}
        </Link>
      </div>
    </main>
  );
};
