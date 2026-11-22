import React, { useEffect, useState } from 'react';
import { Modal, Input, Select, Checkbox, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { UserAddress, UserAddressInput } from '../../types/user';
import { useProvinces, useSaveAddress, useWards } from '../../hooks/useAddresses';
import { PHONE_PATTERN } from '../../services/api/addressService';

interface AddressFormModalProps {
  open: boolean;
  /** Có thì là sửa, không có thì là thêm mới */
  address?: UserAddress | null;
  defaultReceiver?: { name: string; phone: string };
  onClose: () => void;
  onSaved?: (address: UserAddress) => void;
}

const EMPTY: UserAddressInput = {
  isDefault: false,
  receiverName: '',
  receiverPhone: '',
  provinceCode: '',
  provinceName: '',
  wardCode: '',
  wardName: '',
  addressDetail: '',
};

type Field = 'receiverName' | 'receiverPhone' | 'provinceCode' | 'wardCode' | 'addressDetail';

export const AddressFormModal: React.FC<AddressFormModalProps> = ({ open, address, defaultReceiver, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<UserAddressInput>(EMPTY);
  const [touched, setTouched] = useState(false);
  const { data: provinces = [] } = useProvinces();
  const { data: wards = [], isFetching: loadingWards } = useWards(form.provinceCode || undefined);
  const saveAddress = useSaveAddress();

  // Chỉ nạp lại form khi vừa mở hoặc đổi địa chỉ cần sửa; defaultReceiver đổi tham chiếu mỗi lần render nên không theo dõi
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (address) {
      const { id: _id, ...rest } = address;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, receiverName: defaultReceiver?.name ?? '', receiverPhone: defaultReceiver?.phone ?? '' });
    }
  }, [open, address]);

  const errors: Partial<Record<Field, string>> = {};
  if (!form.receiverName.trim()) errors.receiverName = t('address.errName', 'Vui lòng nhập tên người nhận.');
  if (!PHONE_PATTERN.test(form.receiverPhone.replace(/[\s.]/g, '')))
    errors.receiverPhone = t('address.errPhone', 'Số điện thoại gồm 10 số, bắt đầu bằng 0.');
  if (!form.provinceCode) errors.provinceCode = t('address.errProvince', 'Vui lòng chọn tỉnh/thành phố.');
  if (!form.wardCode) errors.wardCode = t('address.errWard', 'Vui lòng chọn phường/xã.');
  if (!form.addressDetail.trim()) errors.addressDetail = t('address.errDetail', 'Vui lòng nhập số nhà, tên đường.');

  const showError = (field: Field) => (touched && errors[field] ? errors[field] : undefined);

  const handleSubmit = () => {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    const input: UserAddressInput = {
      ...form,
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.replace(/[\s.]/g, ''),
      addressDetail: form.addressDetail.trim(),
    };
    saveAddress.mutate(
      { id: address?.id, input },
      {
        onSuccess: (saved) => {
          message.success(
            address ? t('address.updated', 'Đã cập nhật địa chỉ.') : t('address.created', 'Đã thêm địa chỉ mới.')
          );
          onSaved?.(saved);
          onClose();
        },
        onError: () => message.error(t('common.errorOccurred', 'Có lỗi xảy ra, vui lòng thử lại')),
      }
    );
  };

  return (
    <Modal
      centered
      open={open}
      title={address ? t('address.editTitle', 'Sửa địa chỉ') : t('address.addTitle', 'Thêm địa chỉ mới')}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('address.save', 'Lưu địa chỉ')}
      cancelText={t('common.cancel', 'Hủy')}
      confirmLoading={saveAddress.isPending}
      width={560}
    >
      <div className="formgrid address-form">
        <label>
          {t('address.receiverName', 'Họ tên người nhận')} *
          <Input
            value={form.receiverName}
            status={showError('receiverName') ? 'error' : undefined}
            onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
            placeholder="Nguyễn Văn A"
          />
          {showError('receiverName') && <small className="field-error">{errors.receiverName}</small>}
        </label>
        <label>
          {t('address.receiverPhone', 'Số điện thoại')} *
          <Input
            value={form.receiverPhone}
            inputMode="tel"
            status={showError('receiverPhone') ? 'error' : undefined}
            onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })}
            placeholder="0xxxxxxxxx"
          />
          {showError('receiverPhone') && <small className="field-error">{errors.receiverPhone}</small>}
        </label>
        <label>
          {t('address.province', 'Tỉnh / Thành phố')} *
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            value={form.provinceCode || undefined}
            status={showError('provinceCode') ? 'error' : undefined}
            placeholder={t('address.selectProvince', 'Chọn tỉnh/thành')}
            options={provinces.map((p) => ({ value: p.code, label: p.name }))}
            onChange={(code) =>
              setForm({
                ...form,
                provinceCode: code,
                provinceName: provinces.find((p) => p.code === code)?.name ?? '',
                wardCode: '',
                wardName: '',
              })
            }
          />
          {showError('provinceCode') && <small className="field-error">{errors.provinceCode}</small>}
        </label>
        <label>
          {t('address.ward', 'Phường / Xã')} *
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            value={form.wardCode || undefined}
            disabled={!form.provinceCode}
            loading={loadingWards}
            status={showError('wardCode') ? 'error' : undefined}
            placeholder={
              form.provinceCode
                ? t('address.selectWard', 'Chọn phường/xã')
                : t('address.selectProvinceFirst', 'Chọn tỉnh/thành trước')
            }
            options={wards.map((w) => ({ value: w.code, label: w.name }))}
            onChange={(code) =>
              setForm({ ...form, wardCode: code, wardName: wards.find((w) => w.code === code)?.name ?? '' })
            }
          />
          {showError('wardCode') && <small className="field-error">{errors.wardCode}</small>}
        </label>
        <label className="wide">
          {t('address.detail', 'Địa chỉ cụ thể')} *
          <Input
            value={form.addressDetail}
            status={showError('addressDetail') ? 'error' : undefined}
            onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
            placeholder={t('address.detailPlaceholder', 'Số nhà, tên đường, tòa nhà...')}
          />
          {showError('addressDetail') && <small className="field-error">{errors.addressDetail}</small>}
        </label>
        <Checkbox
          className="wide"
          checked={form.isDefault}
          disabled={address?.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
        >
          {t('address.setDefault', 'Đặt làm địa chỉ mặc định')}
        </Checkbox>
      </div>
    </Modal>
  );
};
