import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Tabs } from 'antd';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StockTab } from './StockTab';
import { MovementsTab } from './MovementsTab';
import { WarehousesTab } from './WarehousesTab';
import { t } from '../../../i18n/t';

type InventoryTab = 'stock' | 'movements' | 'warehouses';

/** A05: tồn kho, lịch sử biến động, danh sách kho. Tab và bộ lọc nằm trên URL để dashboard dẫn vào đúng chỗ. */
export const InventoryPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as InventoryTab) || 'stock';

  const openTab = (next: InventoryTab, extra?: Record<string, string>) => {
    setParams(new URLSearchParams({ ...(next === 'stock' ? {} : { tab: next }), ...extra }), { replace: true });
  };

  return (
    <>
      <AdminPageHeader title={t('admin.common.inventory', 'Tồn kho')} subtitle={t('admin.inventory.quantityPerWarehouseStockReceipts', 'Số lượng theo từng kho, phiếu nhập và điều chỉnh')} />
      <Card>
        <Tabs
          activeKey={tab}
          onChange={(k) => openTab(k as InventoryTab)}
          destroyOnHidden
          items={[
            { key: 'stock', label: t('admin.common.inventory', 'Tồn kho'), children: <StockTab onShowHistory={(sku) => openTab('movements', { sku })} /> },
            { key: 'movements', label: t('admin.inventory.stockMovements', 'Biến động kho'), children: <MovementsTab /> },
            { key: 'warehouses', label: t('admin.inventory.warehouses', 'Kho hàng'), children: <WarehousesTab /> },
          ]}
        />
      </Card>
    </>
  );
};
