import { Button, Form, Input, Modal, Select, Space, Table, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { accountApi } from '../../api/accountApi'
import { useAuth } from '../../auth/useAuth'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { AccountDetails, CreateAccount } from '../../types/accounts'
import type { Role } from '../../types/auth'
import { roleLabels, statusLabel } from '../../utils/labels'
import { filterAccounts } from '../../utils/accountFilters'

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }))
export default function AccountsPage() {
  const { account } = useAuth()
  const cache = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role>()
  const [statusFilter, setStatusFilter] = useState<AccountDetails['status']>()
  const [page, setPage] = useState(1)
  const [form] = Form.useForm<CreateAccount>()
  const query = useQuery({ queryKey: ['accounts'], queryFn: ({ signal }) => accountApi.list(signal) })
  const { report, message } = useApiFeedback(query.error)
  const refresh = () => cache.invalidateQueries({ queryKey: ['accounts'] })
  const create = useMutation({ mutationFn: accountApi.create, onSuccess: async () => {
    setOpen(false); form.resetFields(); void message.success('Đã tạo tài khoản'); await refresh()
  }, onError: (error) => report(error, form) })
  const change = useMutation({ mutationFn: (action: { id: number; type: 'lock' | 'unlock' | 'role'; role?: Role }) =>
    action.type === 'role' ? accountApi.role(action.id, action.role!) : accountApi[action.type](action.id),
  onSuccess: async () => { void message.success('Đã cập nhật tài khoản'); await refresh() }, onError: (error) => report(error) })
  const filtered = filterAccounts(query.data ?? [], search, roleFilter, statusFilter)

  return <section>
    <div className="page-heading"><div><Typography.Title level={1}>Tài khoản</Typography.Title>
      <Typography.Paragraph>Quản lý quyền truy cập của nhân viên.</Typography.Paragraph></div>
      <Button type="primary" size="large" onClick={() => setOpen(true)}>Tạo tài khoản</Button></div>
    <div className="account-filters">
      <div className="account-search"><label htmlFor="account-search">Tên hoặc số điện thoại</label>
        <Input.Search id="account-search" placeholder="Ví dụ: Minh, phuc vu, 0900000004" allowClear enterButton="Tìm kiếm"
          value={searchInput} onChange={(event) => { setSearchInput(event.target.value); if (!event.target.value) { setSearch(''); setPage(1) } }}
          onSearch={(value) => { setSearch(value.trim()); setPage(1) }} />
      </div>
      <div><label htmlFor="account-role-filter">Vai trò</label><Select id="account-role-filter" value={roleFilter} allowClear placeholder="Tất cả vai trò"
        options={roleOptions} onChange={(value: Role | undefined) => { setRoleFilter(value); setPage(1) }} /></div>
      <div><label htmlFor="account-status-filter">Trạng thái</label><Select id="account-status-filter" value={statusFilter} allowClear placeholder="Tất cả trạng thái"
        options={(['ACTIVE', 'LOCKED'] as const).map((value) => ({ value, label: statusLabel('AccountStatus', value) }))}
        onChange={(value: AccountDetails['status'] | undefined) => { setStatusFilter(value); setPage(1) }} /></div>
      <Button onClick={() => { setSearchInput(''); setSearch(''); setRoleFilter(undefined); setStatusFilter(undefined); setPage(1) }}>Đặt lại</Button>
    </div>
    <Typography.Paragraph type="secondary" role="status">Tìm thấy {filtered.length} / {query.data?.length ?? 0} tài khoản</Typography.Paragraph>
    <div className="data-panel"><Table<AccountDetails> rowKey="id" loading={query.isPending} dataSource={filtered} scroll={{ x: 760 }}
      locale={{ emptyText: 'Không tìm thấy tài khoản. Thử tên/SĐT khác hoặc đặt lại bộ lọc.' }}
      pagination={{ current: Math.min(page, Math.max(1, Math.ceil(filtered.length / 20))), pageSize: 20, hideOnSinglePage: true, onChange: setPage }} columns={[
        { title: 'Họ tên', dataIndex: 'fullName', render: (name, row) => <strong>{name}{row.id === account?.accountId ? ' (Bạn)' : ''}</strong> },
        { title: 'Số điện thoại', dataIndex: 'phone' },
        { title: 'Vai trò', render: (_, row) => <Select aria-label={`Vai trò ${row.fullName}`} value={row.role} options={roleOptions}
          style={{ minWidth: 170 }} disabled={row.id === account?.accountId || change.isPending}
          onChange={(role: Role) => change.mutate({ id: row.id, type: 'role', role })} /> },
        { title: 'Trạng thái', render: (_, row) => <StatusTag group="AccountStatus" value={row.status} /> },
        { title: 'Thao tác', render: (_, row) => <Button disabled={row.id === account?.accountId || change.isPending}
          onClick={() => change.mutate({ id: row.id, type: row.status === 'ACTIVE' ? 'lock' : 'unlock' })}>
          {row.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</Button> },
      ]} /></div>
    <Typography.Paragraph className="page-note">Khóa hoặc đổi vai trò áp dụng cho lần đăng nhập mới. Phiên đã cấp giữ quyền đến khi hết hạn, tối đa 12 giờ.</Typography.Paragraph>
    <Modal title="Tạo tài khoản" open={open} onCancel={() => setOpen(false)} footer={null} maskClosable={!create.isPending} closable={!create.isPending}>
      <Form form={form} layout="vertical" initialValues={{ role: 'WAITER' }} onFinish={(values) => create.mutate(values)} disabled={create.isPending}>
        <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên' }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }, { pattern: /^0\d{9}$/, message: 'Nhập 10 chữ số, bắt đầu bằng 0' }]}><Input type="tel" maxLength={15} /></Form.Item>
        <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, max: 72, message: 'Mật khẩu từ 6 đến 72 ký tự' },
          { validator: (_, value: string) => !value || new TextEncoder().encode(value).length <= 72 ? Promise.resolve() : Promise.reject(new Error('Mật khẩu không vượt quá 72 byte UTF-8')) }]}><Input.Password autoComplete="new-password" /></Form.Item>
        <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}><Select options={roleOptions} /></Form.Item>
        <Space className="form-actions"><Button onClick={() => setOpen(false)}>Hủy</Button><Button type="primary" htmlType="submit" loading={create.isPending}>Tạo tài khoản</Button></Space>
      </Form>
    </Modal>
  </section>
}
