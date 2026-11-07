import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, Flex, Typography } from 'antd';

interface AdminPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** các mục trước tiêu đề, vd [{ label: 'Đơn hàng', link: '/admin/orders' }] */
  crumbs?: Array<{ label: string; link: string }>;
  extra?: ReactNode;
}

/** Tiêu đề trang admin: breadcrumb + tên trang + nút thao tác chính */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, subtitle, crumbs, extra }) => (
  <div className="admin-pagehead">
    {crumbs && crumbs.length > 0 && (
      <Breadcrumb
        items={[
          { title: <Link to="/admin">Quản trị</Link> },
          ...crumbs.map((c) => ({ title: <Link to={c.link}>{c.label}</Link> })),
          { title: typeof title === 'string' ? title : undefined },
        ]}
      />
    )}
    <Flex align="flex-end" justify="space-between" gap={16} wrap>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      {extra && (
        <Flex gap={8} wrap>
          {extra}
        </Flex>
      )}
    </Flex>
  </div>
);
