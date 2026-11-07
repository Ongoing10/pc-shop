import React, { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { LockOutlined, PlusOutlined, UnlockOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { fakeLatency, useAdminData } from '../../../context/AdminDataContext';
import { useAdminUser } from '../../../context/AdminSessionContext';
import { AdminUser, Permission, RealmRole } from '../../../types/admin';
import { PERMISSION_LABEL, ROLE_LABEL } from '../../../utils/adminStatus';
import { formatDate } from '../../../utils/orderStatus';

const ROLES: RealmRole[] = ['ADMIN', 'STAFF', 'CUSTOMER'];
const PERMISSIONS = Object.keys(PERMISSION_LABEL) as Permission[];
const ROLE_COLOR: Record<RealmRole, string> = { ADMIN: 'volcano', STAFF: 'blue', CUSTOMER: 'default' };

interface CreateStaffValues {
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
  temporaryPassword: boolean;
  realmRoles: RealmRole[];
  permissions: Permission[];
}

/** A09: tài khoản Keycloak, ma trận role/permission, khóa/mở */
export const UsersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const me = useAdminUser();
  const {
    users: [users, setUsers],
  } = useAdminData();
  const [keyword, setKeyword] = useState('');
  const [openId, setOpenId] = useState<string>();
  const [roles, setRoles] = useState<RealmRole[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [roleError, setRoleError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateStaffValues>();

  // TODO ghép API: GET /admin/users?keyword=&page=&size=
  const data = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return users.filter(
      (u) => !k || u.username.includes(k) || u.fullName.toLowerCase().includes(k) || (u.email ?? '').toLowerCase().includes(k)
    );
  }, [users, keyword]);

  // TODO ghép API: GET /admin/users/{id}
  const current = users.find((u) => u.id === openId);

  const openUser = (u: AdminUser) => {
    setOpenId(u.id);
    setRoles(u.realmRoles);
    setPerms(u.permissions);
    setRoleError(undefined);
  };

  const saveRoles = async () => {
    if (!current) return;
    if (current.id === me.id && current.realmRoles.includes('ADMIN') && !roles.includes('ADMIN')) {
      setRoleError('Không thể tự gỡ quyền ADMIN của chính mình (400).');
      return;
    }
    setSaving(true);
    // TODO ghép API: PUT /admin/users/{id}/roles {realmRoles, permissions} (danh sách đầy đủ, thay thế)
    await fakeLatency();
    setUsers((prev) => prev.map((u) => (u.id === current.id ? { ...u, realmRoles: roles, permissions: perms } : u)));
    setSaving(false);
    setRoleError(undefined);
    message.success(`Đã cập nhật quyền của ${current.username}`);
  };

  const toggleLock = (u: AdminUser) => {
    const locking = u.active;
    modal.confirm({
      title: locking ? `Khóa tài khoản ${u.username}?` : `Mở khóa tài khoản ${u.username}?`,
      content: locking ? 'Người dùng sẽ không đăng nhập được cho đến khi được mở lại.' : undefined,
      okText: locking ? 'Khóa' : 'Mở khóa',
      okButtonProps: { danger: locking },
      cancelText: 'Hủy',
      onOk: async () => {
        // TODO ghép API: PUT /admin/users/{id}/lock | /unlock
        await fakeLatency();
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !locking } : x)));
        message.success(locking ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      },
    });
  };

  const createStaff = async () => {
    const v = await createForm.validateFields();
    setSaving(true);
    // TODO ghép API: POST /admin/users; username/email trùng → 409
    await fakeLatency();
    setSaving(false);
    if (users.some((u) => u.username === v.username)) {
      createForm.setFields([{ name: 'username', errors: ['Tên đăng nhập đã tồn tại (409)'] }]);
      return;
    }
    if (users.some((u) => u.email === v.email)) {
      createForm.setFields([{ name: 'email', errors: ['Email đã được dùng (409)'] }]);
      return;
    }
    setUsers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        username: v.username,
        email: v.email,
        fullName: [v.firstName, v.lastName].filter(Boolean).join(' '),
        active: true,
        phoneNumber: null,
        createdTimestamp: Date.now(),
        realmRoles: v.realmRoles,
        permissions: v.permissions,
      },
    ]);
    setCreateOpen(false);
    message.success(`Đã tạo tài khoản ${v.username}`);
  };

  const columns: TableColumnsType<AdminUser> = [
    {
      title: 'Tài khoản',
      dataIndex: 'username',
      render: (username: string, u) => (
        <Flex gap={10} align="center">
          <Avatar size={32}>{u.fullName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}</Avatar>
          <div>
            <div className="admin-cell-title">{u.fullName}</div>
            <Typography.Text type="secondary">@{username}</Typography.Text>
          </div>
        </Flex>
      ),
    },
    { title: 'Email', dataIndex: 'email', render: (v: string | null) => v ?? '–' },
    { title: 'SĐT', dataIndex: 'phoneNumber', width: 120, render: (v: string | null) => v ?? '–' },
    {
      title: 'Vai trò',
      dataIndex: 'realmRoles',
      width: 190,
      render: (r: RealmRole[]) =>
        r.length ? (
          <Flex gap={4} wrap>
            {r.map((x) => (
              <Tag key={x} color={ROLE_COLOR[x]}>
                {ROLE_LABEL[x]}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">Khách tự đăng ký</Typography.Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      width: 120,
      render: (a: boolean) => <Badge status={a ? 'success' : 'error'} text={a ? 'Hoạt động' : 'Đã khóa'} />,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, u) => (
        <Button
          size="small"
          type="text"
          danger={u.active}
          icon={u.active ? <LockOutlined /> : <UnlockOutlined />}
          disabled={u.id === me.id}
          onClick={(e) => {
            e.stopPropagation();
            toggleLock(u);
          }}
        >
          {u.active ? 'Khóa' : 'Mở khóa'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Người dùng & phân quyền"
        subtitle="Tài khoản lưu trong Keycloak; bấm một dòng để sửa vai trò và quyền"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.resetFields();
              setCreateOpen(true);
            }}
          >
            Tạo tài khoản nhân viên
          </Button>
        }
      />

      <Card>
        <Flex className="admin-filters">
          <Input.Search
            allowClear
            placeholder="Tên đăng nhập, họ tên hoặc email"
            style={{ width: 320 }}
            onSearch={setKeyword}
            onChange={(e) => !e.target.value && setKeyword('')}
          />
        </Flex>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          onRow={(u) => ({ onClick: () => openUser(u), style: { cursor: 'pointer' } })}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} tài khoản` }}
        />
      </Card>

      <Drawer
        open={!!current}
        size={520}
        title={current ? `${current.fullName} (@${current.username})` : ''}
        onClose={() => setOpenId(undefined)}
        extra={
          <Button type="primary" loading={saving} onClick={saveRoles}>
            Lưu quyền
          </Button>
        }
      >
        {current && (
          <>
            <Descriptions
              size="small"
              column={1}
              items={[
                { key: 'id', label: 'ID (sub)', children: <span className="admin-mono">{current.id}</span> },
                { key: 'email', label: 'Email', children: current.email ?? '–' },
                { key: 'phone', label: 'SĐT', children: current.phoneNumber ?? '–' },
                { key: 'created', label: 'Ngày tạo', children: current.createdTimestamp ? formatDate(new Date(current.createdTimestamp).toISOString()) : '–' },
                {
                  key: 'active',
                  label: 'Trạng thái',
                  children: <Badge status={current.active ? 'success' : 'error'} text={current.active ? 'Hoạt động' : 'Đã khóa'} />,
                },
              ]}
            />

            <Divider titlePlacement="start">Vai trò (realm role)</Divider>
            <Checkbox.Group
              value={roles}
              onChange={(v) => setRoles(v as RealmRole[])}
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />

            <Divider titlePlacement="start">Quyền thao tác (permission)</Divider>
            <Checkbox.Group value={perms} onChange={(v) => setPerms(v as Permission[])} style={{ width: '100%' }}>
              <Flex vertical gap={10}>
                {PERMISSIONS.map((p) => (
                  <Checkbox key={p} value={p}>
                    <span className="admin-mono">{p}</span>
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {PERMISSION_LABEL[p]}
                    </Typography.Text>
                  </Checkbox>
                ))}
              </Flex>
            </Checkbox.Group>

            {!roles.includes('STAFF') && !roles.includes('ADMIN') && perms.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
                title="Tài khoản không có vai trò Nhân viên/Quản trị nên không vào được trang quản trị dù có quyền thao tác."
              />
            )}
            {roleError && <Alert type="error" showIcon style={{ marginTop: 16 }} title={roleError} />}
          </>
        )}
      </Drawer>

      <Modal
        open={createOpen}
        title="Tạo tài khoản nhân viên"
        width={640}
        okText="Tạo tài khoản"
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={createStaff}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ temporaryPassword: true, realmRoles: ['STAFF'], permissions: [] }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Tên đăng nhập"
                rules={[
                  { required: true, message: 'Nhập tên đăng nhập' },
                  { pattern: /^[a-z0-9._-]{3,50}$/, message: '3–50 ký tự thường: a-z, 0-9, . _ -' },
                ]}
              >
                <Input placeholder="vd staff2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Họ">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="firstName" label="Tên" rules={[{ required: true, whitespace: true, message: 'Nhập tên' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[
                  { required: true, message: 'Nhập mật khẩu' },
                  { min: 6, max: 100, message: '6–100 ký tự' },
                ]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="temporaryPassword" valuePropName="checked" label=" ">
                <Checkbox>Bắt đổi mật khẩu khi đăng nhập lần đầu</Checkbox>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="realmRoles"
                label="Vai trò"
                rules={[
                  {
                    validator: (_, v: RealmRole[]) =>
                      v?.includes('STAFF') || v?.includes('ADMIN')
                        ? Promise.resolve()
                        : Promise.reject(new Error('Tài khoản nhân viên cần vai trò Nhân viên hoặc Quản trị')),
                  },
                ]}
              >
                <Checkbox.Group options={(['STAFF', 'ADMIN'] as RealmRole[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="permissions" label="Quyền thao tác">
                <Checkbox.Group options={PERMISSIONS.map((p) => ({ value: p, label: PERMISSION_LABEL[p] }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
