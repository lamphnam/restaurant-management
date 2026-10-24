import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { menuApi } from '../../api/menuApi'
import type { MenuFilters } from '../../api/menuApi'
import { useAuth } from '../../auth/useAuth'
import { MoneyText } from '../../components/MoneyText'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { MenuItem, SaveMenuItem } from '../../types/menu'
import { statusLabels } from '../../utils/labels'
import RecipeDrawer from './RecipeDrawer'

export default function MenuPage() {
  const { account } = useAuth()
  const owner = account?.role === 'OWNER'
  const [filters, setFilters] = useState<MenuFilters>({})
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null)
  const [recipe, setRecipe] = useState<MenuItem | null>(null)
  const [form] = Form.useForm<SaveMenuItem>()
  const cache = useQueryClient()
  const query = useQuery({ queryKey: ['menu-items', filters], queryFn: ({ signal }) => menuApi.list(filters, signal) })
  const { report, message } = useApiFeedback(query.error)
  const refresh = () => cache.invalidateQueries({ queryKey: ['menu-items'] })
  const save = useMutation({ mutationFn: (values: SaveMenuItem) => editing && editing !== 'new' ? menuApi.update(editing.id, values) : menuApi.create(values),
    onSuccess: async () => { setEditing(null); void message.success('Đã lưu món ăn'); await refresh() }, onError: (error) => report(error, form) })
  const change = useMutation({ mutationFn: (item: MenuItem) => menuApi.status(item.id, item.status === 'ON_SALE' ? 'DISCONTINUED' : 'ON_SALE'),
    onSuccess: async () => { void message.success('Đã cập nhật trạng thái món'); await refresh() }, onError: (error) => report(error) })
  const edit = (item: MenuItem | 'new') => { form.resetFields(); if (item !== 'new') form.setFieldsValue(item); setEditing(item) }
  return <section>
    <div className="page-heading"><div><Typography.Title level={1}>Thực đơn</Typography.Title><Typography.Paragraph>Danh mục món ăn và nguyên vật liệu cho mỗi phần.</Typography.Paragraph></div>
      {owner && <Button type="primary" size="large" onClick={() => edit('new')}>Thêm món</Button>}</div>
    <div className="filter-bar"><Input.Search aria-label="Tìm món" placeholder="Tìm theo tên món" allowClear onSearch={(q) => setFilters((old) => ({ ...old, q: q || undefined }))} style={{ maxWidth: 340 }} />
      <Select aria-label="Trạng thái món" placeholder="Tất cả trạng thái" allowClear value={filters.status} style={{ minWidth: 200 }}
        options={Object.entries(statusLabels.MenuItemStatus).map(([value, label]) => ({ value, label }))} onChange={(status) => setFilters((old) => ({ ...old, status }))} /></div>
    <div className="data-panel"><Table<MenuItem> rowKey="id" loading={query.isPending} dataSource={query.data ?? []} scroll={{ x: 680 }} pagination={{ pageSize: 20, hideOnSinglePage: true }} columns={[
      { title: 'Món ăn', dataIndex: 'name', render: (name) => <strong>{name}</strong> },
      { title: 'Giá bán', dataIndex: 'price', render: (price) => <MoneyText amount={price} /> },
      { title: 'Trạng thái', render: (_, item) => <StatusTag group="MenuItemStatus" value={item.status} /> },
      { title: 'Thao tác', render: (_, item) => <Space wrap><Button onClick={() => setRecipe(item)}>Định lượng</Button>
        {owner && <><Button onClick={() => edit(item)}>Sửa</Button><Button disabled={change.isPending} onClick={() => change.mutate(item)}>{item.status === 'ON_SALE' ? 'Ngừng kinh doanh' : 'Kinh doanh lại'}</Button></>}</Space> },
    ]} /></div>
    <Modal title={editing === 'new' ? 'Thêm món' : 'Sửa món'} open={editing !== null} onCancel={() => setEditing(null)} footer={null} maskClosable={!save.isPending} closable={!save.isPending}>
      <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)} disabled={save.isPending}>
        <Form.Item name="name" label="Tên món" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên món' }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
        <Form.Item name="price" label="Giá bán (VND)" rules={[{ required: true, message: 'Vui lòng nhập giá bán' }, { type: 'number', min: 0 }]}><InputNumber min={0} max={99999999999999} precision={0} step={1000} style={{ width: '100%' }} /></Form.Item>
        <Space className="form-actions"><Button onClick={() => setEditing(null)}>Hủy</Button><Button type="primary" htmlType="submit" loading={save.isPending}>Lưu món</Button></Space>
      </Form>
    </Modal>
    {recipe && <RecipeDrawer key={recipe.id} item={recipe} onClose={() => setRecipe(null)} />}
  </section>
}
