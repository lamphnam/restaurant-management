import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Radio,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentApi } from '../../api/paymentApi'
import { MoneyText } from '../../components/MoneyText'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { liveQueryOptions } from '../../realtime/invalidation'
import type {
  OpenSessionPayment,
  PaymentMethod,
} from '../../types/payment'
import { formatTime } from '../../utils/time'

const { Title, Text } = Typography

export default function PaymentPage() {
  const queryClient = useQueryClient()
  const { report, message } = useApiFeedback()

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')

  const {
    data: sessions = [],
    isLoading,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ['payment', 'open-sessions'],
    queryFn: ({ signal }) => paymentApi.listOpenSessions(signal),
    ...liveQueryOptions,
  })

  useApiFeedback(error)

  const {
    data: preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useQuery({
    queryKey: ['payment', 'preview', selectedSessionId],
    queryFn: ({ signal }) =>
      selectedSessionId ? paymentApi.getPreview(selectedSessionId, signal) : null,
    enabled: selectedSessionId != null,
    ...liveQueryOptions,
  })

  useApiFeedback(previewError)

  const payMutation = useMutation({
    mutationFn: (sessionId: number) =>
      paymentApi.pay({ sessionId, paymentMethod }),
    onSuccess: (invoice) => {
      void message.success(
        `Thanh toán thành công cho bàn ${invoice.tableName} (${invoice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'})`
      )
      setSelectedSessionId(null)
      void queryClient.invalidateQueries({ queryKey: ['payment'] })
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['floor-plan'] })
      void queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: (err) => {
      report(err)
      void queryClient.invalidateQueries({ queryKey: ['payment'] })
    },
  })

  const columns: ColumnsType<OpenSessionPayment> = [
    {
      title: 'Bàn',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (tableName: string, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ fontSize: 16 }}>
            {record.tableCode ?? tableName}
          </Text>
          {record.areaName && <Text type="secondary">{record.areaName}</Text>}
        </Space>
      ),
    },
    {
      title: 'Giờ mở',
      dataIndex: 'openedAt',
      key: 'openedAt',
      render: (openedAt: string) => formatTime(openedAt),
    },
    {
      title: 'Số món',
      dataIndex: 'totalItems',
      key: 'totalItems',
      align: 'center',
    },
    {
      title: 'Tạm tính',
      dataIndex: 'provisionalTotal',
      key: 'provisionalTotal',
      render: (amount: number) => <MoneyText amount={amount} />,
    },
    {
      title: 'Trạng thái món',
      key: 'status',
      render: (_, record) =>
        record.hasBlockingItems ? (
          <Tag color="gold">Còn món chưa xong</Tag>
        ) : (
          <Tag color="green">Sẵn sàng thanh toán</Tag>
        ),
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => {
            setSelectedSessionId(record.sessionId)
            setPaymentMethod('CASH')
          }}
        >
          Xem & Thanh toán
        </Button>
      ),
    },
  ]

  return (
    <div className="payment-page" style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Danh sách bàn cần thanh toán
            </Title>
            {isRefetching && <Badge status="processing" text="Đang đồng bộ..." />}
          </Space>
        }
        extra={<Text type="secondary">Cập nhật tự động mỗi 30 giây</Text>}
      >
        <Table
          rowKey="sessionId"
          columns={columns}
          dataSource={sessions}
          loading={isLoading}
          locale={{
            emptyText: (
              <Empty
                description="Hiện không có bàn nào đang hoạt động cần thanh toán"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          pagination={false}
        />
      </Card>

      <Drawer
        title={
          preview ? (
            <Space>
              <span>Thanh toán bàn {preview.tableCode ?? preview.tableName}</span>
              {preview.areaName && <Tag>{preview.areaName}</Tag>}
            </Space>
          ) : (
            'Xem trước hóa đơn'
          )
        }
        width={650}
        open={selectedSessionId != null}
        onClose={() => setSelectedSessionId(null)}
        loading={isPreviewLoading}
        footer={
          preview && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary">Tổng thanh toán: </Text>
                <Text strong style={{ fontSize: 20, color: '#1677ff' }}>
                  <MoneyText amount={preview.provisionalTotal} />
                </Text>
              </div>
              <Space>
                <Button onClick={() => setSelectedSessionId(null)}>Đóng</Button>
                <Popconfirm
                  title="Xác nhận thanh toán"
                  description={
                    <div>
                      <p>
                        Xác nhận đã nhận đủ số tiền{' '}
                        <strong>
                          <MoneyText amount={preview.provisionalTotal} />
                        </strong>{' '}
                        qua hình thức{' '}
                        <strong>
                          {paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </strong>
                        ?
                      </p>
                      <p style={{ color: '#faad14', margin: 0 }}>
                        Bàn {preview.tableCode ?? preview.tableName} sẽ được trả về trạng thái Trống và phiên phục vụ sẽ đóng.
                      </p>
                    </div>
                  }
                  onConfirm={() => selectedSessionId && payMutation.mutate(selectedSessionId)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                  disabled={preview.hasBlockingItems || payMutation.isPending}
                >
                  <Button
                    type="primary"
                    disabled={preview.hasBlockingItems}
                    loading={payMutation.isPending}
                  >
                    Xác nhận thanh toán
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          )
        }
      >
        {preview && (
          <Space open-orientation="vertical" direction="vertical" size="middle" style={{ width: '100%' }}>
            {preview.hasBlockingItems && (
              <Alert
                type="warning"
                showIcon
                message="Chưa thể thanh toán phiên này"
                description={
                  <div>
                    <p style={{ marginBottom: 8 }}>
                      Còn <strong>{preview.blockingItems.length}</strong> món chưa phục vụ (chờ chế biến, đang nấu hoặc hoàn thành).
                      Vui lòng xử lý và xác nhận đã phục vụ; món không thể chế biến hoặc đã hủy không chặn thanh toán:
                    </p>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {preview.blockingItems.map((item) => (
                        <li key={item.id}>
                          <strong>{item.menuItemName}</strong> x {item.quantity} (
                          <StatusTag group="OrderItemStatus" value={item.status} />)
                        </li>
                      ))}
                    </ul>
                  </div>
                }
              />
            )}

            <Card size="small" title="Thông tin phiên">
              <Space split={<Text type="secondary">|</Text>}>
                <Text>
                  Bàn: <strong>{preview.tableCode ?? preview.tableName}</strong>
                </Text>
                {preview.areaName && <Text>Khu vực: {preview.areaName}</Text>}
                <Text>Giờ mở: {formatTime(preview.openedAt)}</Text>
              </Space>
            </Card>

            <Card size="small" title="Chi tiết các đợt gọi món">
              {preview.orders.length === 0 ? (
                <Empty description="Chưa có món nào được gọi" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                preview.orders.map((order, orderIdx) => (
                  <div
                    key={order.orderId}
                    style={{
                      marginBottom: orderIdx < preview.orders.length - 1 ? 16 : 0,
                      paddingBottom: orderIdx < preview.orders.length - 1 ? 12 : 0,
                      borderBottom:
                        orderIdx < preview.orders.length - 1 ? '1px dashed #f0f0f0' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">
                        Đợt #{orderIdx + 1} • {formatTime(order.createdAt)} • Người gọi:{' '}
                        {order.createdByName}
                      </Text>
                    </div>
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={order.items}
                      columns={[
                        {
                          title: 'Tên món',
                          dataIndex: 'menuItemName',
                          key: 'menuItemName',
                          render: (name: string, item) => (
                            <Space orientation="vertical" size={0}>
                              <Text
                                delete={
                                  item.status === 'CANCELLED' || item.status === 'UNAVAILABLE'
                                }
                              >
                                {name}
                              </Text>
                              {item.note && <Text type="secondary" style={{ fontSize: 12 }}>Ghi chú: {item.note}</Text>}
                              {item.unavailableReason && (
                                <Text type="danger" style={{ fontSize: 12 }}>Lý do: {item.unavailableReason}</Text>
                              )}
                            </Space>
                          ),
                        },
                        {
                          title: 'SL',
                          dataIndex: 'quantity',
                          key: 'quantity',
                          width: 50,
                          align: 'center',
                        },
                        {
                          title: 'Đơn giá',
                          dataIndex: 'unitPriceAtOrder',
                          key: 'unitPriceAtOrder',
                          width: 100,
                          align: 'right',
                          render: (price: number) => <MoneyText amount={price} />,
                        },
                        {
                          title: 'Trạng thái',
                          dataIndex: 'status',
                          key: 'status',
                          width: 120,
                          render: (status: string) => (
                            <StatusTag group="OrderItemStatus" value={status} />
                          ),
                        },
                        {
                          title: 'Thành tiền',
                          dataIndex: 'subtotal',
                          key: 'subtotal',
                          width: 110,
                          align: 'right',
                          render: (subtotal: number, item) => (
                            <span
                              style={{
                                color:
                                  item.status === 'CANCELLED' || item.status === 'UNAVAILABLE'
                                    ? '#8c8c8c'
                                    : '#000',
                              }}
                            >
                              <MoneyText amount={subtotal} />
                            </span>
                          ),
                        },
                      ]}
                    />
                  </div>
                ))
              )}
            </Card>

            <Card size="small" title="Phương thức thanh toán">
              <Form.Item label="Chọn hình thức" style={{ marginBottom: 0 }}>
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="CASH">Tiền mặt</Radio.Button>
                  <Radio.Button value="BANK_TRANSFER">Chuyển khoản</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  )
}
