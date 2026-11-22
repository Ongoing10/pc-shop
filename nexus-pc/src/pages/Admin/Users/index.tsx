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
import { useAdminUsers, useCreateStaff, useSetUserLocked, useSetUserRoles } from '../../../hooks/admin/useAdminApi';
import { ApiError } from '../../../services/api/ApiError';
import { useAdminUser } from '../../../context/AdminSessionContext';
import { AdminUser, Permission, RealmRole } from '../../../types/admin';
import { PERMISSION_LABEL, ROLE_LABEL } from '../../../utils/adminStatus';
import { formatDate } from '../../../utils/orderStatus';
import { t } from '../../../i18n/t';

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
  const { data: users = [], isLoading } = useAdminUsers();
  const createStaffAccount = useCreateStaff();
  const setUserRoles = useSetUserRoles();
  const setUserLocked = useSetUserLocked();
  const [keyword, setKeyword] = useState('');
  const [openId, setOpenId] = useState<string>();
  const [roles, setRoles] = useState<RealmRole[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [roleError, setRoleError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateStaffValues>();

  const data = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return users.filter(
      (u) => !k || u.username.includes(k) || u.fullName.toLowerCase().includes(k) || (u.email ?? '').toLowerCase().includes(k)
    );
  }, [users, keyword]);

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
      setRoleError(t('admin.users.youCannotRemoveYourOwn', 'Không thể tự gỡ quyền ADMIN của chính mình (400).'));
      return;
    }
    setSaving(true);
    try {
      // danh sách đầy đủ, thay thế (không cộng thêm)
      await setUserRoles.mutateAsync({ id: current.id, body: { realmRoles: roles, permissions: perms } });
      setRoleError(undefined);
      message.success(t('admin.users.updatedPermissionsOf', 'Đã cập nhật quyền của {{username}}', { username: current.username }));
    } catch (e) {
      setRoleError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = (u: AdminUser) => {
    const locking = u.active;
    modal.confirm({
      centered: true,
      title: locking ? t('admin.users.lockAccount', 'Khóa tài khoản {{username}}?', { username: u.username }) : t('admin.users.unlockAccount', 'Mở khóa tài khoản {{username}}?', { username: u.username }),
      content: locking ? t('admin.users.theUserWillNotBe', 'Người dùng sẽ không đăng nhập được cho đến khi được mở lại.') : undefined,
      okText: locking ? t('admin.common.key', 'Khóa') : t('admin.users.unlock', 'Mở khóa'),
      okButtonProps: { danger: locking },
      cancelText: t('admin.common.cancel', 'Hủy'),
      onOk: async () => {
        try {
          await setUserLocked.mutateAsync({ id: u.id, locked: locking });
          message.success(locking ? t('admin.users.accountLocked', 'Đã khóa tài khoản') : t('admin.users.accountUnlocked', 'Đã mở khóa tài khoản'));
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  };

  const createStaff = async () => {
    const v = await createForm.validateFields();
    setSaving(true);
    try {
      await createStaffAccount.mutateAsync({
        username: v.username,
        email: v.email,
        firstName: v.firstName,
        lastName: v.lastName || null,
        password: v.password,
        temporaryPassword: v.temporaryPassword,
        realmRoles: v.realmRoles,
        permissions: v.permissions,
      });
      setCreateOpen(false);
      message.success(t('admin.users.createdAccount', 'Đã tạo tài khoản {{username}}', { username: v.username }));
    } catch (e) {
      const err = e as ApiError;
      // username / email trùng → 409
      if (err.status === 409) createForm.setFields([{ name: /email/i.test(err.message) ? 'email' : 'username', errors: [err.message] }]);
      else message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<AdminUser> = [
    {
      title: t('admin.common.account', 'Tài khoản'),
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
    { title: t('admin.users.phone', 'SĐT'), dataIndex: 'phoneNumber', width: 120, render: (v: string | null) => v ?? '–' },
    {
      title: t('admin.users.role', 'Vai trò'),
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
          <Typography.Text type="secondary">{t('admin.users.selfRegisteredCustomer', 'Khách tự đăng ký')}</Typography.Text>
        ),
    },
    {
      title: t('admin.common.status', 'Trạng thái'),
      dataIndex: 'active',
      width: 120,
      render: (a: boolean) => <Badge status={a ? 'success' : 'error'} text={a ? t('admin.common.active', 'Hoạt động') : t('admin.users.locked', 'Đã khóa')} />,
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
          {u.active ? t('admin.common.key', 'Khóa') : t('admin.users.unlock', 'Mở khóa')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.common.usersPermissions', 'Người dùng & phân quyền')}
        subtitle={t('admin.users.accountsLiveInKeycloakClick', 'Tài khoản lưu trong Keycloak; bấm một dòng để sửa vai trò và quyền')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.resetFields();
              setCreateOpen(true);
            }}
          >
            {t('admin.users.createStaffAccount', 'Tạo tài khoản nhân viên')}
          </Button>
        }
      />

      <Card>
        <Flex className="admin-filters">
          <Input.Search
            allowClear
            placeholder={t('admin.users.usernameFullNameOrEmail', 'Tên đăng nhập, họ tên hoặc email')}
            style={{ width: 320 }}
            onSearch={setKeyword}
            onChange={(e) => !e.target.value && setKeyword('')}
          />
        </Flex>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          onRow={(u) => ({ onClick: () => openUser(u), style: { cursor: 'pointer' } })}
          pagination={{ pageSize: 20, showTotal: (n) => t('admin.users.accounts', '{{count}} tài khoản', { count: n }) }}
        />
      </Card>

      <Drawer
        open={!!current}
        size={520}
        title={current ? `${current.fullName} (@${current.username})` : ''}
        onClose={() => setOpenId(undefined)}
        extra={
          <Button type="primary" loading={saving} onClick={saveRoles}>
            {t('admin.users.savePermissions', 'Lưu quyền')}
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
                { key: 'phone', label: t('admin.users.phone', 'SĐT'), children: current.phoneNumber ?? '–' },
                { key: 'created', label: t('admin.users.createdOn', 'Ngày tạo'), children: current.createdTimestamp ? formatDate(new Date(current.createdTimestamp).toISOString()) : '–' },
                {
                  key: 'active',
                  label: t('admin.common.status', 'Trạng thái'),
                  children: <Badge status={current.active ? 'success' : 'error'} text={current.active ? t('admin.common.active', 'Hoạt động') : t('admin.users.locked', 'Đã khóa')} />,
                },
              ]}
            />

            <Divider titlePlacement="start">{t('admin.users.rolesRealmRole', 'Vai trò (realm role)')}</Divider>
            <Checkbox.Group
              value={roles}
              onChange={(v) => setRoles(v as RealmRole[])}
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />

            <Divider titlePlacement="start">{t('admin.users.permissions', 'Quyền thao tác (permission)')}</Divider>
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
                title={t('admin.users.theAccountHasNoStaff', 'Tài khoản không có vai trò Nhân viên/Quản trị nên không vào được trang quản trị dù có quyền thao tác.')}
              />
            )}
            {roleError && <Alert type="error" showIcon style={{ marginTop: 16 }} title={roleError} />}
          </>
        )}
      </Drawer>

      <Modal
        centered
        open={createOpen}
        title={t('admin.users.createStaffAccount', 'Tạo tài khoản nhân viên')}
        width={640}
        okText={t('admin.users.createAccount', 'Tạo tài khoản')}
        cancelText={t('admin.common.cancel', 'Hủy')}
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
            <Col xs={24} sm={12}>
              <Form.Item
                name="username"
                label={t('admin.users.username', 'Tên đăng nhập')}
                rules={[
                  { required: true, message: t('admin.common.enterAUsername', 'Nhập tên đăng nhập') },
                  { pattern: /^[a-z0-9._-]{3,50}$/, message: t('admin.users.n350LowercaseCharactersA', '3–50 ký tự thường: a-z, 0-9, . _ -') },
                ]}
              >
                <Input placeholder="vd staff2" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: t('admin.users.invalidEmail', 'Email không hợp lệ') }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="lastName" label={t('admin.users.lastName', 'Họ')}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="firstName" label={t('admin.common.name', 'Tên')} rules={[{ required: true, whitespace: true, message: t('admin.common.enterAName', 'Nhập tên') }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label={t('admin.common.password', 'Mật khẩu')}
                rules={[
                  { required: true, message: t('admin.common.enterAPassword', 'Nhập mật khẩu') },
                  { min: 6, max: 100, message: t('admin.users.n6100Characters', '6–100 ký tự') },
                ]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="temporaryPassword" valuePropName="checked" label=" ">
                <Checkbox>{t('admin.users.requireAPasswordChangeOn', 'Bắt đổi mật khẩu khi đăng nhập lần đầu')}</Checkbox>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="realmRoles"
                label={t('admin.users.role', 'Vai trò')}
                rules={[
                  {
                    validator: (_, v: RealmRole[]) =>
                      v?.includes('STAFF') || v?.includes('ADMIN')
                        ? Promise.resolve()
                        : Promise.reject(new Error(t('admin.users.staffAccountsNeedTheStaff', 'Tài khoản nhân viên cần vai trò Nhân viên hoặc Quản trị'))),
                  },
                ]}
              >
                <Checkbox.Group options={(['STAFF', 'ADMIN'] as RealmRole[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="permissions" label={t('admin.users.permissions2', 'Quyền thao tác')}>
                <Checkbox.Group options={PERMISSIONS.map((p) => ({ value: p, label: PERMISSION_LABEL[p] }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};
