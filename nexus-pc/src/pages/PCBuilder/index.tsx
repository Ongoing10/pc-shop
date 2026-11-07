import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Drawer, Divider, InputNumber, Popconfirm, Progress, Space, Switch, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { DeleteOutlined } from '@ant-design/icons';
import { FiSave, FiLink, FiRotateCcw, FiEdit3 } from 'react-icons/fi';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CompatibilityPanel } from '../../components/builder/CompatibilityPanel';
import { SaveBuildModal } from '../../components/builder/SaveBuildModal';
import { BUILDER_SLOTS, MULTI_QUANTITY_SLOTS } from '../../components/builder/slots';
import { useProducts } from '../../hooks/useProducts';
import { useAuth } from '../../context/AuthContext';
import { useBuilder, MAX_SLOT_QUANTITY } from '../../context/BuilderContext';
import { useCart } from '../../context/CartContext';
import { checkCompatibility } from '../../services/api/compatibilityService';
import { BuilderSlotId, Product } from '../../types/product';
import { formatCurrency } from '../../utils/format';
import { buildShareUrl, copyToClipboard } from '../../utils/share';
import { BuilderSkeleton, PicklistSkeleton } from '../../components/common/CustomSkeleton';

export const PCBuilderPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItemsToCart } = useCart();
  const { rig, quantities, lines, editing, setPart, removePart, setQuantity, clear } = useBuilder();
  const [activeSlot, setActiveSlot] = useState<BuilderSlotId | null>(null);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [saveMode, setSaveMode] = useState<'closed' | 'save' | 'saveAsNew'>('closed');

  const { data: allProducts = [], isLoading } = useProducts();

  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const selectedCount = lines.length;
  const progressPercent = (selectedCount / BUILDER_SLOTS.length) * 100;
  const compatibility = useMemo(() => checkCompatibility(lines), [lines]);
  const psuWattage = rig.psu?.compat?.wattage;

  const currentSlotConfig = BUILDER_SLOTS.find((s) => s.id === activeSlot);

  // Với mỗi linh kiện trong ngăn chọn: thay vào slot thì có phát sinh lỗi mới không
  const candidates = useMemo(() => {
    if (!activeSlot) return [];
    const others = lines.filter((l) => l.slot !== activeSlot);
    const baseErrors = new Set(
      checkCompatibility(others).issues.filter((i) => i.severity === 'ERROR').map((i) => i.ruleCode)
    );
    return allProducts
      .filter((p) => p.category === activeSlot)
      .map((p) => {
        const result = checkCompatibility([...others, { product: p, quantity: 1 }]);
        const newIssue = result.issues.find((i) => i.severity === 'ERROR' && !baseErrors.has(i.ruleCode));
        return { product: p, issue: newIssue };
      });
  }, [activeSlot, allProducts, lines]);

  const visibleCandidates = onlyCompatible ? candidates.filter((c) => !c.issue) : candidates;

  const handleSelectProduct = (product: Product) => {
    if (activeSlot) {
      setPart(activeSlot, product);
      setActiveSlot(null);
      message.success(`Đã thêm ${product.name} vào cấu hình`);
    }
  };

  const handleAddAllToCart = () => {
    addItemsToCart(lines.map((l) => ({ product: l.product, quantity: l.quantity })));
  };

  const requireLogin = (next: 'save' | 'saveAsNew') => {
    if (!isAuthenticated) {
      message.info(t('builder.loginToSave', 'Đăng nhập để lưu và chia sẻ cấu hình.'));
      navigate('/login?redirect=/builder');
      return;
    }
    setSaveMode(next);
  };

  return (
    <main className="container page">
      <Breadcrumb items={[t('nav.builder', 'PC Builder')]} />

      <div className="pagehead">
        <div>
          <h1>{t('builder.title', 'PC Builder')}</h1>
          <p>{t('builder.subtitle', 'Tự tay lựa chọn linh kiện và xây dựng cấu hình theo ngân sách.')}</p>
        </div>
        <div className="pagehead-actions">
          {selectedCount > 0 && (
            <Popconfirm
              title={t('builder.resetConfirm', 'Bỏ hết linh kiện và bắt đầu cấu hình mới?')}
              okText={t('builder.reset', 'Làm mới')}
              cancelText={t('common.cancel', 'Hủy')}
              onConfirm={clear}
            >
              <Button icon={<FiRotateCcw />}>{t('builder.reset', 'Làm mới')}</Button>
            </Popconfirm>
          )}
          {editing?.isPublic && (
            <Button
              icon={<FiLink />}
              onClick={() => copyToClipboard(buildShareUrl(editing.code), t('builder.linkCopied', 'Đã chép link chia sẻ.'))}
            >
              {t('builder.copyLink', 'Chép link')}
            </Button>
          )}
          <Button type="primary" icon={<FiSave />} disabled={selectedCount === 0} onClick={() => requireLogin('save')}>
            {editing ? t('builder.saveChanges', 'Lưu thay đổi') : t('builder.saveBuild', 'Lưu cấu hình')}
          </Button>
        </div>
      </div>

      {editing && (
        <Alert
          className="editing-banner"
          type="info"
          showIcon
          icon={<FiEdit3 />}
          title={
            <>
              {t('builder.editing', 'Đang sửa cấu hình')} <b>{editing.name}</b> (#{editing.code})
              {editing.isPublic && <Tag color="blue" style={{ marginLeft: 8 }}>{t('builds.public', 'Công khai')}</Tag>}
            </>
          }
          action={
            <Space size={12}>
              <Button type="link" size="small" onClick={() => requireLogin('saveAsNew')}>
                {t('builder.saveAsNew', 'Lưu thành bản mới')}
              </Button>
              <Link to="/account/builds">{t('builder.myBuilds', 'Cấu hình của tôi')}</Link>
            </Space>
          }
        />
      )}

      {isLoading ? (
        <BuilderSkeleton />
      ) : (
        <div className="builder">
          {/* Slot List */}
          <div className="slotlist">
            {BUILDER_SLOTS.map((slot) => {
              const product = rig[slot.id];
              const qty = quantities[slot.id] ?? 1;
              return (
                <div className={`slot ${product ? 'filled' : ''}`} key={slot.id}>
                  <CategoryIcon id={slot.id} />
                  <span>
                    <strong>{slot.defaultLabel}</strong>
                    <small>
                      {product ? product.name : t('builder.notSelected', 'Chưa chọn linh kiện')}
                    </small>
                  </span>
                  {product && MULTI_QUANTITY_SLOTS.includes(slot.id) && (
                    <InputNumber
                      size="small"
                      min={1}
                      max={MAX_SLOT_QUANTITY}
                      value={qty}
                      onChange={(v) => setQuantity(slot.id, v || 1)}
                      aria-label={`Số lượng ${slot.shortLabel}`}
                      style={{ width: 64 }}
                    />
                  )}
                  {product && <em>{formatCurrency(product.price * qty)}</em>}
                  <Button
                    onClick={() => setActiveSlot(slot.id)}
                    type={product ? 'default' : 'primary'}
                  >
                    {product ? t('builder.changeComponent', 'Thay đổi') : t('builder.selectComponent', 'Chọn linh kiện')}
                  </Button>
                  {product && (
                    <Button
                      type="text"
                      className="slot-remove"
                      icon={<DeleteOutlined />}
                      onClick={() => removePart(slot.id)}
                      aria-label={`Bỏ ${slot.shortLabel} khỏi cấu hình`}
                    />
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

            <Progress
              className="progress"
              percent={progressPercent}
              showInfo={false}
              size={{ height: 4 }}
              railColor="var(--panel-2)"
              aria-label="Số vị trí đã chọn"
            />

            <div className="summary-lines">
              {lines.map((l) => {
                const slotCfg = BUILDER_SLOTS.find((s) => s.id === l.slot);
                return (
                  <p key={l.slot}>
                    <span>
                      {slotCfg?.shortLabel}
                      {l.quantity > 1 && ` × ${l.quantity}`}
                    </span>
                    <b>{formatCurrency(l.product.price * l.quantity)}</b>
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

            <CompatibilityPanel result={compatibility} psuWattage={psuWattage} partCount={selectedCount} />
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
        {lines.some((l) => l.slot !== activeSlot) && (
          <label className="switch-row" style={{ marginBottom: 12 }}>
            <span>{t('builder.onlyCompatible', 'Chỉ hiện linh kiện tương thích')}</span>
            <Switch size="small" checked={onlyCompatible} onChange={setOnlyCompatible} />
          </label>
        )}
        <div className="picklist">
          {isLoading ? (
            <PicklistSkeleton count={4} />
          ) : (
            visibleCandidates.map(({ product: p, issue }) => (
              <div key={p.id} className={issue ? 'incompatible' : ''}>
                <img src={p.image} alt="" />
                <span>
                  <b>{p.name}</b>
                  <div className="pick-specs">{p.specs.slice(0, 2).join(' · ')}</div>
                  {issue && <div className="pick-issue">{issue.message}</div>}
                  <strong>{formatCurrency(p.price)}</strong>
                </span>
                <Button
                  type={rig[activeSlot!]?.id === p.id ? 'default' : issue ? 'default' : 'primary'}
                  onClick={() => handleSelectProduct(p)}
                  aria-label={`${t('common.pick', 'Chọn')} ${p.name}`}
                >
                  {rig[activeSlot!]?.id === p.id ? t('builder.picked', 'Đang chọn') : t('common.pick', 'Chọn')}
                </Button>
              </div>
            ))
          )}
          {!isLoading && visibleCandidates.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
              {candidates.length > 0
                ? t('builder.noCompatibleParts', 'Không có linh kiện nào khớp với cấu hình hiện tại.')
                : 'Không có sản phẩm nào cho danh mục này.'}
            </div>
          )}
        </div>
      </Drawer>

      <SaveBuildModal
        open={saveMode !== 'closed'}
        asNew={saveMode === 'saveAsNew'}
        onClose={() => setSaveMode('closed')}
      />
    </main>
  );
};
