import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Tabs } from 'antd';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StockTab } from './StockTab';
import { MovementsTab } from './MovementsTab';
import { WarehousesTab } from './WarehousesTab';

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
      <AdminPageHeader title="Tồn kho" subtitle="Số lượng theo từng kho, phiếu nhập và điều chỉnh" />
      <Card>
        <Tabs
          activeKey={tab}
          onChange={(k) => openTab(k as InventoryTab)}
          destroyOnHidden
          items={[
            { key: 'stock', label: 'Tồn kho', children: <StockTab onShowHistory={(sku) => openTab('movements', { sku })} /> },
            { key: 'movements', label: 'Biến động kho', children: <MovementsTab /> },
            { key: 'warehouses', label: 'Kho hàng', children: <WarehousesTab /> },
          ]}
        />
      </Card>
    </>
  );
};
