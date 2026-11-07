import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Input, Button, Checkbox, message, Progress, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { FiCheck, FiX } from 'react-icons/fi';
import { Logo } from '../../components/common/Logo';
import { AuthAside } from '../../components/common/AuthAside';
import { useAuth } from '../../context/AuthContext';
import { evaluatePasswordStrength, checkPasswordRequirements } from '../../services/api/authService';

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, register, isAuthenticated } = useAuth();

  const initialMode = searchParams.get('tab') === 'register' ? 'register' : 'login';
  // Chỉ nhận đường dẫn nội bộ để tránh chuyển hướng ra ngoài
  const redirectParam = searchParams.get('redirect');
  const redirectTo = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/account';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  // Sync mode with query params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'register' && mode !== 'register') {
      setMode('register');
    } else if (tabParam === 'login' && mode !== 'login') {
      setMode('login');
    }
  }, [searchParams]);

  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    const next = new URLSearchParams(searchParams);
    if (newMode === 'register') next.set('tab', 'register');
    else next.delete('tab');
    setSearchParams(next);
  };

  const regStrength = evaluatePasswordStrength(regPassword);
  const regReqs = checkPasswordRequirements(regPassword);
  const regMatch = regPassword && regConfirmPassword && regPassword === regConfirmPassword;

  // Fill quick demo credentials
  const fillDemoAccount = () => {
    setLoginIdentifier('khachhang@nexuspc.vn');
    setLoginPassword('123456');
    message.info('Đã điền tài khoản mẫu NEXUS PC');
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      message.warning('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
        remember: rememberMe,
      });
      message.success('Đăng nhập thành công! Chào mừng bạn trở lại.');
      navigate(redirectTo);
    } catch (err: any) {
      message.error(err?.message || 'Đăng nhập không thành công, vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regFullName.trim()) {
      message.warning('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!regEmail.trim()) {
      message.warning('Vui lòng nhập email.');
      return;
    }
    if (!regPhone.trim()) {
      message.warning('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      message.warning('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      message.warning('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!agreeTerms) {
      message.warning('Vui lòng đồng ý với điều khoản dịch vụ.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });
      message.success('Đăng ký tài khoản thành công!');
      navigate(redirectTo);
    } catch (err: any) {
      message.error(err?.message || 'Đăng ký không thành công.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth">
      <section>
        <Logo />
        <Segmented
          block
          className="auth-mode"
          value={mode}
          onChange={(v) => handleSwitchMode(v as 'login' | 'register')}
          options={[
            { value: 'login', label: t('nav.login', 'ĐĂNG NHẬP') },
            { value: 'register', label: t('auth.btnRegister', 'ĐĂNG KÝ') },
          ]}
        />

        <h1>
          {mode === 'login'
            ? t('auth.loginTitle', 'Chào mừng trở lại.')
            : t('auth.registerTitle', 'Tạo tài khoản mới.')}
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 16px', lineHeight: 1.6 }}>
          {mode === 'login'
            ? t(
                'auth.loginSubtitle',
                'Đăng nhập để theo dõi đơn hàng và lưu sổ địa chỉ giao hàng.'
              )
            : t(
                'auth.registerSubtitle',
                'Tham gia cộng đồng NEXUS PC để nhận ưu đãi phần cứng độc quyền.'
              )}
        </p>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
              <span>{t('auth.emailPhonePlaceholder', 'Email hoặc số điện thoại')}</span>
              <Input
                prefix={<UserOutlined style={{ color: 'var(--muted)' }} />}
                placeholder="Ví dụ: khachhang@nexuspc.vn hoặc 0988888888"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                size="large"
                autoFocus
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('auth.passwordPlaceholder', 'Mật khẩu')}</span>
                <Link
                  to="/forgot-password"
                  style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500 }}
                >
                  {t('auth.forgotPasswordLink', 'Quên mật khẩu?')}
                </Link>
              </div>
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--muted)' }} />}
                placeholder="Nhập mật khẩu của bạn"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                size="large"
              />
            </label>

            {/* Quick Demo Autofill Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--panel)',
                border: '1px dashed var(--line-strong)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--muted)',
              }}
            >
              <span>Demo: <b>khachhang@nexuspc.vn</b> / <b>123456</b></span>
              <Button type="link" size="small" onClick={fillDemoAccount} style={{ padding: 0, fontWeight: 600 }}>
                Điền mẫu
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ color: 'var(--text-2)', fontSize: 13 }}
              >
                {t('auth.rememberMe', 'Ghi nhớ đăng nhập')}
              </Checkbox>
            </div>

            <Button
              type="primary"
              block
              size="large"
              htmlType="submit"
              loading={isLoading}
              style={{ height: 42, fontSize: 13, fontWeight: 700 }}
            >
              {t('auth.btnLogin', 'Đăng nhập ngay')}
            </Button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 13, color: 'var(--text-2)' }}>
              <span>{t('auth.namePlaceholder', 'Họ và tên của bạn')} *</span>
              <Input
                prefix={<UserOutlined style={{ color: 'var(--muted)' }} />}
                placeholder="Ví dụ: Nguyễn Văn Hưng"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                size="large"
                autoFocus
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 5, fontSize: 13, color: 'var(--text-2)' }}>
                <span>Email *</span>
                <Input
                  prefix={<MailOutlined style={{ color: 'var(--muted)' }} />}
                  placeholder="name@email.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  size="large"
                />
              </label>

              <label style={{ display: 'grid', gap: 5, fontSize: 13, color: 'var(--text-2)' }}>
                <span>Số điện thoại *</span>
                <Input
                  prefix={<PhoneOutlined style={{ color: 'var(--muted)' }} />}
                  placeholder="09xx xxx xxx"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  size="large"
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: 5, fontSize: 13, color: 'var(--text-2)' }}>
              <span>{t('auth.passwordPlaceholder', 'Mật khẩu')} *</span>
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--muted)' }} />}
                placeholder="Tối thiểu 6 ký tự"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                size="large"
              />
            </label>

            {/* Live Password Strength Meter */}
            {regPassword && (
              <div
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 6,
                  padding: '8px 10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>{t('auth.passwordStrength', 'Độ mạnh')}:</span>
                  <span style={{ color: regStrength.color, fontWeight: 700 }}>{regStrength.label}</span>
                </div>
                <Progress percent={regStrength.score} showInfo={false} strokeColor={regStrength.color} size="small" />
                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 13 }}>
                  <span style={{ color: regReqs.minLength ? 'var(--ok)' : 'var(--muted)' }}>
                    {regReqs.minLength ? '✓' : '○'} ≥ 6 ký tự
                  </span>
                  <span style={{ color: regReqs.hasNumber ? 'var(--ok)' : 'var(--muted)' }}>
                    {regReqs.hasNumber ? '✓' : '○'} Có số
                  </span>
                </div>
              </div>
            )}

            <label style={{ display: 'grid', gap: 5, fontSize: 13, color: 'var(--text-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('auth.confirmPasswordPlaceholder', 'Xác nhận mật khẩu')} *</span>
                {regConfirmPassword && (
                  <span style={{ fontSize: 13, color: regMatch ? 'var(--ok)' : 'var(--danger)' }}>
                    {regMatch ? '✓ Khớp' : '✗ Chưa khớp'}
                  </span>
                )}
              </div>
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--muted)' }} />}
                placeholder="Nhập lại mật khẩu vừa tạo"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                size="large"
              />
            </label>

            <Checkbox
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}
            >
              Tôi đồng ý với Điều khoản dịch vụ và Chính sách của NEXUS PC.
            </Checkbox>

            <Button
              type="primary"
              block
              size="large"
              htmlType="submit"
              loading={isLoading}
              style={{ height: 42, fontSize: 13, fontWeight: 700, marginTop: 4 }}
            >
              {t('auth.btnRegister', 'Đăng ký tài khoản mới')}
            </Button>
          </form>
        )}

        <p style={{ marginTop: 14 }}>
          {mode === 'login'
            ? t('auth.noAccount', 'Chưa có tài khoản?')
            : t('auth.hasAccount', 'Đã có tài khoản?')}{' '}
          <Button
            type="link"
            size="small"
            onClick={() => handleSwitchMode(mode === 'login' ? 'register' : 'login')}
            style={{ padding: 0, fontWeight: 700 }}
          >
            {mode === 'login'
              ? t('auth.btnRegister', 'Đăng ký ngay')
              : t('auth.btnLogin', 'Đăng nhập ngay')}
          </Button>
        </p>
      </section>

      <AuthAside
        title={
          <>
            Đơn hàng, địa chỉ,
            <br />
            <em>ở cùng một chỗ.</em>
          </>
        }
        points={[
          'Theo dõi trạng thái từng đơn hàng',
          'Lưu sổ địa chỉ, đặt hàng nhanh hơn',
          'Hotline hỗ trợ 1900 6868 · 8:00–21:30',
        ]}
      />
    </main>
  );
};
