import { useState } from 'react'
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { reconciliationApi } from '../../api/reconciliationApi'
import { useAuth } from '../../auth/useAuth'
import { MoneyText } from '../../components/MoneyText'
import { RevenueStats } from '../../components/RevenueStats'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { CreateReconciliationPayload, Reconciliation } from '../../types/reconciliation'
import { formatTime, toInstant } from '../../utils/time'
import { initialReconciliationRange, isFutureReconciliationDate, reconciliationDisabledTime } from '../../utils/reconciliationTime'

type ActualForm = Pick<CreateReconciliationPayload, 'actualAmount' | 'differenceReason'>

export default function ReconciliationPage() {
  const { account } = useAuth()
  const isCashier = account?.role === 'CASHIER'
  const cache = useQueryClient()
  const { report, message } = useApiFeedback()
  const [form] = Form.useForm<ActualForm>()
  const actual = Form.useWatch('actualAmount', form)
  const [range, setRange] = useState<[Dayjs, Dayjs]>(initialReconciliationRange)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [filter, setFilter] = useState(isCashier ? 'all' : 'pending')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const from = toInstant(range[0])
  const to = toInstant(range[1])
  const validRange = from < to
  const preview = useQuery({
    queryKey: ['reconciliation-preview', { from, to }],
    queryFn: ({ signal }) => reconciliationApi.preview({ from, to }, signal),
    enabled: isCashier && validRange,
  })
  const list = useQuery({
    queryKey: ['reconciliations', { filter, page, size }],
    queryFn: ({ signal }) => reconciliationApi.list({ confirmed: filter === 'all' ? undefined : filter === 'confirmed', page, size }, signal),
    refetchInterval: 30_000,
  })
  useApiFeedback(preview.error)
  useApiFeedback(list.error)
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['reconciliations'] })
    void cache.invalidateQueries({ queryKey: ['reconciliation-preview'] })
  }
  const create = useMutation({
    mutationFn: reconciliationApi.create,
    onSuccess: () => {
      void message.success('Đã lập đối soát, chờ quản lý xác nhận')
      form.resetFields()
      setReviewOpen(false)
      refresh()
    },
    onError: (error) => { report(error, form); refresh() },
  })
  const confirm = useMutation({
    mutationFn: reconciliationApi.confirm,
    onSuccess: () => { void message.success('Đã xác nhận đối soát'); refresh() },
    onError: (error) => { report(error); refresh() },
  })
  const columns: ColumnsType<Reconciliation> = [
    { title: 'Mã / Thu ngân', key: 'cashier', render: (_, row) => <Space orientation="vertical" size={0}><b>#{row.id}</b>{row.cashierName}</Space> },
    { title: 'Khoảng đối soát', key: 'range', render: (_, row) => <Space orientation="vertical" size={0}><span>Từ {formatTime(row.startTime)}</span><span>Đến trước {formatTime(row.endTime)}</span></Space> },
    { title: 'Hệ thống', dataIndex: 'systemRevenue', align: 'right', render: (value: number) => <MoneyText amount={value} /> },
    { title: 'Thực nhận', dataIndex: 'actualAmount', align: 'right', render: (value: number) => <MoneyText amount={value} /> },
    { title: 'Chênh lệch', dataIndex: 'difference', align: 'right', render: (value: number) => <Typography.Text type={value < 0 ? 'danger' : undefined}><MoneyText amount={value} /></Typography.Text> },
    { title: 'Xác nhận', key: 'confirmed', render: (_, row) => <Space orientation="vertical" size={0}><Tag color={row.confirmed ? 'green' : 'gold'}>{row.confirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</Tag>{row.managerName}</Space> },
    ...(!isCashier ? [{ title: 'Thao tác', key: 'actions', render: (_: unknown, row: Reconciliation) => !row.confirmed && (
      <Popconfirm title={`Xác nhận đối soát #${row.id}?`} description="Số liệu đã lập sẽ được giữ nguyên."
        okText="Xác nhận" cancelText="Hủy" disabled={confirm.isPending}
        onConfirm={() => confirm.mutateAsync(row.id).catch(() => {})}>
        <Button disabled={confirm.isPending} loading={confirm.isPending && confirm.variables === row.id}>Xác nhận</Button>
      </Popconfirm>
    ) }] : []),
  ]
  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <Typography.Title level={2}>Đối soát cuối ca</Typography.Title>
      {isCashier && <Card title="Lập đối soát">
        <Space orientation="vertical" size={20} style={{ width: '100%' }}>
          <div><label htmlFor="reconciliation-period">Khoảng thời gian (giờ Việt Nam)</label><br />
            <DatePicker.RangePicker id={{ start: 'reconciliation-period', end: 'reconciliation-period-end' }} showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm"
              value={range} allowClear={false} disabled={create.isPending}
              disabledDate={(date) => isFutureReconciliationDate(date)} disabledTime={(date) => reconciliationDisabledTime(date)}
              onChange={(value) => { if (value?.[0] && value[1]) { setRange([value[0], value[1]]); setReviewOpen(false); form.resetFields() } }} />
          </div>
          <Typography.Text type="secondary">Tính hóa đơn từ thời điểm bắt đầu đến trước thời điểm kết thúc. Tổng thực nhận gồm tiền mặt và chuyển khoản.</Typography.Text>
          {!validRange && <Alert type="warning" title="Thời điểm bắt đầu phải trước thời điểm kết thúc" />}
          {preview.isError ? <Alert type="error" title="Không tải được doanh thu" action={<Button onClick={() => void preview.refetch()}>Thử lại</Button>} />
            : <Card loading={preview.isFetching}>{preview.data && <><RevenueStats data={preview.data} />{preview.data.invoiceCount === 0 && <Typography.Paragraph>Không có dữ liệu hóa đơn trong khoảng này.</Typography.Paragraph>}</>}</Card>}
          <Form form={form} layout="vertical" disabled={create.isPending} onValuesChange={() => setReviewOpen(false)} scrollToFirstError>
            <Form.Item name="actualAmount" label="Tổng thực nhận (đ)" rules={[{ required: true, message: 'Vui lòng nhập tổng thực nhận' }, { type: 'integer', min: 0, max: 99999999999999, message: 'Nhập số nguyên không âm, tối đa 14 chữ số' }]}>
              <InputNumber min={0} max={99999999999999} style={{ width: '100%', maxWidth: 360 }} />
            </Form.Item>
            {actual != null && preview.data && !preview.isError && <Typography.Paragraph>Chênh lệch tạm tính: <MoneyText amount={actual - preview.data.systemRevenue} /></Typography.Paragraph>}
            <Form.Item name="differenceReason" label="Lý do chênh lệch (không bắt buộc)" rules={[{ max: 500, message: 'Lý do không quá 500 ký tự' }]}><Input.TextArea maxLength={500} showCount rows={3} /></Form.Item>
            <Popconfirm title="Lập đối soát với số thực nhận đã nhập?" description="Doanh thu được tính lại khi lưu. Phiếu đã lập không thể sửa."
              open={reviewOpen} okText="Lập đối soát" cancelText="Hủy" okButtonProps={{ loading: create.isPending }}
              onOpenChange={(open) => { if (!open) setReviewOpen(false); else void form.validateFields().then(() => setReviewOpen(true)).catch(() => {}) }}
              onConfirm={async () => { const values = await form.validateFields(); await create.mutateAsync({ ...values, startTime: from, endTime: to }).catch(() => {}) }}>
              <Button type="primary" loading={create.isPending} disabled={!validRange || preview.isFetching || !preview.data || preview.isError}>Lập đối soát</Button>
            </Popconfirm>
          </Form>
        </Space>
      </Card>}
      <Card title="Danh sách đối soát" extra={<Button onClick={refresh}>Làm mới</Button>}>
        <Space style={{ marginBottom: 16 }}><label htmlFor="reconciliation-status">Xác nhận</label>
          <Select id="reconciliation-status" value={filter} style={{ width: 180 }} onChange={(value) => { setFilter(value); setPage(0) }}
            options={[{ value: 'all', label: 'Tất cả' }, { value: 'pending', label: 'Chưa xác nhận' }, { value: 'confirmed', label: 'Đã xác nhận' }]} />
        </Space>
        {list.isError && <Alert type="error" title="Không tải được danh sách đối soát" />}
        <Table rowKey="id" columns={columns} dataSource={list.data?.items ?? []} loading={list.isFetching} scroll={{ x: 950 }} locale={{ emptyText: 'Không có dữ liệu' }}
          expandable={{ expandedRowRender: (row) => <Descriptions column={1} items={[
            { key: 'time', label: 'Lập lúc', children: formatTime(row.reconciledAt) },
            { key: 'reason', label: 'Lý do chênh lệch', children: row.differenceReason || '—' },
            { key: 'manager', label: 'Quản lý', children: row.managerName || 'Chưa xác nhận' },
          ]} /> }}
          pagination={{ current: page + 1, pageSize: size, total: list.data?.total ?? 0, showSizeChanger: true, onChange: (p, s) => { setPage(p - 1); setSize(s) } }} />
      </Card>
    </Space>
  )
}
