import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input, Button, Empty, message, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { UserOutlined, LogoutOutlined, KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { FiUser, FiPackage, FiMapPin, FiLock, FiExternalLink } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useUserOrders } from '../../hooks/useOrders';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

type TabKey = 'profile' | 'orders' | 'addresses' | 'security';

export const AccountPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateProfile, changePassword } = useAuth();
  const [tab, setTab] = useState<TabKey>('profile');

  const [profile, setProfile] = useState({
    name: user?.fullName || 'Khách hàng NEXUS PC',
    email: user?.email || 'khachhang@nexuspc.vn',
    phone: user?.phone || '0988 888 888',
    birthDate: user?.birthDate || '1998-05-15',
  });

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate || '1998-05-15',
      });
    }
  }, [user]);

  const { data: userOrders = [] } = useUserOrders();

  const handleSaveProfile = () => {
    updateProfile({
      fullName: profile.name,
      email: profile.email,
      phone: profile.phone,
      birthDate: profile.birthDate,
    });
    message.success('Đã lưu thông tin tài khoản thành công!');
  };

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

    setIsUpdatingPassword(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      message.success(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      message.error(err?.message || 'Không thể đổi mật khẩu, vui lòng kiểm tra lại.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated && !user) {
    return (
      <main className="container page" style={{ textAlign: 'center', padding: '60px 0' }}>
        <Breadcrumb items={[t('account.title', 'Tài khoản')]} />
        <div style={{ maxWidth: 440, margin: '40px auto', background: 'var(--panel)', padding: 32, borderRadius: 12, border: '1px solid var(--line-strong)' }}>
          <UserOutlined style={{ fontSize: 44, color: 'var(--accent)', marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, margin: '0 0 10px' }}>Chưa đăng nhập tài khoản</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Vui lòng đăng nhập để xem thông tin tài khoản, đơn hàng và bảo mật.
          </p>
          <Button type="primary" block size="large" onClick={() => navigate('/login')}>
            Đăng nhập ngay
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container page">
      <Breadcrumb items={[t('account.title', 'Tài khoản')]} />

      <div className="pagehead">
        <div>
          <h1>{t('account.title', 'Tài khoản của tôi')}</h1>
          <p>{t('account.subtitle', 'Quản lý thông tin cá nhân và lịch sử mua sắm.')}</p>
        </div>
      </div>

      <div className="accountlayout">
        <aside className="accountmenu">
          <button
            onClick={() => setTab('profile')}
            className={tab === 'profile' ? 'active' : ''}
            type="button"
          >
            <FiUser /> {t('account.tabProfile', 'Thông tin tài khoản')}
          </button>
          <button
            onClick={() => setTab('orders')}
            className={tab === 'orders' ? 'active' : ''}
            type="button"
          >
            <FiPackage /> {t('account.tabOrders', 'Đơn hàng của tôi')}
          </button>
          <button
            onClick={() => setTab('addresses')}
            className={tab === 'addresses' ? 'active' : ''}
            type="button"
          >
            <FiMapPin /> {t('account.tabAddresses', 'Địa chỉ giao hàng')}
          </button>
          <button
            onClick={() => setTab('security')}
            className={tab === 'security' ? 'active' : ''}
            type="button"
          >
            <FiLock /> {t('account.tabSecurity', 'Bảo mật tài khoản')}
          </button>
          <button onClick={handleLogout} className="danger" type="button">
            <LogoutOutlined /> {t('account.logout', 'Đăng xuất')}
          </button>
        </aside>

        <section className="accountcontent">
          {tab === 'profile' && (
            <div className="formgrid">
              <label>
                {t('account.fullName', 'Họ và tên')}
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </label>
              <label>
                {t('account.email', 'Email')}
                <Input
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </label>
              <label>
                {t('account.phone', 'Số điện thoại')}
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </label>
              <label>
                {t('account.birthDate', 'Ngày sinh')}
                <Input
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                />
              </label>
              <div style={{ gridColumn: 'span 2', marginTop: 10 }}>
                <Button type="primary" onClick={handleSaveProfile}>
                  {t('account.saveChanges', 'Lưu thay đổi')}
                </Button>
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div>
              {userOrders.length > 0 ? (
                <div style={{ display: 'grid', gap: 14 }}>
                  {userOrders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        background: 'var(--panel)',
                        border: '1px solid var(--line-strong)',
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div>
                          <b style={{ color: 'var(--accent)' }}>Mã đơn: {ord.id}</b>
                          <small style={{ display: 'block', color: 'var(--muted)', marginTop: 2 }}>
                            {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                          </small>
                        </div>
                        <Tag color="cyan">{ord.status.toUpperCase()}</Tag>
                      </div>

                      <div style={{ borderTop: '1px solid var(--line-strong)', paddingTop: 8, marginTop: 8 }}>
                        {ord.items.map((it) => (
                          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '4px 0' }}>
                            <span>{it.name} × {it.qty}</span>
                            <span>{formatCurrency(it.price * it.qty)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--line-strong)' }}>
                        <span>Tổng thanh toán:</span>
                        <b style={{ color: 'var(--accent)' }}>{formatCurrency(ord.totalAmount)}</b>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description={t('account.noOrders', 'Bạn chưa có đơn hàng nào')} />
              )}
            </div>
          )}

          {tab === 'addresses' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>Địa chỉ mặc định</b>
                  <Tag color="cyan">Mặc định</Tag>
                </div>
                <p style={{ margin: '8px 0 4px', color: 'var(--text-2)' }}>{user?.fullName || 'Khách hàng NEXUS PC'} - {user?.phone || '0988 888 888'}</p>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>Tầng 5, Tòa nhà Công Nghệ NEXUS PC, Ba Đình, Hà Nội</p>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--panel)',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--line-strong)',
                  marginBottom: 20,
                }}
              >
                <div>
                  <b style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SafetyCertificateOutlined /> Thiết lập bảo mật tài khoản
                  </b>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Bạn có thể đổi mật khẩu tại đây hoặc dùng trang chuyên dụng
                  </span>
                </div>
                <Link
                  to="/change-password"
                  style={{
                    color: 'var(--accent)',
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Trang chuyên dụng <FiExternalLink />
                </Link>
              </div>

              <div className="formgrid">
                <label>
                  {t('account.currentPassword', 'Mật khẩu hiện tại')}
                  <Input.Password
                    prefix={<KeyOutlined style={{ color: 'var(--muted)' }} />}
                    placeholder="Nhập mật khẩu hiện tại"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </label>

                <label>
                  {t('account.newPassword', 'Mật khẩu mới')}
                  <Input.Password
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>

                <label style={{ gridColumn: 'span 2' }}>
                  Xác nhận mật khẩu mới
                  <Input.Password
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>

                <div style={{ gridColumn: 'span 2', marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Button
                    type="primary"
                    onClick={handleChangePassword}
                    loading={isUpdatingPassword}
                  >
                    {t('account.updatePassword', 'Cập nhật mật khẩu')}
                  </Button>
                  <Link to="/forgot-password" style={{ color: 'var(--muted)', fontSize: 13 }}>
                    Quên mật khẩu hiện tại?
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
