import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/** /track-order?code=X → chi tiết đơn X; không có mã → danh sách đơn của tôi */
export const TrackOrderRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code')?.trim();
  return <Navigate to={code ? `/account/orders/${encodeURIComponent(code)}` : '/account/orders'} replace />;
};
