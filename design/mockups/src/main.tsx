import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ProductListScreen } from './screens/ProductListScreen';

// Trạng thái chọn bằng query, vd ?chat=closed (script chụp ảnh dùng cách này).
const params = new URLSearchParams(location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProductListScreen chatOpen={params.get('chat') !== 'closed'} />
  </StrictMode>,
);
