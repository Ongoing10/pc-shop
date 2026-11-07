import React from 'react';
import { Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { PriceHistoryEntry } from '../../types/review';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/orderStatus';

const W = 640;
const H = 170;
const PAD = { top: 16, right: 16, bottom: 26, left: 16 };

/** Biểu đồ bậc thang: giá giữ nguyên tới lần đổi kế tiếp, kéo dài đến hôm nay */
export const PriceHistoryChart: React.FC<{ history: PriceHistoryEntry[]; currentPrice: number }> = ({ history, currentPrice }) => {
  const { t } = useTranslation();

  if (history.length === 0) {
    return <p className="muted">{t('productDetail.noPriceHistory', 'Giá chưa thay đổi kể từ khi mở bán.')}</p>;
  }

  const now = Date.now();
  const start = new Date(history[0].changedAt).getTime() - 14 * 86400000;
  const points: Array<{ time: number; price: number }> = [
    { time: start, price: history[0].oldPrice },
    ...history.map((h) => ({ time: new Date(h.changedAt).getTime(), price: h.newPrice })),
  ];

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || max * 0.1;
  const x = (time: number) => PAD.left + ((time - start) / (now - start)) * (W - PAD.left - PAD.right);
  const y = (price: number) => PAD.top + (1 - (price - (min - span * 0.15)) / (span * 1.3)) * (H - PAD.top - PAD.bottom);

  let d = `M ${x(points[0].time)} ${y(points[0].price)}`;
  points.slice(1).forEach((p) => {
    d += ` H ${x(p.time)} V ${y(p.price)}`;
  });
  d += ` H ${x(now)}`;

  const lowest = Math.min(...prices);

  return (
    <div className="pricechart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('productDetail.priceChartLabel', {
          price: formatCurrency(currentPrice),
          defaultValue: `Biểu đồ lịch sử giá, giá hiện tại ${formatCurrency(currentPrice)}`,
        })}
      >
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="axis" />
        <path d={d} className="line" />
        {points.map((p) => (
          <circle key={p.time} cx={x(p.time)} cy={y(p.price)} r={3.5} className="dot" />
        ))}
        <circle cx={x(now)} cy={y(currentPrice)} r={5} className="dot now" />
        <text x={PAD.left} y={H - 8} className="tick">
          {formatDate(new Date(start).toISOString())}
        </text>
        <text x={W - PAD.right} y={H - 8} className="tick" textAnchor="end">
          {t('productDetail.today', 'Hôm nay')}
        </text>
      </svg>

      <Table<PriceHistoryEntry>
        className="pricetable"
        size="small"
        pagination={false}
        rowKey="changedAt"
        dataSource={[...history].reverse()}
        columns={[
          { title: t('productDetail.changedAt', 'Ngày'), dataIndex: 'changedAt', render: (v: string) => formatDate(v) },
          {
            title: t('productDetail.oldPrice', 'Giá cũ'),
            dataIndex: 'oldPrice',
            className: 'num',
            render: (v: number) => formatCurrency(v),
          },
          {
            title: t('productDetail.newPrice', 'Giá mới'),
            dataIndex: 'newPrice',
            className: 'num',
            render: (v: number, h) => (
              <>
                <span className={v < h.oldPrice ? 'down' : 'up'}>{formatCurrency(v)}</span>
                {v === lowest && (
                  <Tag color="success" bordered={false} className="lowest">
                    {t('productDetail.lowest', 'Thấp nhất')}
                  </Tag>
                )}
              </>
            ),
          },
          { title: t('productDetail.reason', 'Lý do'), dataIndex: 'reason' },
        ]}
      />
    </div>
  );
};
