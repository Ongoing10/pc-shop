import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Input, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { AccountShell } from '../../components/account/AccountShell';
import { useAuth } from '../../context/AuthContext';

export const SecurityPage: React.FC = () => {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      message.warning('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      message.warning('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await changePassword({ currentPassword, newPassword, confirmPassword });
      message.success(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      message.error(err?.message || 'Không thể đổi mật khẩu, vui lòng kiểm tra lại.');
    } finally {
      setIsUpdating(false);
    }
  };

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
        title={t('account.securityHint', 'Mật khẩu nên có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.')}
        style={{ marginBottom: 20 }}
      />

      <div className="formgrid">
        <label className="wide">
          {t('account.currentPassword', 'Mật khẩu hiện tại')}
          <Input.Password
            prefix={<KeyOutlined style={{ color: 'var(--muted)' }} />}
            placeholder={t('auth.currentPasswordPlaceholder', 'Nhập mật khẩu hiện tại')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          {t('account.newPassword', 'Mật khẩu mới')}
          <Input.Password
            placeholder={t('account.passwordMin', 'Tối thiểu 6 ký tự')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label>
          {t('auth.confirmNewPassword', 'Xác nhận mật khẩu mới')}
          <Input.Password
            placeholder={t('auth.confirmNewPasswordPlaceholder', 'Xác nhận mật khẩu mới')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        <div className="wide" style={{ marginTop: 10, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button type="primary" onClick={handleChangePassword} loading={isUpdating}>
            {t('account.updatePassword', 'Cập nhật mật khẩu')}
          </Button>
          <Link to="/forgot-password" style={{ color: 'var(--muted)', fontSize: 13 }}>
            {t('auth.forgotPasswordLink', 'Quên mật khẩu?')}
          </Link>
        </div>
      </div>
    </AccountShell>
  );
};
