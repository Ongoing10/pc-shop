import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input, Button, Steps, Spin, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { FiPackage, FiTruck, FiCheckCircle } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useTrackOrder } from '../../hooks/useOrders';
import { formatCurrency } from '../../utils/format';

export const TrackOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [searchedCode, setSearchedCode] = useState(initialCode);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setSearchedCode(initialCode);
    }
  }, [initialCode]);

  const { data: order, isLoading, isFetched } = useTrackOrder(
    searchedCode,
    Boolean(searchedCode.trim())
  );

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;
    setSearchedCode(code.trim());
    setSearchParams({ code: code.trim() });
  };

  const getStepIndex = (status?: string) => {
    switch (status) {
      case 'processing':
        return 1;
      case 'shipping':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <main className="container page">
      <Breadcrumb items={[t('track.title', 'Tra cứu đơn hàng')]} />

      <div className="track">
        <h1>{t('track.title', 'Tra cứu đơn hàng')}</h1>
        <p>{t('track.subtitle', 'Nhập mã đơn hàng để kiểm tra trạng thái vận chuyển theo thời gian thực.')}</p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('track.inputPlaceholder', 'Ví dụ: NX20260001')}
            prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
            size="large"
            aria-label="Order code input"
          />
          <Button type="primary" size="large" onClick={() => handleSearch()}>
            {t('track.btnTrack', 'Tra cứu')}
          </Button>
        </form>

        {isLoading && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        )}

        {isFetched && order && (
          <div style={{ marginTop: 30, textAlign: 'left', background: 'var(--panel)', padding: 24, borderRadius: 12, border: '1px solid var(--line-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <b style={{ fontSize: 16, color: 'var(--accent)' }}>Đơn hàng: {order.id}</b>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Ngày tạo: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <Tag color="cyan" style={{ padding: '4px 8px', fontSize: 13 }}>
                {order.status.toUpperCase()}
              </Tag>
            </div>

            <Steps
              current={getStepIndex(order.status)}
              items={[
                { title: 'Đặt hàng', icon: <FiPackage /> },
                { title: 'Chuẩn bị hàng', icon: <FiCheckCircle /> },
                { title: 'Đang vận chuyển', icon: <FiTruck /> },
                { title: 'Giao thành công', icon: <FiCheckCircle /> },
              ]}
              style={{ margin: '24px 0' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, borderTop: '1px solid var(--line-strong)', paddingTop: 16 }}>
              <div>
                <small style={{ color: 'var(--muted)' }}>Người nhận</small>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>{order.shippingAddress.fullName}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{order.shippingAddress.phone}</p>
              </div>

              <div>
                <small style={{ color: 'var(--muted)' }}>Địa chỉ giao hàng</small>
                <p style={{ margin: '4px 0', fontSize: 13 }}>{order.shippingAddress.address}, {order.shippingAddress.city}</p>
              </div>

              <div>
                <small style={{ color: 'var(--muted)' }}>Dự kiến giao hàng</small>
                <p style={{ margin: '4px 0', color: 'var(--ok)', fontWeight: 600 }}>{order.estimatedDelivery || '2-3 ngày làm việc'}</p>
              </div>

              <div>
                <small style={{ color: 'var(--muted)' }}>Tổng tiền</small>
                <p style={{ margin: '4px 0', color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {isFetched && !order && searchedCode && (
          <div style={{ marginTop: 24, padding: 20, background: 'rgb(240 82 82 / 0.1)', border: '1px solid rgb(240 82 82 / 0.3)', borderRadius: 8 }}>
            Không tìm thấy thông tin đơn hàng <b>{searchedCode}</b>. Vui lòng kiểm tra lại mã đơn hàng.
          </div>
        )}

        <p className="notice" style={{ marginTop: 24 }}>
          <InfoCircleOutlined style={{ marginRight: 6 }} />
          {t('track.notice', 'Hệ thống kết nối trực tiếp với dịch vụ vận chuyển nhanh NEXUS Express 24/7.')}
        </p>
      </div>
    </main>
  );
};
