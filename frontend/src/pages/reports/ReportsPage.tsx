import { useState } from 'react'
import { Alert, Button, Card, DatePicker, Space, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { inventoryApi } from '../../api/inventoryApi'
import { paymentApi } from '../../api/paymentApi'
import { MoneyText } from '../../components/MoneyText'
import { RevenueStats } from '../../components/RevenueStats'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { formatTime, nowInAppZone, toInstant } from '../../utils/time'
import { DailyRevenueSection } from './DailyRevenueSection'
import { reportMonthRange } from '../../utils/reportDays'

// Pickers hold calendar dates. Avoid zone-aware endOf across the browser's DST changes.
const todayForPicker = () => dayjs(nowInAppZone().format('YYYY-MM-DD'))

export default function ReportsPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [todayForPicker(), todayForPicker()])
  const from = toInstant(range[0].startOf('day'))
  const to = toInstant(range[1].startOf('day').add(1, 'day'))
  const wholeMonth = range[0].date() === 1 && range[0].isSame(range[1], 'month') && (range[1].date() === range[1].daysInMonth() || range[1].isSame(todayForPicker(), 'day'))
  const summary = useQuery({ queryKey: ['payment-summary', { from, to }], queryFn: ({ signal }) => paymentApi.summary({ from, to }, signal) })
  const stock = useQuery({ queryKey: ['inventory', 'ingredients', { belowMinStockOnly: true }], queryFn: ({ signal }) => inventoryApi.listIngredients({ belowMinStockOnly: true }, signal) })
  const lots = useQuery({ queryKey: ['inventory', 'lots', 'attention'], queryFn: ({ signal }) => inventoryApi.listAttentionLots(undefined, signal) })
  const movements = useQuery({ queryKey: ['inventory', 'movements', { page: 0, size: 10 }], queryFn: ({ signal }) => inventoryApi.listMovements({ page: 0, size: 10 }, signal) })
  useApiFeedback(summary.error)
  useApiFeedback(stock.error)
  useApiFeedback(lots.error)
  useApiFeedback(movements.error)
  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <Typography.Title level={2}>Báo cáo</Typography.Title>
      <Card title="Doanh thu theo kỳ" extra={<Button onClick={() => { void summary.refetch(); void stock.refetch(); void lots.refetch(); void movements.refetch() }}>Làm mới</Button>}>
        <Space orientation="vertical" size={20} style={{ width: '100%' }}>
          <Space wrap align="end">
            <div><label htmlFor="report-month">Xem theo tháng</label><br />
              <DatePicker id="report-month" picker="month" format="MM/YYYY" placeholder="Chọn tháng" allowClear={false}
                value={wholeMonth ? range[0] : null} onChange={(value) => { if (value) setRange(reportMonthRange(value)) }} />
            </div>
            <div><label htmlFor="report-period">Khoảng ngày (giờ Việt Nam)</label><br />
            <DatePicker.RangePicker id={{ start: 'report-period', end: 'report-period-end' }} value={range} allowClear={false} format="DD/MM/YYYY"
              onChange={(value) => { if (value?.[0] && value[1]) setRange([value[0], value[1]]) }} />
            </div>
            <Button onClick={() => { const today = todayForPicker(); setRange([today, today]) }}>Hôm nay</Button>
            <Button onClick={() => { const today = todayForPicker(); setRange([today.subtract(6, 'day'), today]) }}>7 ngày qua</Button>
            <Button onClick={() => setRange(reportMonthRange(todayForPicker()))}>Tháng này</Button>
          </Space>
          <Typography.Text type="secondary">Doanh thu từ hóa đơn đã thanh toán, từ {range[0].format('DD/MM/YYYY')} đến {range[1].format('DD/MM/YYYY')} theo giờ Việt Nam.</Typography.Text>
          {summary.isError ? <Alert type="error" title="Không tải được báo cáo doanh thu" /> : <Card loading={summary.isFetching}>
            {summary.data && <><RevenueStats data={summary.data.revenue} />{summary.data.revenue.invoiceCount === 0 && <Typography.Paragraph>Không có dữ liệu hóa đơn trong khoảng này.</Typography.Paragraph>}</>}
          </Card>}
          {summary.data?.analysis && !summary.isError && <DailyRevenueSection key={`${from}/${to}`} daily={summary.data.dailyRevenue} analysis={summary.data.analysis} firstDate={range[0].format('YYYY-MM-DD')} />}
          <Typography.Title level={4}>Top món bán</Typography.Title>
          <Table rowKey="menuItemId" dataSource={summary.isError ? [] : summary.data?.topItems ?? []} loading={summary.isFetching} scroll={{ x: 500 }} locale={{ emptyText: 'Không có dữ liệu' }} pagination={{ pageSize: 10 }} columns={[
            { title: 'Món ăn', dataIndex: 'menuItemName' }, { title: 'Số phần', dataIndex: 'quantity', align: 'right' },
            { title: 'Thành tiền theo giá lúc gọi', dataIndex: 'revenue', align: 'right', render: (value: number) => <MoneyText amount={value} /> },
          ]} />
        </Space>
      </Card>
      <Typography.Title level={3}>Kho hiện tại</Typography.Title>
      <Typography.Text type="secondary">Tồn kho, hạn sử dụng và biến động mới nhất tại thời điểm xem, độc lập với kỳ doanh thu đã chọn.</Typography.Text>
      <Card title="Nguyên vật liệu tồn thấp">
        {stock.isError && <Alert type="error" title="Không tải được tồn kho" />}
        <Table rowKey="id" dataSource={stock.data ?? []} loading={stock.isFetching} scroll={{ x: 500 }} locale={{ emptyText: 'Không có dữ liệu' }} columns={[
          { title: 'Nguyên vật liệu', dataIndex: 'name' }, { title: 'Đơn vị', dataIndex: 'unit' },
          { title: 'Tồn hiện tại', dataIndex: 'currentStock', align: 'right', render: (value: number) => <Typography.Text type={value < 0 ? 'danger' : undefined}>{Number(value).toFixed(3)} {value < 0 && '(Tồn âm)'}</Typography.Text> },
          { title: 'Tối thiểu', dataIndex: 'minStock', align: 'right' },
        ]} />
      </Card>
      <Card title="Lô cần chú ý">
        {lots.isError && <Alert type="error" title="Không tải được lô cần chú ý" />}
        <Table rowKey="id" dataSource={lots.data ?? []} loading={lots.isFetching} scroll={{ x: 650 }} locale={{ emptyText: 'Không có dữ liệu' }} columns={[
          { title: 'Nguyên vật liệu', dataIndex: 'ingredientName' }, { title: 'Số lô', dataIndex: 'lotNumber' },
          { title: 'Hạn sử dụng', dataIndex: 'expiryDate', render: (value: string) => value.split('-').reverse().join('/') },
          { title: 'Lượng nhập ban đầu', key: 'quantity', render: (_, row) => `${row.initialQuantity} ${row.unit}` },
          { title: 'Cảnh báo', dataIndex: 'status', render: (value: string) => <Tag color={value === 'EXPIRED' ? 'red' : 'orange'}>{value === 'EXPIRED' ? 'Đã hết hạn' : 'Sắp hết hạn'}</Tag> },
        ]} />
      </Card>
      <Card title="10 biến động gần nhất">
        {movements.isError && <Alert type="error" title="Không tải được biến động kho" />}
        <Table rowKey="id" dataSource={movements.data?.items ?? []} loading={movements.isFetching} pagination={false} scroll={{ x: 950 }} locale={{ emptyText: 'Không có dữ liệu' }} columns={[
          { title: 'Thời điểm', dataIndex: 'occurredAt', render: (value: string) => formatTime(value) },
          { title: 'Nguyên vật liệu', dataIndex: 'ingredientName' },
          { title: 'Loại', dataIndex: 'movementType', render: (value: string) => <StatusTag group="MovementType" value={value} /> },
          { title: 'Số lượng', key: 'quantity', render: (_, row) => `${row.quantityChange > 0 ? '+' : ''}${row.quantityChange} ${row.unit}` },
          { title: 'Nguồn / Lý do', key: 'source', render: (_, row) => <Space orientation="vertical" size={0}><span>{row.source}</span><span>{row.reason}</span><span>{row.lotNumber && `Lô: ${row.lotNumber}`}</span></Space> },
          { title: 'Người thực hiện', dataIndex: 'performedByName' },
        ]} />
      </Card>
    </Space>
  )
}
