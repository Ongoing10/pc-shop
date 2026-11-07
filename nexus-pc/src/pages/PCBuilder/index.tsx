import React, { useState } from 'react';
import { Button, Drawer, Divider, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { DeleteOutlined } from '@ant-design/icons';
import { BsExclamationTriangle } from 'react-icons/bs';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { BuilderSlotId, Product, RigBuild } from '../../types/product';
import { formatCurrency, calculateRigTotal } from '../../utils/format';
import { BuilderSkeleton, PicklistSkeleton } from '../../components/common/CustomSkeleton';

interface SlotConfig {
  id: BuilderSlotId;
  labelKey: string;
  defaultLabel: string;
  shortLabel: string;
}

const BUILDER_SLOTS: SlotConfig[] = [
  { id: 'cpu', labelKey: 'cpu', defaultLabel: 'Bộ vi xử lý (CPU)', shortLabel: 'CPU' },
  { id: 'mainboard', labelKey: 'mainboard', defaultLabel: 'Bo mạch chủ (Mainboard)', shortLabel: 'Mainboard' },
  { id: 'ram', labelKey: 'ram', defaultLabel: 'Bộ nhớ RAM', shortLabel: 'RAM' },
  { id: 'gpu', labelKey: 'gpu', defaultLabel: 'Card đồ họa (VGA)', shortLabel: 'VGA' },
  { id: 'ssd', labelKey: 'ssd', defaultLabel: 'Ổ cứng SSD', shortLabel: 'SSD' },
  { id: 'psu', labelKey: 'psu', defaultLabel: 'Nguồn máy tính (PSU)', shortLabel: 'Nguồn' },
  { id: 'case', labelKey: 'case', defaultLabel: 'Vỏ case máy tính', shortLabel: 'Vỏ case' },
  { id: 'cooler', labelKey: 'cooler', defaultLabel: 'Tản nhiệt CPU', shortLabel: 'Tản nhiệt' },
];

export const PCBuilderPage: React.FC = () => {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [rig, setRig] = useState<RigBuild>({});
  const [activeSlot, setActiveSlot] = useState<BuilderSlotId | null>(null);

  const { data: allProducts = [], isLoading } = useProducts();

  const total = calculateRigTotal(rig);
  const selectedCount = Object.keys(rig).length;
  const progressPercent = (selectedCount / BUILDER_SLOTS.length) * 100;

  const currentSlotConfig = BUILDER_SLOTS.find((s) => s.id === activeSlot);
  const availablePartsForSlot = activeSlot
    ? allProducts.filter((p) => p.category === activeSlot)
    : [];

  const handleSelectProduct = (product: Product) => {
    if (activeSlot) {
      setRig((prev) => ({ ...prev, [activeSlot]: product }));
      setActiveSlot(null);
      message.success(`Đã thêm ${product.name} vào cấu hình`);
    }
  };

  const handleRemoveSlot = (slotId: BuilderSlotId) => {
    setRig((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleAddAllToCart = () => {
    const productsToAdd = Object.values(rig).filter((p): p is Product => Boolean(p));
    if (productsToAdd.length === 0) return;

    productsToAdd.forEach((p) => {
      addToCart(p, 1);
    });
    message.success(`Đã thêm ${productsToAdd.length} linh kiện vào giỏ hàng`);
  };

  return (
    <main className="container page">
      <Breadcrumb items={[t('nav.builder', 'PC Builder')]} />

      <div className="pagehead">
        <div>
          <h1>{t('builder.title', 'PC Builder')}</h1>
          <p>{t('builder.subtitle', 'Tự tay lựa chọn linh kiện và xây dựng cấu hình theo ngân sách.')}</p>
        </div>
      </div>

      {isLoading ? (
        <BuilderSkeleton />
      ) : (
        <div className="builder">
          {/* Slot List */}
          <div className="slotlist">
            {BUILDER_SLOTS.map((slot) => {
              const product = rig[slot.id];
              return (
                <div className={`slot ${product ? 'filled' : ''}`} key={slot.id}>
                  <CategoryIcon id={slot.id} />
                  <span>
                    <strong>{slot.defaultLabel}</strong>
                    <small>
                      {product ? product.name : t('builder.notSelected', 'Chưa chọn linh kiện')}
                    </small>
                  </span>
                  {product && <em>{formatCurrency(product.price)}</em>}
                  <Button
                    onClick={() => setActiveSlot(slot.id)}
                    type={product ? 'default' : 'primary'}
                  >
                    {product ? t('builder.changeComponent', 'Thay đổi') : t('builder.selectComponent', 'Chọn linh kiện')}
                  </Button>
                  {product && (
                    <button
                      onClick={() => handleRemoveSlot(slot.id)}
                      aria-label={`Bỏ ${slot.shortLabel} khỏi cấu hình`}
                      type="button"
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rig Summary Sidebar */}
          <aside className="summary">
            <h3>{t('builder.summaryTitle', 'Cấu hình của bạn')}</h3>
            <h2>
              {selectedCount}
              <small> / {BUILDER_SLOTS.length} linh kiện</small>
            </h2>

            <div
              className="progress"
              role="progressbar"
              aria-label="Số vị trí đã chọn"
              aria-valuenow={selectedCount}
              aria-valuemin={0}
              aria-valuemax={BUILDER_SLOTS.length}
            >
              <i style={{ transform: `scaleX(${progressPercent / 100})` }} />
            </div>

            <div className="summary-lines">
              {Object.entries(rig).map(([slotKey, p]) => {
                if (!p) return null;
                const slotCfg = BUILDER_SLOTS.find((s) => s.id === slotKey);
                return (
                  <p key={slotKey}>
                    <span>{slotCfg?.shortLabel}</span>
                    <b>{formatCurrency(p.price)}</b>
                  </p>
                );
              })}
            </div>

            <Divider />

            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('builder.estimatedTotal', 'Tổng tạm tính')}</span>
              <h3 className="orange" style={{ margin: '4px 0 0' }}>{formatCurrency(total)}</h3>
            </div>

            <Button
              type="primary"
              block
              size="large"
              disabled={selectedCount === 0}
              onClick={handleAddAllToCart}
            >
              {t('builder.addRigToCart', 'Thêm cấu hình vào giỏ')}
            </Button>

            <p className="compat-note" role="note">
              <BsExclamationTriangle aria-hidden="true" />
              <span>
                {t(
                  'builder.compatibilityNote',
                  'Hệ thống chưa tự kiểm tra tương thích. Hãy đối chiếu socket CPU với mainboard, loại RAM và công suất nguồn.'
                )}
              </span>
            </p>
          </aside>
        </div>
      )}

      {/* Drawer to Pick Part for Slot */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeSlot && <CategoryIcon id={activeSlot} />}
            <span>{currentSlotConfig ? `Chọn ${currentSlotConfig.defaultLabel}` : 'Chọn linh kiện'}</span>
          </div>
        }
        open={Boolean(activeSlot)}
        onClose={() => setActiveSlot(null)}
        styles={{ wrapper: { width: 480, maxWidth: '100vw' } }}
      >
        <div className="picklist">
          {isLoading ? (
            <PicklistSkeleton count={4} />
          ) : (
            availablePartsForSlot.map((p) => (
              <div key={p.id}>
                <img src={p.image} alt="" />
                <span>
                  <b>{p.name}</b>
                  <div className="pick-specs">{p.specs.slice(0, 2).join(' · ')}</div>
                  <strong>{formatCurrency(p.price)}</strong>
                </span>
                <Button
                  type={rig[activeSlot!]?.id === p.id ? 'default' : 'primary'}
                  onClick={() => handleSelectProduct(p)}
                  aria-label={`${t('common.pick', 'Chọn')} ${p.name}`}
                >
                  {rig[activeSlot!]?.id === p.id ? t('builder.picked', 'Đang chọn') : t('common.pick', 'Chọn')}
                </Button>
              </div>
            ))
          )}
          {!isLoading && availablePartsForSlot.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
              Không có sản phẩm nào cho danh mục này.
            </div>
          )}
        </div>
      </Drawer>
    </main>
  );
};
