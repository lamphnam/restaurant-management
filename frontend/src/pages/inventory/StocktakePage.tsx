import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../../api/inventoryApi'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type {
  CreateStocktakePayload,
  Stocktake,
  StocktakeItem,
} from '../../types/inventory'
import { formatTime } from '../../utils/time'

const { Title, Text } = Typography

interface FormItemState {
  ingredientId: number
  ingredientName: string
  unit: string
  systemQuantity: number
  actualQuantity: number
  note?: string
}

export default function StocktakePage() {
  const queryClient = useQueryClient()
  const { report, message } = useApiFeedback()
  const [form] = Form.useForm()

  const [overrides, setOverrides] = useState<
    Record<number, { actualQuantity?: number; note?: string }>
  >({})
  const [page, setPage] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(10)

  const {
    data: template = [],
    isLoading: isTemplateLoading,
    error: templateError,
  } = useQuery({
    queryKey: ['inventory', 'stocktake-template'],
    queryFn: ({ signal }) => inventoryApi.getStocktakeTemplate(signal),
  })

  useApiFeedback(templateError)

  const {
    data: stocktakesData,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['inventory', 'stocktakes-list', { page, pageSize }],
    queryFn: ({ signal }) => inventoryApi.listStocktakes({ page, size: pageSize }, signal),
  })

  useApiFeedback(historyError)

  const items: FormItemState[] = template.map((t) => ({
    ingredientId: t.ingredientId,
    ingredientName: t.ingredientName,
    unit: t.unit,
    systemQuantity: Number(t.currentStock),
    actualQuantity:
      overrides[t.ingredientId]?.actualQuantity ?? Number(t.currentStock),
    note: overrides[t.ingredientId]?.note ?? '',
  }))

  const createStocktakeMutation = useMutation({
    mutationFn: (payload: CreateStocktakePayload) => inventoryApi.createStocktake(payload),
    onSuccess: (stocktake) => {
      void message.success(`Tạo thành công phiếu kiểm kê #${stocktake.id}`)
      setOverrides({})
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => report(err, form),
  })

  const handleActualChange = (ingredientId: number, val: number | null) => {
    setOverrides((prev) => ({
      ...prev,
      [ingredientId]: { ...prev[ingredientId], actualQuantity: val ?? 0 },
    }))
  }

  const handleNoteChange = (ingredientId: number, val: string) => {
    setOverrides((prev) => ({
      ...prev,
      [ingredientId]: { ...prev[ingredientId], note: val },
    }))
  }

  const templateColumns: ColumnsType<FormItemState> = [
    {
      title: 'Tên nguyên vật liệu',
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
      title: 'Tồn hệ thống tạm tính',
      dataIndex: 'systemQuantity',
      key: 'systemQuantity',
      width: 170,
      align: 'right',
      render: (sys: number, record) => (
        <Text type="secondary">
          {Number(sys).toFixed(3)} {record.unit}
        </Text>
      ),
    },
    {
      title: 'Số lượng thực tế kiểm kê',
      dataIndex: 'actualQuantity',
      key: 'actualQuantity',
      width: 200,
      render: (_, record) => (
        <InputNumber
          min={0}
          precision={3}
          style={{ width: '100%' }}
          value={record.actualQuantity}
          onChange={(val) => handleActualChange(record.ingredientId, val)}
        />
      ),
    },
    {
      title: 'Chênh lệch tạm',
      key: 'diff',
      width: 150,
      align: 'right',
      render: (_, record) => {
        const diff = record.actualQuantity - record.systemQuantity
        if (Math.abs(diff) < 0.0001) {
          return <Text type="secondary">0.000 {record.unit}</Text>
        }
        const isPositive = diff > 0
        return (
          <span
            style={{
              color: isPositive ? '#389e0d' : '#cf1322',
              fontWeight: 600,
            }}
          >
            {isPositive ? `+${diff.toFixed(3)}` : diff.toFixed(3)} {record.unit}
          </span>
        )
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (_, record) => (
        <Input
          placeholder="Lý do chênh lệch (nếu có)"
          maxLength={500}
          value={record.note}
          onChange={(e) => handleNoteChange(record.ingredientId, e.target.value)}
        />
      ),
    },
  ]

  const historyColumns: ColumnsType<Stocktake> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number) => `#${id}`,
    },
    {
      title: 'Thời gian kiểm kê',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (t: string) => formatTime(t),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 180,
    },
    {
      title: 'Số lượng mặt hàng',
      key: 'itemCount',
      render: (_, record) => {
        const adjustedCount = record.items.filter((i) => Math.abs(Number(i.difference)) > 0.0001).length
        return (
          <Space>
            <span>{record.items.length} mặt hàng</span>
            {adjustedCount > 0 ? (
              <Tag color="purple">{adjustedCount} mặt hàng có chênh lệch</Tag>
            ) : (
              <Tag color="green">Khớp hoàn toàn</Tag>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div className="stocktake-page" style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title={<Title level={4} style={{ margin: 0 }}>Thực hiện kiểm kê kho nguyên vật liệu</Title>}>
          <Alert
            type="info"
            showIcon
            message="Quy tắc tính toán D7"
            description="Số lượng chênh lệch sẽ được tính lại chính xác theo tổng biến động kho trên hệ thống tại thời điểm bạn bấm Xác nhận. Các mặt hàng có chênh lệch sẽ được tự động ghi nhận biến động ĐIỀU CHỈNH KIỂM KÊ."
            style={{ marginBottom: 16 }}
          />

          <Table
            rowKey="ingredientId"
            columns={templateColumns}
            dataSource={items}
            loading={isTemplateLoading}
            pagination={false}
          />

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Popconfirm
              title="Xác nhận lưu kết quả kiểm kê"
              description="Bạn có chắc chắn muốn xác nhận kiểm kê không? Hệ thống sẽ ghi nhận phiếu kiểm kê và điều chỉnh tồn kho cho các mục chênh lệch."
              onConfirm={() => {
                const payloadItems = items.map((i) => ({
                  ingredientId: i.ingredientId,
                  actualQuantity: i.actualQuantity,
                  note: i.note,
                }))
                createStocktakeMutation.mutate({ items: payloadItems })
              }}
              okText="Xác nhận kiểm kê"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                size="large"
                loading={createStocktakeMutation.isPending}
                disabled={items.length === 0}
              >
                Xác nhận & Lưu phiếu kiểm kê
              </Button>
            </Popconfirm>
          </div>
        </Card>

        <Card title={<Title level={4} style={{ margin: 0 }}>Lịch sử các đợt kiểm kê</Title>}>
          <Table
            rowKey="id"
            columns={historyColumns}
            dataSource={stocktakesData?.items ?? []}
            loading={isHistoryLoading}
            expandable={{
              expandedRowRender: (record) => (
                <Table<StocktakeItem>
                  size="small"
                  rowKey="id"
                  pagination={false}
                  dataSource={record.items}
                  columns={[
                    {
                      title: 'Nguyên vật liệu',
                      dataIndex: 'ingredientName',
                      key: 'ingredientName',
                    },
                    {
                      title: 'Tồn hệ thống',
                      dataIndex: 'systemQuantity',
                      key: 'systemQuantity',
                      align: 'right',
                      render: (sys: number, item) => (
                        <span>
                          {Number(sys).toFixed(3)} {item.unit}
                        </span>
                      ),
                    },
                    {
                      title: 'Thực tế kiểm kê',
                      dataIndex: 'actualQuantity',
                      key: 'actualQuantity',
                      align: 'right',
                      render: (act: number, item) => (
                        <span>
                          {Number(act).toFixed(3)} {item.unit}
                        </span>
                      ),
                    },
                    {
                      title: 'Chênh lệch',
                      dataIndex: 'difference',
                      key: 'difference',
                      align: 'right',
                      render: (diff: number, item) => {
                        const val = Number(diff)
                        const isZero = Math.abs(val) < 0.0001
                        return (
                          <span
                            style={{
                              color: isZero ? '#8c8c8c' : val > 0 ? '#389e0d' : '#cf1322',
                              fontWeight: isZero ? 400 : 600,
                            }}
                          >
                            {val > 0 ? `+${val.toFixed(3)}` : val.toFixed(3)} {item.unit}
                          </span>
                        )
                      },
                    },
                    {
                      title: 'Ghi chú',
                      dataIndex: 'note',
                      key: 'note',
                      render: (note?: string) => note || '—',
                    },
                  ]}
                />
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize,
              total: stocktakesData?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total) => `Tổng số ${total} đợt kiểm kê`,
              onChange: (p, s) => {
                setPage(p - 1)
                setPageSize(s)
              },
            }}
          />
        </Card>
      </Space>
    </div>
  )
}
