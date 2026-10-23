import { useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../../api/inventoryApi'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { CreateStockReceiptPayload, StockReceipt } from '../../types/inventory'
import { formatTime } from '../../utils/time'

const { Title, Text } = Typography

export default function ReceiptsPage() {
  const queryClient = useQueryClient()
  const { report, message } = useApiFeedback()
  const [form] = Form.useForm<CreateStockReceiptPayload>()

  const [page, setPage] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(10)

  const { data: ingredients = [] } = useQuery({
    queryKey: ['inventory', 'ingredients-active'],
    queryFn: ({ signal }) => inventoryApi.listIngredients({ status: 'ACTIVE' }, signal),
  })

  const {
    data: receiptsData,
    isLoading: isReceiptsLoading,
    error: receiptsError,
  } = useQuery({
    queryKey: ['inventory', 'receipts-list', { page, pageSize }],
    queryFn: ({ signal }) => inventoryApi.listReceipts({ page, size: pageSize }, signal),
  })

  useApiFeedback(receiptsError)

  const createReceiptMutation = useMutation({
    mutationFn: (payload: CreateStockReceiptPayload) => {
      // Map expiryDate from Dayjs to string YYYY-MM-DD
      const formattedItems = payload.items.map((item: any) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate ? item.expiryDate.format('YYYY-MM-DD') : undefined,
      }))
      return inventoryApi.createReceipt({ items: formattedItems })
    },
    onSuccess: (receipt) => {
      void message.success(`Tạo thành công phiếu nhập kho #${receipt.id}`)
      form.resetFields()
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => report(err, form),
  })

  const columns: ColumnsType<StockReceipt> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number) => `#${id}`,
    },
    {
      title: 'Thời gian lập',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (t: string) => formatTime(t),
    },
    {
      title: 'Người lập',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 180,
    },
    {
      title: 'Chi tiết nguyên vật liệu',
      key: 'items',
      render: (_, record) => (
        <Space wrap size={[4, 8]}>
          {record.items.map((item) => (
            <Tag key={item.id} color="blue">
              {item.ingredientName}: {Number(item.quantity).toFixed(3)} {item.unit}
              {item.lotNumber && ` (Lô: ${item.lotNumber})`}
              {item.expiryDate && ` - HSD: ${item.expiryDate}`}
            </Tag>
          ))}
        </Space>
      ),
    },
  ]

  return (
    <div className="receipts-page" style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title={<Title level={4} style={{ margin: 0 }}>Lập phiếu nhập kho nguyên vật liệu</Title>}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ items: [{}] }}
            onFinish={(values) => createReceiptMutation.mutate(values)}
          >
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => {
                    return (
                      <Card
                        key={key}
                        size="small"
                        type="inner"
                        title={<Text strong>Dòng #{index + 1}</Text>}
                        extra={
                          fields.length > 1 && (
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(name)}
                            >
                              Xóa dòng
                            </Button>
                          )
                        }
                        style={{ marginBottom: 16 }}
                      >
                        <Space wrap size="middle" align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'ingredientId']}
                            label="Nguyên vật liệu"
                            rules={[{ required: true, message: 'Chọn nguyên vật liệu' }]}
                            style={{ minWidth: 220 }}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder="Chọn nguyên vật liệu"
                              options={ingredients.map((i) => ({
                                label: `${i.name} (${i.unit})`,
                                value: i.id,
                              }))}
                            />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'quantity']}
                            label="Số lượng nhập"
                            rules={[
                              { required: true, message: 'Nhập số lượng' },
                              { type: 'number', min: 0.001, message: 'Số lượng > 0' },
                            ]}
                          >
                            <InputNumber min={0.001} precision={3} style={{ width: 140 }} />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'lotNumber']}
                            label="Số lô (nếu có)"
                          >
                            <Input placeholder="Số lô SX" maxLength={50} style={{ width: 140 }} />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'expiryDate']}
                            label="Hạn sử dụng"
                          >
                            <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày" />
                          </Form.Item>
                        </Space>
                      </Card>
                    )
                  })}

                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      Thêm dòng nguyên vật liệu
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Popconfirm
                title="Xác nhận nhập kho"
                description="Bạn có chắc chắn muốn tạo phiếu nhập này không? Số lượng tồn kho sẽ được cộng tăng ngay sau khi lưu."
                onConfirm={() => form.submit()}
                okText="Xác nhận"
                cancelText="Hủy"
              >
                <Button
                  type="primary"
                  size="large"
                  loading={createReceiptMutation.isPending}
                >
                  Hoàn tất & Lưu phiếu nhập
                </Button>
              </Popconfirm>
            </div>
          </Form>
        </Card>

        <Card title={<Title level={4} style={{ margin: 0 }}>Lịch sử phiếu nhập kho</Title>}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={receiptsData?.items ?? []}
            loading={isReceiptsLoading}
            pagination={{
              current: page + 1,
              pageSize,
              total: receiptsData?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total) => `Tổng số ${total} phiếu nhập`,
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
