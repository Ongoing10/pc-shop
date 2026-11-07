import React, { useState } from 'react';
import { Button, Empty, Popconfirm, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';
import { FiMapPin, FiPhone } from 'react-icons/fi';
import { AccountShell } from '../../components/account/AccountShell';
import { AddressFormModal } from '../../components/address/AddressFormModal';
import { OrderListSkeleton } from '../../components/common/CustomSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from '../../hooks/useAddresses';
import { formatAddress } from '../../services/api/addressService';
import { UserAddress } from '../../types/user';

export const AddressesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { data: addresses = [], isLoading } = useAddresses(isAuthenticated);
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (address: UserAddress) => {
    setEditing(address);
    setFormOpen(true);
  };

  return (
    <AccountShell
      title={t('account.tabAddresses', 'Sổ địa chỉ')}
      subtitle={t('address.subtitle', 'Địa chỉ mặc định được chọn sẵn khi thanh toán.')}
      actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('address.add', 'Thêm địa chỉ')}
        </Button>
      }
    >
      {isLoading ? (
        <OrderListSkeleton count={2} />
      ) : addresses.length === 0 ? (
        <div className="emptybox">
          <Empty description={t('account.noAddresses', 'Bạn chưa lưu địa chỉ nhận hàng nào')}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('address.addFirst', 'Thêm địa chỉ đầu tiên')}
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="addrlist">
          {addresses.map((a) => (
            <article key={a.id} className={`addrcard ${a.isDefault ? 'default' : ''}`}>
              <div>
                <header>
                  <b>{a.receiverName}</b>
                  {a.isDefault && <Tag color="orange">{t('address.default', 'Mặc định')}</Tag>}
                </header>
                <p>
                  <FiPhone aria-hidden="true" /> {a.receiverPhone}
                </p>
                <p>
                  <FiMapPin aria-hidden="true" /> {formatAddress(a)}
                </p>
              </div>
              <footer>
                <Button type="link" onClick={() => openEdit(a)}>
                  {t('common.edit', 'Sửa')}
                </Button>
                {!a.isDefault && (
                  <>
                    <Button
                      type="link"
                      loading={setDefault.isPending && setDefault.variables === a.id}
                      onClick={() =>
                        setDefault.mutate(a.id, {
                          onSuccess: () => message.success(t('address.defaultSet', 'Đã đặt làm địa chỉ mặc định.')),
                        })
                      }
                    >
                      {t('address.setDefaultShort', 'Đặt mặc định')}
                    </Button>
                    <Popconfirm
                      title={t('address.deleteConfirm', 'Xóa địa chỉ này?')}
                      okText={t('common.remove', 'Xóa')}
                      cancelText={t('common.cancel', 'Hủy')}
                      okButtonProps={{ danger: true }}
                      onConfirm={() =>
                        deleteAddress.mutate(a.id, {
                          onSuccess: () => message.success(t('address.deleted', 'Đã xóa địa chỉ.')),
                        })
                      }
                    >
                      <Button type="link" danger>
                        {t('common.remove', 'Xóa')}
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}

      <AddressFormModal
        open={formOpen}
        address={editing}
        defaultReceiver={user ? { name: user.fullName, phone: user.phone } : undefined}
        onClose={() => setFormOpen(false)}
      />
    </AccountShell>
  );
};
