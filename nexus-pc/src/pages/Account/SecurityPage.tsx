import React from 'react';
import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { AccountShell } from '../../components/account/AccountShell';
import { useAuth } from '../../context/AuthContext';

export const SecurityPage: React.FC = () => {
  const { t } = useTranslation();
  const { changePassword } = useAuth();

  return (
    <AccountShell
      title={t('account.tabSecurity', 'Bảo mật tài khoản')}
      subtitle={t('account.securitySubtitle', 'Đổi mật khẩu định kỳ để bảo vệ tài khoản và lịch sử đơn hàng.')}
    >
      <Alert
        className="notice"
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        title={t(
          'account.securityKeycloak',
          'Mật khẩu được quản lý bởi hệ thống đăng nhập tập trung. Bấm nút bên dưới để sang trang quản lý tài khoản và đổi mật khẩu.'
        )}
        style={{ marginBottom: 20 }}
      />
      <Button type="primary" onClick={() => changePassword()}>
        {t('account.updatePassword', 'Đổi mật khẩu')}
      </Button>
    </AccountShell>
  );
};
