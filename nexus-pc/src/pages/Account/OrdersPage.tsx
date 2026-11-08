import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Button, Empty, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { SearchOutlined } from '@ant-design/icons';
import { AccountShell } from '../../components/account/AccountShell';
import { OrderStatusTag } from '../../components/order/OrderStatusTag';
import { OrderListSkeleton } from '../../components/common/CustomSkeleton';
import { useUserOrders } from '../../hooks/useOrders';
import { Order } from '../../types/order';
import { formatCurrency } from '../../utils/format';
import { ORDER_FILTER_LABEL, ORDER_FILTER_STATUSES, OrderFilter, formatDate } from '../../utils/orderStatus';

type StatusFilter = OrderFilter;

const FILTERS: StatusFilter[] = ['all', 'processing', 'shipping', 'completed', 'closed'];
const matches = (o: Order, f: StatusFilter) => f === 'all' || ORDER_FILTER_STATUSES[f].includes(o.status);
const PREVIEW_ITEMS = 3;

export const OrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: orders = [], isLoading } = useUserOrders();

  const raw = searchParams.get('status') as StatusFilter | null;
  const status: StatusFilter = raw && FILTERS.includes(raw) ? raw : 'all';
  const [query, setQuery] = useState(searchParams.get('code') || '');

  const setStatus = (next: StatusFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
  };

  const counts = useMemo(() => {
    const result = {} as Record<StatusFilter, number>;
    FILTERS.forEach((f) => (result[f] = orders.filter((o) => matches(o, f)).length));
    return result;
  }, [orders]);

  const q = query.trim().toUpperCase();
  const filtered = orders.filter(
    (o) => matches(o, status) && (!q || o.id.toUpperCase().includes(q))
  );

  // Gõ đúng một mã đơn rồi Enter thì mở thẳng chi tiết (thay cho trang tra cứu cũ)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const exact = orders.find((o) => o.id.toUpperCase() === q);
    if (exact) navigate(`/account/orders/${exact.id}`);
  };

  return (
    <AccountShell
      title={t('account.tabOrders', 'Đơn hàng của tôi')}
      subtitle={t('orders.subtitle', 'Theo dõi trạng thái giao hàng và lịch sử mua sắm.')}
    >
      <form className="orders-toolbar" onSubmit={handleSearch} role="search">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
          placeholder={t('orders.searchPlaceholder', 'Tìm theo mã đơn, ví dụ DH20261105001003')}
          allowClear
          aria-label={t('orders.searchLabel', 'Tìm đơn hàng theo mã')}
        />
      </form>

      <Tag.CheckableTagGroup<StatusFilter>
        className="chips"
        aria-label={t('orders.filterLabel', 'Lọc theo trạng thái')}
        value={status}
        // Bấm lại chip đang chọn thì group trả null: coi như về "Tất cả"
        onChange={(next) => setStatus(next ?? 'all')}
        options={FILTERS.map((f) => ({
          value: f,
          label: (
            <>
              {t(ORDER_FILTER_LABEL[f].labelKey, ORDER_FILTER_LABEL[f].label)}
              <span className="chip-count">{counts[f]}</span>
            </>
          ),
        }))}
      />

      {isLoading ? (
        <OrderListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="emptybox">
          <Empty
            description={
              orders.length === 0
                ? t('account.noOrders', 'Bạn chưa có đơn hàng nào')
                : t('orders.noMatch', 'Không có đơn hàng phù hợp')
            }
          >
            {orders.length === 0 && (
              <Link to="/products">
                <Button type="primary">{t('common.continueShopping', 'Tiếp tục mua sắm')}</Button>
              </Link>
            )}
          </Empty>
        </div>
      ) : (
        <div className="orderlist">
          {filtered.map((order) => {
            const itemCount = order.items.reduce((sum, it) => sum + it.qty, 0);
            const extra = order.items.length - PREVIEW_ITEMS;
            return (
              <article className="ordercard" key={order.id}>
                <header>
                  <div>
                    <Link to={`/account/orders/${order.id}`} className="ordercode">
                      {order.id}
                    </Link>
                    <small>
                      {t('orders.placedAt', 'Đặt ngày')} {formatDate(order.createdAt)} ·{' '}
                      {t('orders.itemCount', { count: itemCount, defaultValue: `${itemCount} sản phẩm` })}
                    </small>
                  </div>
                  <OrderStatusTag status={order.status} />
                </header>

                <Link to={`/account/orders/${order.id}`} className="order-thumbs" tabIndex={-1} aria-hidden="true">
                  {order.items.slice(0, PREVIEW_ITEMS).map((it) => (
                    <img key={it.id} src={it.image} alt="" loading="lazy" />
                  ))}
                  {extra > 0 && <span>+{extra}</span>}
                  <p>{order.items.map((it) => it.name).join(', ')}</p>
                </Link>

                <footer>
                  <span>
                    {t('orders.total', 'Tổng tiền')}: <b className="num">{formatCurrency(order.totalAmount)}</b>
                  </span>
                  <Link to={`/account/orders/${order.id}`}>
                    <Button>{t('orders.viewDetail', 'Xem chi tiết')}</Button>
                  </Link>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
};
