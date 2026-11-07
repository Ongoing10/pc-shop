import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiHeadphones, FiMail, FiMapPin, FiShield } from 'react-icons/fi';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="container footgrid">
        <div>
          <Logo />
          <p>
            {t(
              'footer.aboutText',
              'Linh kiện PC chính hãng, tư vấn cấu hình theo nhu cầu và ngân sách, giao hàng toàn quốc.'
            )}
          </p>
        </div>
        <div>
          <b>{t('footer.shopTitle', 'Mua sắm')}</b>
          <Link to="/products">{t('nav.allComponents', 'Tất cả linh kiện')}</Link>
          <Link to="/builder">{t('nav.builder', 'PC Builder')}</Link>
          <Link to="/compare">{t('nav.compare', 'So sánh')}</Link>
          <Link to="/products?sort=discount">{t('nav.deals', 'Khuyến mãi')}</Link>
        </div>
        <div>
          <b>{t('footer.supportTitle', 'Hỗ trợ khách hàng')}</b>
          <Link to="/track-order">{t('footer.supportLink1', 'Tra cứu đơn hàng')}</Link>
          <Link to="/account">{t('nav.account', 'Tài khoản')}</Link>
          <Link to="/forgot-password">{t('auth.forgotTitle', 'Khôi phục mật khẩu')}</Link>
        </div>
        <div>
          <b>{t('footer.contactTitle', 'Liên hệ')}</b>
          <a href="tel:19006868">
            <FiHeadphones aria-hidden="true" />
            {t('footer.phone', '1900 6868 (8:00 - 21:30)')}
          </a>
          <a href={`mailto:${t('footer.email', 'support@nexuspc.vn')}`}>
            <FiMail aria-hidden="true" />
            {t('footer.email', 'support@nexuspc.vn')}
          </a>
          <p>
            <FiMapPin aria-hidden="true" />
            {t('footer.address', 'Hà Nội, Việt Nam')}
          </p>
        </div>
      </div>
      <div className="container footbottom">
        <span>{t('footer.copyright', '© 2026 NEXUS PC')}</span>
        <span>
          <FiShield aria-hidden="true" style={{ color: 'var(--ok)' }} />
          {t('footer.securityBadge', 'Thanh toán an toàn · Bảo hành chính hãng')}
        </span>
      </div>
    </footer>
  );
};
