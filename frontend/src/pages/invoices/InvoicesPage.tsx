import { useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import { paymentApi } from '../../api/paymentApi'
import { MoneyText } from '../../components/MoneyText'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { Invoice, PaymentMethod } from '../../types/payment'
import { formatTime, toInstant } from '../../utils/time'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function InvoicesPage() {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(undefined)
  const [page, setPage] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(20)

  const fromInstant = dateRange?.[0] ? toInstant(dateRange[0].startOf('day')) : undefined
  const toInstantVal = dateRange?.[1] ? toInstant(dateRange[1].endOf('day')) : undefined

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invoices', { from: fromInstant, to: toInstantVal, paymentMethod, page, pageSize }],
    queryFn: ({ signal }) =>
      paymentApi.listInvoices(
        {
          from: fromInstant,
          to: toInstantVal,
          paymentMethod,
          page,
          size: pageSize,
        },
        signal
      ),
  })

  useApiFeedback(error)

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Mã HĐ',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (id: number) => `#${id}`,
    },
    {
      title: 'Bàn',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (tableName: string, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{tableName}</Text>
          {record.areaName && <Text type="secondary" style={{ fontSize: 12 }}>{record.areaName}</Text>}
        </Space>
      ),
    },
    {
      title: 'Thu ngân',
      dataIndex: 'cashierName',
      key: 'cashierName',
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => <StatusTag group="PaymentMethod" value={method} />,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number) => (
        <Text strong style={{ color: '#1677ff' }}>
          <MoneyText amount={amount} />
        </Text>
      ),
    },
    {
      title: 'Thời gian thanh toán',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (paidAt: string) => formatTime(paidAt),
    },
  ]

  return (
    <div className="invoices-page" style={{ padding: 24 }}>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Lịch sử hóa đơn</Title>}
      >
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="Khoảng thời gian">
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

          <Form.Item label="Phương thức">
            <Select
              allowClear
              placeholder="Tất cả phương thức"
              style={{ width: 180 }}
              value={paymentMethod}
              onChange={(val) => {
                setPaymentMethod(val)
                setPage(0)
              }}
              options={[
                { label: 'Tất cả', value: undefined },
                { label: 'Tiền mặt', value: 'CASH' },
                { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Button
              onClick={() => {
                setDateRange(null)
                setPaymentMethod(undefined)
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
            showTotal: (total) => `Tổng số ${total} hóa đơn`,
            onChange: (p, s) => {
              setPage(p - 1)
              setPageSize(s)
            },
          }}
        />
      </Card>
    </div>
  )
}
