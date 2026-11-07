import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input, Button, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiPackage, FiMapPin, FiCpu, FiHeart } from 'react-icons/fi';
import { AccountShell } from '../../components/account/AccountShell';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useUserOrders } from '../../hooks/useOrders';
import { useAddresses } from '../../hooks/useAddresses';
import { useMyBuilds } from '../../hooks/usePcBuilds';
import { PHONE_PATTERN } from '../../services/api/addressService';

export const AccountPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const { favoritesCount } = useFavorites();
  const { data: orders = [] } = useUserOrders();
  const { data: addresses = [] } = useAddresses(isAuthenticated);
  const { data: builds = [] } = useMyBuilds(isAuthenticated);

  const [profile, setProfile] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate || '',
    gender: 'unknown',
  });

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate || '',
      }));
    }
  }, [user]);

  const phoneInvalid = profile.phone.trim() !== '' && !PHONE_PATTERN.test(profile.phone.replace(/[\s.]/g, ''));

  const handleSaveProfile = () => {
    if (phoneInvalid) {
      message.warning(t('account.phoneInvalid', 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'));
      return;
    }
    updateProfile({
      fullName: profile.name,
      email: profile.email,
      phone: profile.phone,
      birthDate: profile.birthDate,
    });
    message.success(t('account.profileSaved', 'Đã lưu thông tin tài khoản.'));
  };

  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;

  const stats = [
    { to: '/account/orders', icon: <FiPackage />, value: activeOrders, label: t('account.statActiveOrders', 'Đơn đang xử lý') },
    { to: '/account/addresses', icon: <FiMapPin />, value: addresses.length, label: t('account.statAddresses', 'Địa chỉ đã lưu') },
    { to: '/account/builds', icon: <FiCpu />, value: builds.length, label: t('account.statBuilds', 'Cấu hình PC') },
    { to: '/favorites', icon: <FiHeart />, value: favoritesCount, label: t('account.statFavorites', 'Sản phẩm yêu thích') },
  ];

  return (
    <AccountShell
      title={t('account.title', 'Tài khoản của tôi')}
      subtitle={t('account.subtitle', 'Quản lý thông tin cá nhân và theo dõi lịch sử mua hàng.')}
    >
      <div className="account-stats">
        {stats.map((s) => (
          <Link key={s.to} to={s.to}>
            {s.icon}
            <b>{s.value}</b>
            <small>{s.label}</small>
          </Link>
        ))}
      </div>

      <h3>{t('account.profileTitle', 'Thông tin cá nhân')}</h3>
      <div className="formgrid">
        <label>
          {t('account.fullName', 'Họ và tên')}
          <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        </label>
        <label>
          {t('account.email', 'Email')}
          <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
        </label>
        <label>
          {t('account.phone', 'Số điện thoại')}
          <Input
            value={profile.phone}
            status={phoneInvalid ? 'error' : undefined}
            placeholder="0xxxxxxxxx"
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          {phoneInvalid && (
            <small className="field-error">{t('account.phoneInvalid', 'Số điện thoại gồm 10 số, bắt đầu bằng 0.')}</small>
          )}
        </label>
        <label>
          {t('account.gender', 'Giới tính')}
          <Select
            value={profile.gender}
            onChange={(gender) => setProfile({ ...profile, gender })}
            options={[
              { value: 'unknown', label: t('account.genderUnknown', 'Không muốn nêu') },
              { value: 'male', label: t('account.genderMale', 'Nam') },
              { value: 'female', label: t('account.genderFemale', 'Nữ') },
            ]}
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
        <div className="wide" style={{ marginTop: 10 }}>
          <Button type="primary" onClick={handleSaveProfile}>
            {t('account.saveChanges', 'Lưu thay đổi')}
          </Button>
        </div>
      </div>
    </AccountShell>
  );
};
