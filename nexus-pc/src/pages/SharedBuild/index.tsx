import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Empty, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiCopy, FiLink, FiShoppingCart, FiLock } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { CompatibilityPanel } from '../../components/builder/CompatibilityPanel';
import { BUILDER_SLOTS } from '../../components/builder/slots';
import { useAuth } from '../../context/AuthContext';
import { useBuilder } from '../../context/BuilderContext';
import { useCart } from '../../context/CartContext';
import { usePcBuild } from '../../hooks/usePcBuilds';
import { resolveBuildItems } from '../../services/api/pcBuildService';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/orderStatus';
import { buildShareUrl, copyToClipboard } from '../../utils/share';

export const SharedBuildPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { loadBuild } = useBuilder();
  const { addItemsToCart } = useCart();
  const { data: build, isLoading } = usePcBuild(code);

  const crumbs = [{ label: t('nav.builder', 'PC Builder'), link: '/builder' }, t('sharedBuild.crumb', 'Cấu hình chia sẻ')];

  if (isLoading) {
    return (
      <main className="container page" style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </main>
    );
  }

  // Backend chỉ trả cấu hình công khai hoặc của chính chủ; mock coi người đã đăng nhập là chủ
  const hidden = build && !build.isPublic && !isAuthenticated;

  if (!build || hidden) {
    return (
      <main className="container page">
        <Breadcrumb items={crumbs} />
        <div className="emptybox">
          <Empty
            image={hidden ? <FiLock style={{ fontSize: 36, color: 'var(--muted)' }} aria-hidden="true" /> : undefined}
            styles={hidden ? { image: { height: 'auto', marginBottom: 12 } } : undefined}
            description={
              hidden
                ? t('sharedBuild.private', 'Cấu hình này đang ở chế độ riêng tư.')
                : t('sharedBuild.notFound', { code, defaultValue: `Không tìm thấy cấu hình ${code}` })
            }
          >
            <Link to="/builder">
              <Button type="primary">{t('sharedBuild.buildYourOwn', 'Tự ráp cấu hình')}</Button>
            </Link>
          </Empty>
        </div>
      </main>
    );
  }

  const lines = resolveBuildItems(build.items);
  const psu = lines.find((l) => l.slot === 'psu')?.product;

  const handleCopyToBuilder = () => {
    loadBuild(build, true);
    navigate('/builder');
  };

  return (
    <main className="container page">
      <Breadcrumb items={crumbs} />

      <div className="pagehead">
        <div>
          <h1>{build.name}</h1>
          <p>
            {t('sharedBuild.by', 'Chia sẻ bởi')} {build.ownerName} · {t('builds.updatedAt', 'Cập nhật')}{' '}
            {formatDate(build.updatedAt)}
            {build.purpose ? ` · ${build.purpose}` : ''}
          </p>
        </div>
        <Button
          icon={<FiLink />}
          onClick={() => copyToClipboard(buildShareUrl(build.code), t('builder.linkCopied', 'Đã chép link chia sẻ.'))}
        >
          {t('builder.copyLink', 'Chép link')}
        </Button>
      </div>

      <div className="builder">
        <div className="slotlist">
          {BUILDER_SLOTS.map((slot) => {
            const line = lines.find((l) => l.slot === slot.id);
            return (
              <div className={`slot ${line ? 'filled' : ''}`} key={slot.id}>
                <CategoryIcon id={slot.id} />
                <span>
                  <strong>{slot.defaultLabel}</strong>
                  {line ? (
                    <small>
                      <Link to={`/product/${line.product.id}`}>{line.product.name}</Link>
                      {line.quantity > 1 && ` × ${line.quantity}`}
                    </small>
                  ) : (
                    <small>{t('sharedBuild.noPart', 'Không chọn')}</small>
                  )}
                </span>
                {line && <em>{formatCurrency(line.product.price * line.quantity)}</em>}
              </div>
            );
          })}
        </div>

        <aside className="summary">
          <h3>{t('sharedBuild.summary', 'Tổng quan cấu hình')}</h3>
          <div style={{ margin: '8px 0 16px' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('builder.estimatedTotal', 'Tổng tạm tính')}</span>
            <h3 className="orange" style={{ margin: '4px 0 0' }}>{formatCurrency(build.totalPrice)}</h3>
            <small className="muted" style={{ marginTop: 4 }}>
              {t('sharedBuild.priceNote', 'Giá theo thời điểm hiện tại, có thể khác lúc tạo cấu hình.')}
            </small>
          </div>

          <CompatibilityPanel result={build.compatibility} psuWattage={psu?.compat?.wattage} partCount={lines.length} />

          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              block
              icon={<FiShoppingCart />}
              onClick={() => addItemsToCart(lines.map((l) => ({ product: l.product, quantity: l.quantity })))}
            >
              {t('builder.addRigToCart', 'Thêm cấu hình vào giỏ')}
            </Button>
            <Button block icon={<FiCopy />} onClick={handleCopyToBuilder}>
              {t('sharedBuild.copyToBuilder', 'Sao chép vào Builder để chỉnh sửa')}
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
};
