import React from 'react';
import { FloatButton } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';

export const ScrollToTop: React.FC = () => {
  return (
    <FloatButton.BackTop
      className="scrolltop"
      visibilityHeight={300}
      icon={<ArrowUpOutlined style={{ fontSize: 18 }} />}
      aria-label="Scroll to top"
    />
  );
};
