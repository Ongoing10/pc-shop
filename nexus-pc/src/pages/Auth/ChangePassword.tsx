import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input, Button, message, Alert, Progress } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  LockOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { FiShield, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useAuth } from '../../context/AuthContext';
import { evaluatePasswordStrength, checkPasswordRequirements } from '../../services/api/authService';

export const ChangePasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = evaluatePasswordStrength(newPassword);
  const reqs = checkPasswordRequirements(newPassword);
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      message.warning('Vui lòng đăng nhập để đổi mật khẩu.');
      navigate('/login');
      return;
    }

    if (!currentPassword.trim()) {
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

    if (currentPassword === newPassword) {
      message.warning('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      message.success(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      message.error(err?.message || 'Không thể đổi mật khẩu, vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

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

      <div style={{ maxWidth: 640, margin: '20px auto 60px' }}>
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line-strong)',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}
        >
          {/* User badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 20,
              marginBottom: 24,
              borderBottom: '1px solid var(--line-strong)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--panel-2)',
                  border: '1px solid var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--accent)',
                  fontSize: 20,
                }}
              >
                <UserOutlined />
              </div>
              <div>
                <b style={{ display: 'block', fontSize: 14, color: 'var(--text)' }}>
                  {user?.fullName || 'Khách hàng NEXUS PC'}
                </b>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {user?.email || 'khachhang@nexuspc.vn'}
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: 13,
                padding: '4px 10px',
                borderRadius: 4,
                background: 'rgb(62 207 142 / 0.15)',
                color: 'var(--ok)',
                border: '1px solid rgb(62 207 142 / 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <FiShield /> Bảo vệ 2 lớp
            </span>
          </div>

          {success && (
            <Alert
              message="Đổi mật khẩu thành công!"
              description="Mật khẩu của bạn đã được cập nhật thành công. Hãy ghi nhớ thông tin mật khẩu mới cho các lần đăng nhập tiếp theo."
              type="success"
              showIcon
              style={{ marginBottom: 24, background: 'rgb(62 207 142 / 0.1)', borderColor: 'rgb(62 207 142 / 0.35)' }}
              action={
                <Button size="small" type="primary" onClick={() => setSuccess(false)}>
                  Đóng
                </Button>
              }
            />
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('auth.currentPassword', 'Mật khẩu hiện tại')} *</span>
                <Link to="/forgot-password" style={{ color: 'var(--accent)', fontSize: 13 }}>
                  Quên mật khẩu?
                </Link>
              </div>
              <Input.Password
                prefix={<KeyOutlined style={{ color: 'var(--muted)' }} />}
                placeholder={t('auth.currentPasswordPlaceholder', 'Nhập mật khẩu hiện tại (ví dụ: 123456)')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                size="large"
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
              <span>{t('auth.newPassword', 'Mật khẩu mới')} *</span>
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--muted)' }} />}
                placeholder={t('auth.newPasswordPlaceholder', 'Mật khẩu mới (tối thiểu 6 ký tự)')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                size="large"
              />
            </label>

            {/* Password strength & requirements widget */}
            {newPassword && (
              <div
                style={{
                  background: 'var(--panel)',
                  padding: '12px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--line-strong)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>{t('auth.passwordStrength', 'Độ mạnh mật khẩu')}:</span>
                  <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                </div>
                <Progress percent={strength.score} showInfo={false} strokeColor={strength.color} size="small" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10, fontSize: 13 }}>
                  <span style={{ color: reqs.minLength ? 'var(--ok)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {reqs.minLength ? <FiCheck /> : <FiX />} Tối thiểu 6 ký tự
                  </span>
                  <span style={{ color: reqs.hasNumber ? 'var(--ok)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {reqs.hasNumber ? <FiCheck /> : <FiX />} Chứa chữ số (0-9)
                  </span>
                  <span style={{ color: reqs.hasUpper && reqs.hasLower ? 'var(--ok)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {reqs.hasUpper && reqs.hasLower ? <FiCheck /> : <FiX />} Chữ hoa & thường
                  </span>
                  <span style={{ color: reqs.hasSpecial ? 'var(--ok)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {reqs.hasSpecial ? <FiCheck /> : <FiX />} Ký tự đặc biệt (!@#$)
                  </span>
                </div>
              </div>
            )}

            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('auth.confirmNewPassword', 'Xác nhận mật khẩu mới')} *</span>
                {confirmPassword && (
                  <span style={{ fontSize: 13, color: isMatch ? 'var(--ok)' : 'var(--danger)' }}>
                    {isMatch ? '✓ Khớp mật khẩu' : '✗ Chưa trùng khớp'}
                  </span>
                )}
              </div>
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--muted)' }} />}
                placeholder={t('auth.confirmNewPasswordPlaceholder', 'Xác nhận lại mật khẩu mới')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                size="large"
              />
            </label>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={isLoading}
                style={{ flex: 1 }}
              >
                {t('auth.btnUpdatePassword', 'Lưu thay đổi mật khẩu')}
              </Button>
              <Button
                size="large"
                onClick={() => navigate('/account')}
                style={{ background: 'var(--panel-2)', borderColor: 'var(--line-strong)', color: 'var(--text-2)' }}
              >
                Hủy bỏ
              </Button>
            </div>
          </form>

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--line-strong)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              color: 'var(--muted)',
            }}
          >
            <Link to="/account" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}>
              <FiArrowLeft /> Về trang tài khoản
            </Link>
            <span>Mẹo: Đặt mật khẩu dài để tăng tính bảo mật</span>
          </div>
        </div>
      </div>
    </main>
  );
};
