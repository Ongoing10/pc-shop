import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Card, Checkbox, Flex, Form, Input, Typography } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { LogoMark } from '../../../components/common/LogoMark';
import { useAdminSession } from '../../../context/AdminSessionContext';

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

/** Chỉ quay lại trang trong khu admin, tránh chuyển hướng ra ngoài qua tham số redirect */
const safeRedirect = (value: string | null) =>
  value && value.startsWith('/admin') && !value.startsWith('/admin/login') ? value : '/admin';

/** Đăng nhập khu quản trị (/admin/login). Chỉ tài khoản có role STAFF hoặc ADMIN vào được. */
export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { message } = App.useApp();
  const { user, login } = useAdminSession();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const redirect = safeRedirect(params.get('redirect'));

  useEffect(() => {
    document.title = 'Đăng nhập · Quản trị NEXUS PC';
  }, []);

  // Đã đăng nhập (vd mở lại tab) thì vào thẳng trang cần tới
  if (user) return <Navigate to={redirect} replace />;

  const handleFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const session = await login(values.username, values.password, values.remember);
      message.success(`Xin chào ${session.fullName}`);
      navigate(redirect, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đăng nhập được, thử lại sau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex className="admin-login" align="center" justify="center">
      <Flex vertical gap={20} className="admin-login-box">
        <Flex align="center" gap={12} className="admin-login-brand">
          <LogoMark size={40} />
          <div>
            <b>
              NEXUS<span>PC</span>
            </b>
            <small>Trang quản trị</small>
          </div>
        </Flex>

        <Card>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Đăng nhập
          </Typography.Title>
          <Typography.Paragraph type="secondary">Dành cho nhân viên và quản trị viên cửa hàng.</Typography.Paragraph>

          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

          <Form<LoginFormValues>
            layout="vertical"
            requiredMark={false}
            initialValues={{ remember: true }}
            onFinish={handleFinish}
            onValuesChange={() => error && setError(undefined)}
          >
            <Form.Item
              name="username"
              label="Tên đăng nhập hoặc email"
              rules={[{ required: true, whitespace: true, message: 'Nhập tên đăng nhập' }]}
            >
              <Input prefix={<UserOutlined />} autoComplete="username" autoFocus size="large" />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>Ghi nhớ đăng nhập trên máy này</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              Đăng nhập
            </Button>
          </Form>
        </Card>

        <Alert
          type="info"
          showIcon
          title="Đang dùng dữ liệu giả"
          description="Đăng nhập bằng admin1 (quản trị) hoặc staff1 (nhân viên), mật khẩu bất kỳ từ 6 ký tự. Tài khoản khách hàng sẽ bị từ chối."
        />

        <Link to="/" className="admin-login-back">
          <ArrowLeftOutlined /> Về trang khách hàng
        </Link>
      </Flex>
    </Flex>
  );
};
