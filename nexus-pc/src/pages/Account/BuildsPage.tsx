import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Checkbox, Empty, Popconfirm, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiLink, FiZap, FiEdit3 } from 'react-icons/fi';
import { AccountShell } from '../../components/account/AccountShell';
import { CompatBadge } from '../../components/builder/CompatibilityPanel';
import { OrderListSkeleton } from '../../components/common/CustomSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useBuilder } from '../../context/BuilderContext';
import { useDeletePcBuilds, useMyBuilds } from '../../hooks/usePcBuilds';
import { resolveBuildItems } from '../../services/api/pcBuildService';
import { PcBuild } from '../../types/pcBuild';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/orderStatus';
import { buildShareUrl, copyToClipboard } from '../../utils/share';

export const BuildsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { loadBuild } = useBuilder();
  const { data: builds = [], isLoading } = useMyBuilds(isAuthenticated);
  const deleteBuilds = useDeletePcBuilds();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (code: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, code] : prev.filter((c) => c !== code)));

  const handleDelete = (codes: string[]) => {
    deleteBuilds.mutate(codes, {
      onSuccess: () => {
        message.success(t('builds.deleted', { count: codes.length, defaultValue: `Đã xóa ${codes.length} cấu hình.` }));
        setSelected((prev) => prev.filter((c) => !codes.includes(c)));
      },
    });
  };

  const openInBuilder = (build: PcBuild) => {
    loadBuild(build);
    navigate('/builder');
  };

  const allSelected = builds.length > 0 && selected.length === builds.length;

  return (
    <AccountShell
      title={t('account.tabBuilds', 'Cấu hình PC đã lưu')}
      subtitle={t('builds.subtitle', 'Mở lại để chỉnh sửa, chia sẻ link hoặc thêm cả cấu hình vào giỏ.')}
      actions={
        <Link to="/builder">
          <Button type="primary">{t('builds.newBuild', 'Ráp cấu hình mới')}</Button>
        </Link>
      }
    >
      {isLoading ? (
        <OrderListSkeleton count={2} />
      ) : builds.length === 0 ? (
        <div className="emptybox">
          <Empty description={t('builds.empty', 'Bạn chưa lưu cấu hình nào')}>
            <Link to="/builder">
              <Button type="primary">{t('nav.builder', 'PC Builder')}</Button>
            </Link>
          </Empty>
        </div>
      ) : (
        <>
          <div className="bulkbar">
            <Checkbox
              checked={allSelected}
              indeterminate={selected.length > 0 && !allSelected}
              onChange={(e) => setSelected(e.target.checked ? builds.map((b) => b.code) : [])}
            >
              {selected.length > 0
                ? t('builds.selectedCount', { count: selected.length, defaultValue: `Đã chọn ${selected.length}` })
                : t('builds.selectAll', 'Chọn tất cả')}
            </Checkbox>
            {selected.length > 0 && (
              <Popconfirm
                title={t('builds.deleteManyConfirm', { count: selected.length, defaultValue: `Xóa ${selected.length} cấu hình đã chọn?` })}
                okText={t('common.remove', 'Xóa')}
                cancelText={t('common.cancel', 'Hủy')}
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(selected)}
              >
                <Button danger size="small">
                  {t('builds.deleteSelected', 'Xóa đã chọn')}
                </Button>
              </Popconfirm>
            )}
          </div>

          <div className="buildlist">
            {builds.map((build) => {
              const lines = resolveBuildItems(build.items);
              return (
                <article className="buildcard" key={build.code}>
                  <Checkbox
                    checked={selected.includes(build.code)}
                    onChange={(e) => toggle(build.code, e.target.checked)}
                    aria-label={t('builds.select', { name: build.name, defaultValue: `Chọn ${build.name}` })}
                  />
                  <div className="buildcard-body">
                    <header>
                      <div>
                        <b>{build.name}</b>
                        <small>
                          #{build.code} · {t('builds.updatedAt', 'Cập nhật')} {formatDate(build.updatedAt)}
                          {build.purpose ? ` · ${build.purpose}` : ''}
                        </small>
                      </div>
                      <div className="buildcard-tags">
                        {build.isPublic && <Tag color="blue">{t('builds.public', 'Công khai')}</Tag>}
                        <CompatBadge result={build.compatibility} />
                      </div>
                    </header>

                    <div className="order-thumbs">
                      {lines.slice(0, 6).map((l) => (
                        <img key={l.slot} src={l.product.image} alt="" loading="lazy" />
                      ))}
                      <p>{lines.map((l) => l.product.name).join(' · ')}</p>
                    </div>

                    <footer>
                      <span className="buildcard-meta">
                        <b className="num">{formatCurrency(build.totalPrice)}</b>
                        <span>
                          <FiZap aria-hidden="true" /> {build.estimatedWattage}W
                        </span>
                        <span>{t('builds.partCount', { count: lines.length, defaultValue: `${lines.length} linh kiện` })}</span>
                      </span>
                      <span className="buildcard-actions">
                        {build.isPublic && (
                          <Button
                            icon={<FiLink />}
                            onClick={() => copyToClipboard(buildShareUrl(build.code), t('builder.linkCopied', 'Đã chép link chia sẻ.'))}
                          >
                            {t('builder.copyLink', 'Chép link')}
                          </Button>
                        )}
                        <Popconfirm
                          title={t('builds.deleteConfirm', 'Xóa cấu hình này?')}
                          okText={t('common.remove', 'Xóa')}
                          cancelText={t('common.cancel', 'Hủy')}
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDelete([build.code])}
                        >
                          <Button danger>{t('common.remove', 'Xóa')}</Button>
                        </Popconfirm>
                        <Button type="primary" icon={<FiEdit3 />} onClick={() => openInBuilder(build)}>
                          {t('builds.openInBuilder', 'Mở trong Builder')}
                        </Button>
                      </span>
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </AccountShell>
  );
};
