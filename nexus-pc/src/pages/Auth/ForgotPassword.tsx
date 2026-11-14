import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Logo } from '../../components/common/Logo';
import { AuthAside } from '../../components/common/AuthAside';
import { useAuth } from '../../context/AuthContext';

/** Quên mật khẩu: backend không có API riêng, việc gửi thư đặt lại mật khẩu do Keycloak đảm nhiệm */
export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();

  return (
    <main className="auth">
      <section>
        <Logo />
        <Link to="/login" style={{ color: 'var(--muted)', fontSize: 13 }}>
          <ArrowLeftOutlined /> {t('auth.backToLogin', 'Quay lại đăng nhập')}
        </Link>
        <h1 style={{ marginTop: 16 }}>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          {t('auth.forgotTitle', 'Quên mật khẩu?')}
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
          {t(
            'auth.forgotKeycloak',
            'Bạn sẽ chuyển sang trang đăng nhập của hệ thống. Chọn "Quên mật khẩu?" ở đó, nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.'
          )}
        </p>
        <Button type="primary" size="large" block onClick={() => forgotPassword()}>
          {t('auth.continue', 'Tiếp tục')}
        </Button>
      </section>

      <AuthAside
        title={
          <>
            Lấy lại tài khoản
            <br />
            <em>trong vài phút.</em>
          </>
        }
        points={['Liên kết đặt lại mật khẩu gửi tới email đã đăng ký', 'Đơn hàng và sổ địa chỉ được giữ nguyên']}
      />
    </main>
  );
};
