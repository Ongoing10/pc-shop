import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, message, Alert, Progress } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  KeyOutlined,
  MailOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { FiShield, FiClock } from 'react-icons/fi';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../context/AuthContext';
import { evaluatePasswordStrength, checkPasswordRequirements } from '../../services/api/authService';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { forgotPassword, resetPassword } = useAuth();

  // Steps: 1: Request OTP, 2: Enter OTP & New Password, 3: Completed
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Timer countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const strength = evaluatePasswordStrength(newPassword);
  const reqs = checkPasswordRequirements(newPassword);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      message.warning('Vui lòng nhập email hoặc số điện thoại đã đăng ký.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(identifier.trim());
      setDemoCode(res.demoCode);
      setOtp(res.demoCode); // Pre-fill demo code for convenience
      setCountdown(60);
      setStep(2);
      message.success(res.message);
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      message.warning('Vui lòng nhập mã xác thực OTP.');
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

    setIsLoading(true);
    try {
      await resetPassword({
        identifier: identifier.trim(),
        resetCode: otp.trim(),
        newPassword,
      });
      setStep(3);
      message.success('Đặt lại mật khẩu thành công!');
    } catch (err: any) {
      message.error(err?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth">
      <section>
        <Logo />
        {step === 1 && (
          <>
            <h1 style={{ fontSize: 26, margin: '8px 0 4px' }}>
              {t('auth.forgotTitle', 'Khôi phục mật khẩu')}
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
              {t('auth.forgotSubtitle', 'Nhập email hoặc số điện thoại của bạn để nhận mã xác thực OTP khôi phục.')}
            </p>

            <form onSubmit={handleRequestCode} style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                <span>{t('auth.emailOrPhone', 'Email hoặc Số điện thoại')}</span>
                <Input
                  prefix={<MailOutlined style={{ color: 'var(--muted)' }} />}
                  placeholder={t('auth.emailOrPhonePlaceholder', 'VD: khachhang@nexuspc.vn')}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  size="large"
                />
              </label>

              <div
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                <span>Tài khoản mẫu: <b>khachhang@nexuspc.vn</b></span>
                <button
                  type="button"
                  onClick={() => setIdentifier('khachhang@nexuspc.vn')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Dùng mẫu
                </button>
              </div>

              <Button
                type="primary"
                block
                size="large"
                htmlType="submit"
                loading={isLoading}
              >
                {t('auth.sendOtp', 'Gửi mã xác nhận')}
              </Button>

              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Link
                  to="/login"
                  style={{
                    color: 'var(--text-2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <ArrowLeftOutlined /> {t('auth.backToLogin', 'Quay lại Đăng nhập')}
                </Link>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: 26, margin: '8px 0 4px' }}>
              {t('auth.enterOtpStep', 'Nhập mã & Mật khẩu mới')}
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
              Mã xác nhận gồm 6 chữ số đã được gửi đến <b>{identifier}</b>.
            </p>

            {demoCode && (
              <Alert
                message={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Mã OTP giả lập: <b style={{ color: 'var(--accent)', letterSpacing: 2 }}>{demoCode}</b></span>
                    <button
                      type="button"
                      onClick={() => setOtp(demoCode)}
                      style={{ background: 'none', border: 'none', color: 'var(--ok)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Áp dụng mã
                    </button>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16, background: 'var(--panel)', borderColor: 'var(--line-strong)' }}
              />
            )}

            <form onSubmit={handleResetPassword} style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Mã OTP (6 chữ số)</span>
                  {countdown > 0 ? (
                    <span style={{ color: 'var(--muted)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <FiClock /> {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestCode}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}
                    >
                      {t('auth.resendOtp', 'Gửi lại mã')}
                    </button>
                  )}
                </div>
                <Input
                  prefix={<KeyOutlined style={{ color: 'var(--muted)' }} />}
                  placeholder={t('auth.otpPlaceholder', 'Mã xác nhận 6 số (VD: 889922)')}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  size="large"
                  maxLength={10}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                <span>{t('auth.newPassword', 'Mật khẩu mới')}</span>
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--muted)' }} />}
                  placeholder={t('auth.newPasswordPlaceholder', 'Mật khẩu mới (tối thiểu 6 ký tự)')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  size="large"
                />
              </label>

              {newPassword && (
                <div style={{ background: 'var(--panel)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line-strong)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--muted)' }}>{t('auth.passwordStrength', 'Độ mạnh')}:</span>
                    <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                  </div>
                  <Progress
                    percent={strength.score}
                    showInfo={false}
                    strokeColor={strength.color}
                    size="small"
                  />
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13, color: reqs.minLength ? 'var(--ok)' : 'var(--muted)' }}>
                    <span>{reqs.minLength ? '✓' : '○'} Tối thiểu 6 ký tự</span>
                    <span style={{ color: reqs.hasNumber ? 'var(--ok)' : 'var(--muted)' }}>
                      {reqs.hasNumber ? '✓' : '○'} Chứa số
                    </span>
                  </div>
                </div>
              )}

              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                <span>{t('auth.confirmNewPassword', 'Xác nhận mật khẩu mới')}</span>
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--muted)' }} />}
                  placeholder={t('auth.confirmNewPasswordPlaceholder', 'Xác nhận mật khẩu mới')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  size="large"
                />
              </label>

              <Button
                type="primary"
                block
                size="large"
                htmlType="submit"
                loading={isLoading}
              >
                {t('auth.btnResetPassword', 'Cập nhật mật khẩu mới')}
              </Button>

              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowLeftOutlined /> Đổi thông tin liên hệ
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircleFilled style={{ fontSize: 56, color: 'var(--ok)', marginBottom: 16 }} />
            <h2 style={{ fontSize: 24, margin: '0 0 10px' }}>Đặt lại mật khẩu thành công!</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Mật khẩu mới của bạn đã được cập nhật an toàn vào hệ thống. Bạn có thể sử dụng thông tin mới để đăng nhập ngay.
            </p>
            <Button
              type="primary"
              size="large"
              block
              onClick={() => navigate('/login')}
            >
              Đăng nhập ngay
            </Button>
          </div>
        )}
      </section>

      <aside>
        <small style={{ letterSpacing: '0.12em', color: 'var(--accent)' }}>
          <FiShield style={{ marginRight: 6, display: 'inline' }} />
          SECURE CREDENTIAL SHIELD
        </small>
        <h2>
          Protect your
          <br />
          <em>gaming legacy.</em>
        </h2>
      </aside>
    </main>
  );
};
