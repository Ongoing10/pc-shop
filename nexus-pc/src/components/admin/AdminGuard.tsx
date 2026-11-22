import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import { AdminAccess, useAdminSession } from '../../context/AdminSessionContext';
import { t } from '../../i18n/t';

/** Chặn màn admin khi thiếu role/permission (giống 403 của backend) */
export const AdminGuard: React.FC<{ access?: AdminAccess; children: ReactNode }> = ({ access, children }) => {
  const navigate = useNavigate();
  const { canAccess } = useAdminSession();

  if (canAccess(access)) return <>{children}</>;

  return (
    <Result
      status="403"
      title={t('admin.layout.accessDenied', 'Không có quyền truy cập')}
      subTitle={t('admin.layout.yourAccountHasNotBeen', 'Tài khoản của bạn chưa được cấp quyền cho màn hình này. Liên hệ quản trị viên nếu cần.')}
      extra={
        <Button type="primary" onClick={() => navigate('/admin')}>
          {t('admin.layout.backToOverview', 'Về trang tổng quan')}
        </Button>
      }
    />
  );
};
