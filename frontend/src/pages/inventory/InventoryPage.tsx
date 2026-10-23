import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import { inventoryApi } from '../../api/inventoryApi'
import { StatusTag } from '../../components/StatusTag'
import { useAuth } from '../../auth/useAuth'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type {
  CreateIngredientPayload,
  CreateStockDisposalPayload,
  Ingredient,
  IngredientLotAttention,
  IngredientStatus,
  MovementType,
  StockMovement,
  UpdateIngredientPayload,
} from '../../types/inventory'
import { formatTime, toInstant } from '../../utils/time'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function InventoryPage() {
  const { account } = useAuth()
  const isOwner = account?.role === 'OWNER'
  const isHeadChef = account?.role === 'HEAD_CHEF'

  return (
    <div className="inventory-page" style={{ padding: 24 }}>
      <Card title={<Title level={4} style={{ margin: 0 }}>Quản lý kho nguyên vật liệu</Title>}>
        <Tabs
          defaultActiveKey="stock"
          items={[
            {
              key: 'stock',
              label: 'Tồn kho nguyên vật liệu',
              children: <StockTab isOwner={isOwner} isHeadChef={isHeadChef} />,
            },
            {
              key: 'lots',
              label: 'Lô cần chú ý',
              children: <LotsTab />,
            },
            {
              key: 'movements',
              label: 'Lịch sử biến động kho',
              children: <MovementsTab />,
            },
          ]}
        />
      </Card>
    </div>
  )
}

function StockTab({ isOwner, isHeadChef }: { isOwner: boolean; isHeadChef: boolean }) {
  const queryClient = useQueryClient()
  const { report, message } = useApiFeedback()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<IngredientStatus | undefined>(undefined)
  const [belowMinStockOnly, setBelowMinStockOnly] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editIngredient, setEditIngredient] = useState<Ingredient | null>(null)
  const [disposalIngredient, setDisposalIngredient] = useState<Ingredient | null>(null)

  const [createForm] = Form.useForm<CreateIngredientPayload>()
  const [editForm] = Form.useForm<UpdateIngredientPayload>()
  const [disposalForm] = Form.useForm<CreateStockDisposalPayload>()

  const {
    data: ingredients = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inventory', 'ingredients', { q, status, belowMinStockOnly }],
    queryFn: ({ signal }) =>
      inventoryApi.listIngredients({ q: q || undefined, status, belowMinStockOnly }, signal),
  })

  useApiFeedback(error)

  const createMutation = useMutation({
    mutationFn: (payload: CreateIngredientPayload) => inventoryApi.createIngredient(payload),
    onSuccess: (ing) => {
      void message.success(`Đã thêm nguyên vật liệu ${ing.name}`)
      setCreateModalOpen(false)
      createForm.resetFields()
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => report(err, createForm),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateIngredientPayload }) =>
      inventoryApi.updateIngredient(id, payload),
    onSuccess: (ing) => {
      void message.success(`Đã cập nhật nguyên vật liệu ${ing.name}`)
      setEditIngredient(null)
      editForm.resetFields()
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => report(err, editForm),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? inventoryApi.activateIngredient(id) : inventoryApi.deactivateIngredient(id),
    onSuccess: (ing) => {
      void message.success(
        `Đã ${ing.status === 'ACTIVE' ? 'kích hoạt' : 'ngừng sử dụng'} nguyên vật liệu ${ing.name}`
      )
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => report(err),
  })

  const disposalMutation = useMutation({
    mutationFn: (payload: CreateStockDisposalPayload) => inventoryApi.createDisposal(payload),
    onSuccess: () => {
      void message.success('Xuất hủy nguyên vật liệu thành công')
      setDisposalIngredient(null)
      disposalForm.resetFields()
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => report(err, disposalForm),
  })

  const columns: ColumnsType<Ingredient> = [
    {
      title: 'Tên nguyên vật liệu',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <Text strong>{name}</Text>
          {record.belowMinStock && <Tag color="orange">Tồn thấp</Tag>}
        </Space>
      ),
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      align: 'center',
    },
    {
      title: 'Tồn kho hiện tại',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 140,
      align: 'right',
      render: (stock: number, record) => (
        <span
          style={{
            color: stock < 0 ? '#cf1322' : record.belowMinStock ? '#d46b08' : '#389e0d',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {Number(stock).toFixed(3)}
        </span>
      ),
    },
    {
      title: 'Tồn tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      width: 120,
      align: 'right',
      render: (min: number) => Number(min).toFixed(3),
    },
    {
      title: 'Theo dõi',
      key: 'tracking',
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          {record.trackLot && <Tag color="blue">Lô</Tag>}
          {record.trackExpiry && <Tag color="cyan">HSD</Tag>}
          {!record.trackLot && !record.trackExpiry && <Text type="secondary">—</Text>}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (st: string) => <StatusTag group="IngredientStatus" value={st} />,
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 200,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          {isHeadChef && (
            <Button
              size="small"
              danger
              disabled={record.currentStock <= 0}
              onClick={() => {
                setDisposalIngredient(record)
                disposalForm.setFieldsValue({
                  ingredientId: record.id,
                  quantity: 1,
                  reason: '',
                })
              }}
            >
              Xuất hủy
            </Button>
          )}

          {isOwner && (
            <>
              <Button
                size="small"
                onClick={() => {
                  setEditIngredient(record)
                  editForm.setFieldsValue({
                    name: record.name,
                    unit: record.unit,
                    minStock: record.minStock,
                    trackLot: record.trackLot,
                    trackExpiry: record.trackExpiry,
                  })
                }}
              >
                Sửa
              </Button>
              <Popconfirm
                title={
                  record.status === 'ACTIVE'
                    ? 'Ngừng sử dụng nguyên vật liệu này?'
                    : 'Kích hoạt lại nguyên vật liệu này?'
                }
                onConfirm={() =>
                  toggleStatusMutation.mutate({
                    id: record.id,
                    active: record.status !== 'ACTIVE',
                  })
                }
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button size="small" type="link">
                  {record.status === 'ACTIVE' ? 'Ngừng dùng' : 'Kích hoạt'}
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space wrap>
          <Input.Search
            placeholder="Tìm theo tên nguyên vật liệu..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 150 }}
            value={status}
            onChange={setStatus}
            options={[
              { label: 'Tất cả trạng thái', value: undefined },
              { label: 'Đang sử dụng', value: 'ACTIVE' },
              { label: 'Ngừng sử dụng', value: 'INACTIVE' },
            ]}
          />
          <Checkbox
            checked={belowMinStockOnly}
            onChange={(e) => setBelowMinStockOnly(e.target.checked)}
          >
            Chỉ hiện tồn dưới mức tối thiểu
          </Checkbox>
        </Space>

        {isOwner && (
          <Button
            type="primary"
            onClick={() => {
              createForm.resetFields()
              createForm.setFieldsValue({
                minStock: 0,
                trackLot: false,
                trackExpiry: false,
              })
              setCreateModalOpen(true)
            }}
          >
            + Thêm nguyên vật liệu
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={ingredients}
        loading={isLoading}
        pagination={{ pageSize: 15 }}
      />

      {/* Modal Thêm nguyên vật liệu (OWNER) */}
      <Modal
        title="Thêm nguyên vật liệu mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label="Tên nguyên vật liệu"
            rules={[{ required: true, message: 'Vui lòng nhập tên nguyên vật liệu' }]}
          >
            <Input placeholder="Ví dụ: Thịt bò, Trứng gà, v.v." maxLength={100} />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Đơn vị tính"
            rules={[{ required: true, message: 'Vui lòng nhập đơn vị tính' }]}
          >
            <Input placeholder="Ví dụ: kg, quả, hộp, lít" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="minStock"
            label="Mức tồn kho tối thiểu"
            rules={[{ required: true, message: 'Vui lòng nhập mức tồn tối thiểu' }]}
          >
            <InputNumber min={0} precision={3} style={{ width: '100%' }} />
          </Form.Item>

          <Space size="large" style={{ marginTop: 8 }}>
            <Form.Item
              name="trackLot"
              valuePropName="checked"
              label="Theo dõi theo số lô"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="trackExpiry"
              valuePropName="checked"
              label="Theo dõi hạn sử dụng"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal Sửa nguyên vật liệu (OWNER, D12) */}
      <Modal
        title={editIngredient ? `Sửa nguyên vật liệu: ${editIngredient.name}` : 'Sửa'}
        open={editIngredient != null}
        onCancel={() => setEditIngredient(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        destroyOnClose
      >
        <Alert
          type="info"
          message="Lưu ý quy tắc D12"
          description="Không được thay đổi đơn vị tính nếu nguyên vật liệu này đã có bất kỳ biến động kho nào."
          style={{ marginBottom: 16 }}
        />
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) =>
            editIngredient && updateMutation.mutate({ id: editIngredient.id, payload: values })
          }
        >
          <Form.Item
            name="name"
            label="Tên nguyên vật liệu"
            rules={[{ required: true, message: 'Vui lòng nhập tên nguyên vật liệu' }]}
          >
            <Input maxLength={100} />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Đơn vị tính"
            rules={[{ required: true, message: 'Vui lòng nhập đơn vị tính' }]}
          >
            <Input maxLength={20} />
          </Form.Item>

          <Form.Item
            name="minStock"
            label="Mức tồn kho tối thiểu"
            rules={[{ required: true, message: 'Vui lòng nhập mức tồn tối thiểu' }]}
          >
            <InputNumber min={0} precision={3} style={{ width: '100%' }} />
          </Form.Item>

          <Space size="large" style={{ marginTop: 8 }}>
            <Form.Item
              name="trackLot"
              valuePropName="checked"
              label="Theo dõi theo số lô"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="trackExpiry"
              valuePropName="checked"
              label="Theo dõi hạn sử dụng"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal Xuất hủy (HEAD_CHEF) */}
      <Modal
        title={disposalIngredient ? `Xuất hủy: ${disposalIngredient.name}` : 'Xuất hủy'}
        open={disposalIngredient != null}
        onCancel={() => setDisposalIngredient(null)}
        footer={null}
        destroyOnClose
      >
        {disposalIngredient && (
          <Form
            form={disposalForm}
            layout="vertical"
            onFinish={(values) => disposalMutation.mutate(values)}
          >
            <Form.Item name="ingredientId" hidden>
              <Input />
            </Form.Item>

            <Alert
              type="warning"
              showIcon
              message={
                <div>
                  Tồn kho hiện tại: <strong>{Number(disposalIngredient.currentStock).toFixed(3)} {disposalIngredient.unit}</strong>
                </div>
              }
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="quantity"
              label={`Số lượng xuất hủy (${disposalIngredient.unit})`}
              rules={[
                { required: true, message: 'Vui lòng nhập số lượng xuất hủy' },
                {
                  type: 'number',
                  min: 0.001,
                  max: Number(disposalIngredient.currentStock),
                  message: `Số lượng phải lớn hơn 0 và nhỏ hơn hoặc bằng tồn kho (${disposalIngredient.currentStock})`,
                },
              ]}
            >
              <InputNumber
                precision={3}
                step={0.1}
                min={0.001}
                max={Number(disposalIngredient.currentStock)}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="reason"
              label="Lý do xuất hủy"
              rules={[{ required: true, message: 'Vui lòng nhập lý do xuất hủy' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Ví dụ: Hư hỏng, ôi thiu, hết hạn sử dụng, v.v."
                maxLength={500}
                showCount
              />
            </Form.Item>

            <div style={{ textAlign: 'right', marginTop: 24 }}>
              <Space>
                <Button onClick={() => setDisposalIngredient(null)}>Hủy</Button>
                <Popconfirm
                  title="Xác nhận xuất hủy"
                  description="Bạn có chắc chắn muốn xuất hủy số lượng nguyên vật liệu này không? Thao tác này sẽ ghi nhận biến động giảm tồn kho ngay lập tức."
                  onConfirm={() => disposalForm.submit()}
                  okText="Xác nhận xuất hủy"
                  cancelText="Bỏ qua"
                  okButtonProps={{ danger: true, loading: disposalMutation.isPending }}
                >
                  <Button danger type="primary" loading={disposalMutation.isPending}>
                    Xác nhận xuất hủy
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  )
}

function LotsTab() {
  const [days, setDays] = useState<number>(7)

  const {
    data: lots = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inventory', 'lots-attention', days],
    queryFn: ({ signal }) => inventoryApi.listAttentionLots(days, signal),
  })

  useApiFeedback(error)

  const columns: ColumnsType<IngredientLotAttention> = [
    {
      title: 'Nguyên vật liệu',
      dataIndex: 'ingredientName',
      key: 'ingredientName',
      render: (name: string, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>ĐVT: {record.unit}</Text>
        </Space>
      ),
    },
    {
      title: 'Số lô',
      dataIndex: 'lotNumber',
      key: 'lotNumber',
      render: (num?: string) => num || <Text type="secondary">Không có</Text>,
    },
    {
      title: 'Hạn sử dụng',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
    },
    {
      title: 'Số lượng nhập ban đầu',
      dataIndex: 'initialQuantity',
      key: 'initialQuantity',
      align: 'right',
      render: (qty: number, record) => (
        <span>
          {Number(qty).toFixed(3)} {record.unit}
        </span>
      ),
    },
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        if (record.status === 'EXPIRED') {
          return <Tag color="red">Đã hết hạn</Tag>
        }
        return (
          <Tag color="orange">
            Còn {record.daysRemaining} ngày
          </Tag>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Text>Số ngày cảnh báo trước hạn:</Text>
        <InputNumber min={0} max={90} value={days} onChange={(val) => setDays(val ?? 7)} />
        <Text type="secondary">(Mặc định 7 ngày hoặc theo cấu hình hệ thống)</Text>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={lots}
        loading={isLoading}
        pagination={{ pageSize: 15 }}
      />
    </div>
  )
}

function MovementsTab() {
  const [ingredientId, setIngredientId] = useState<number | undefined>(undefined)
  const [movementType, setMovementType] = useState<MovementType | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [page, setPage] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(20)

  const fromInstant = dateRange?.[0] ? toInstant(dateRange[0].startOf('day')) : undefined
  const toInstantVal = dateRange?.[1] ? toInstant(dateRange[1].endOf('day')) : undefined

  const { data: ingredients = [] } = useQuery({
    queryKey: ['inventory', 'ingredients-lookup'],
    queryFn: ({ signal }) => inventoryApi.listIngredients(undefined, signal),
  })

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'inventory',
      'movements',
      { ingredientId, movementType, from: fromInstant, to: toInstantVal, page, pageSize },
    ],
    queryFn: ({ signal }) =>
      inventoryApi.listMovements(
        {
          ingredientId,
          movementType,
          from: fromInstant,
          to: toInstantVal,
          page,
          size: pageSize,
        },
        signal
      ),
  })

  useApiFeedback(error)

  const columns: ColumnsType<StockMovement> = [
    {
      title: 'Thời gian',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 150,
      render: (t: string) => formatTime(t),
    },
    {
      title: 'Nguyên vật liệu',
      dataIndex: 'ingredientName',
      key: 'ingredientName',
      render: (name: string, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.lotNumber && (
            <Text type="secondary" style={{ fontSize: 12 }}>Lô: {record.lotNumber}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Loại biến động',
      dataIndex: 'movementType',
      key: 'movementType',
      width: 150,
      render: (type: string) => <StatusTag group="MovementType" value={type} />,
    },
    {
      title: 'Thay đổi số lượng',
      dataIndex: 'quantityChange',
      key: 'quantityChange',
      width: 150,
      align: 'right',
      render: (change: number, record) => {
        const isPositive = Number(change) > 0
        return (
          <span
            style={{
              color: isPositive ? '#389e0d' : '#cf1322',
              fontWeight: 600,
            }}
          >
            {isPositive ? `+${Number(change).toFixed(3)}` : Number(change).toFixed(3)}{' '}
            {record.unit}
          </span>
        )
      },
    },
    {
      title: 'Nguồn / Lý do',
      key: 'sourceReason',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.source}</Text>
          {record.reason && <Text type="secondary" style={{ fontSize: 12 }}>{record.reason}</Text>}
        </Space>
      ),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'performedByName',
      key: 'performedByName',
      width: 150,
    },
  ]

  return (
    <div>
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="Nguyên vật liệu">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả NVL"
            style={{ width: 200 }}
            value={ingredientId}
            onChange={(val) => {
              setIngredientId(val)
              setPage(0)
            }}
            options={ingredients.map((i) => ({ label: i.name, value: i.id }))}
          />
        </Form.Item>

        <Form.Item label="Loại biến động">
          <Select
            allowClear
            placeholder="Tất cả loại"
            style={{ width: 180 }}
            value={movementType}
            onChange={(val) => {
              setMovementType(val)
              setPage(0)
            }}
            options={[
              { label: 'Tất cả loại', value: undefined },
              { label: 'Nhập kho', value: 'RECEIPT' },
              { label: 'Tiêu hao chế biến', value: 'CONSUMPTION' },
              { label: 'Điều chỉnh kiểm kê', value: 'STOCKTAKE_ADJUSTMENT' },
              { label: 'Xuất hủy', value: 'DISPOSAL' },
            ]}
          />
        </Form.Item>

        <Form.Item label="Thời gian">
          <RangePicker
            value={dateRange}
            onChange={(val) => {
              setDateRange(val)
              setPage(0)
            }}
            placeholder={['Từ ngày', 'Đến ngày']}
            format="DD/MM/YYYY"
          />
        </Form.Item>

        <Form.Item>
          <Button
            onClick={() => {
              setIngredientId(undefined)
              setMovementType(undefined)
              setDateRange(null)
              setPage(0)
            }}
          >
            Đặt lại
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page + 1,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `Tổng số ${total} biến động`,
          onChange: (p, s) => {
            setPage(p - 1)
            setPageSize(s)
          },
        }}
      />
    </div>
  )
}
