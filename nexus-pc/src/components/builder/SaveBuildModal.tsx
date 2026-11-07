import React, { useEffect, useState } from 'react';
import { Modal, Input, Switch, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useBuilder } from '../../context/BuilderContext';
import { useSavePcBuild } from '../../hooks/usePcBuilds';
import { PcBuild } from '../../types/pcBuild';

interface SaveBuildModalProps {
  open: boolean;
  /** true: lưu thành cấu hình mới dù đang sửa một cấu hình cũ */
  asNew?: boolean;
  onClose: () => void;
  onSaved?: (build: PcBuild) => void;
}

export const SaveBuildModal: React.FC<SaveBuildModalProps> = ({ open, asNew = false, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, editing, setEditing } = useBuilder();
  const saveBuild = useSavePcBuild();
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setName(editing && !asNew ? editing.name : '');
    setPurpose(editing && !asNew ? editing.purpose ?? '' : '');
    setIsPublic(editing && !asNew ? editing.isPublic : false);
  }, [open, editing, asNew]);

  const handleSave = () => {
    setTouched(true);
    if (!name.trim() || !user) return;
    saveBuild.mutate(
      {
        payload: { name: name.trim(), purpose: purpose.trim() || undefined, isPublic, items },
        ownerName: user.fullName,
        code: asNew ? undefined : editing?.code,
      },
      {
        onSuccess: (build) => {
          setEditing({ code: build.code, name: build.name, purpose: build.purpose, isPublic: build.isPublic });
          message.success(t('builder.saved', 'Đã lưu cấu hình.'));
          onSaved?.(build);
          onClose();
        },
        onError: () => message.error(t('common.errorOccurred', 'Có lỗi xảy ra, vui lòng thử lại')),
      }
    );
  };

  return (
    <Modal
      open={open}
      title={editing && !asNew ? t('builder.updateTitle', 'Cập nhật cấu hình') : t('builder.saveTitle', 'Lưu cấu hình')}
      onCancel={onClose}
      onOk={handleSave}
      okText={t('builder.save', 'Lưu')}
      cancelText={t('common.cancel', 'Hủy')}
      confirmLoading={saveBuild.isPending}
    >
      <div className="formgrid" style={{ gridTemplateColumns: '1fr' }}>
        <label>
          {t('builder.buildName', 'Tên cấu hình')} *
          <Input
            value={name}
            maxLength={80}
            status={touched && !name.trim() ? 'error' : undefined}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('builder.buildNamePlaceholder', 'Ví dụ: PC gaming 2K')}
          />
          {touched && !name.trim() && (
            <small className="field-error">{t('builder.buildNameRequired', 'Vui lòng đặt tên cho cấu hình.')}</small>
          )}
        </label>
        <label>
          {t('builder.purpose', 'Mục đích sử dụng')}
          <Input
            value={purpose}
            maxLength={120}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder={t('builder.purposePlaceholder', 'Chơi game, đồ họa, văn phòng...')}
          />
        </label>
        <div className="switch-row">
          <span>
            <b>{t('builder.public', 'Chia sẻ công khai')}</b>
            <small>{t('builder.publicHint', 'Ai có đường link đều xem được cấu hình này.')}</small>
          </span>
          <Switch checked={isPublic} onChange={setIsPublic} aria-label={t('builder.public', 'Chia sẻ công khai')} />
        </div>
      </div>
    </Modal>
  );
};
