import { useState } from 'react'
import { Card, Col, Row, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd'
import { MoneyText } from '../../components/MoneyText'
import type { DailyRevenue, RevenueAnalysis } from '../../types/reconciliation'
import { dailyRevenuePage } from '../../utils/reportDays'

const formatDate = (date: string) => date.split('-').reverse().join('/')

export function DailyRevenueSection({ daily, analysis, firstDate }: { daily: DailyRevenue[]; analysis: RevenueAnalysis; firstDate: string }) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const peaks = new Set(analysis.peakDates)
  return <section aria-label="Doanh thu theo ngày"><Space orientation="vertical" size={20} style={{ width: '100%' }}>
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}><Card size="small" style={{ height: '100%' }}>
        <Statistic title="Ngày doanh thu cao nhất" value={analysis.peakRevenue}
          formatter={() => <MoneyText amount={analysis.peakRevenue} />} />
        <Tooltip title={analysis.peakDates.map(formatDate).join(', ')}>
          <Typography.Text type="secondary">
            {analysis.peakDates.length ? `${formatDate(analysis.peakDates[0])}${analysis.peakDates.length > 1 ? ` và ${analysis.peakDates.length - 1} ngày cùng mức` : ''}` : 'Chưa phát sinh doanh thu'}
          </Typography.Text>
        </Tooltip>
      </Card></Col>
      <Col xs={24} sm={12} lg={8}><Card size="small" style={{ height: '100%' }}>
        <Statistic title="Bình quân / hóa đơn" value={analysis.averageInvoiceAmount}
          formatter={() => <MoneyText amount={analysis.averageInvoiceAmount} />} />
        <Typography.Text type="secondary">Tính cả hóa đơn 0đ</Typography.Text>
      </Card></Col>
      <Col xs={24} sm={12} lg={8}><Card size="small" style={{ height: '100%' }}>
        <Statistic title="Bình quân / ngày trong kỳ" value={analysis.averageDailyRevenue}
          formatter={() => <MoneyText amount={analysis.averageDailyRevenue} />} />
        <Typography.Text type="secondary">Có hóa đơn: {analysis.activeDays}/{analysis.calendarDays} ngày</Typography.Text>
      </Card></Col>
    </Row>
    <div><Typography.Title level={4} style={{ marginBottom: 8 }}>Doanh thu theo ngày</Typography.Title>
      <Typography.Text type="secondary">Chỉ tính các ngày đến hôm nay. Ngày không có hóa đơn hiển thị 0đ. Số bình quân làm tròn đến đồng.</Typography.Text>
    </div>
    <Table<DailyRevenue> rowKey="date" dataSource={dailyRevenuePage(daily, firstDate, analysis.calendarDays, page, size)} scroll={{ x: 740 }}
      locale={{ emptyText: 'Không có dữ liệu' }}
      pagination={{ current: page, pageSize: size, total: analysis.calendarDays, showSizeChanger: true, pageSizeOptions: [10, 20, 31],
        showTotal: (total) => `${total} ngày trong kỳ`, onChange: (nextPage, nextSize) => { setPage(nextPage); setSize(nextSize) } }}
      columns={[
        { title: 'Ngày', dataIndex: 'date', width: 210, render: (date: string) => <Space wrap><time dateTime={date}>{formatDate(date)}</time>{peaks.has(date) && <Tag color="green">Cao nhất</Tag>}</Space> },
        { title: 'Số hóa đơn', dataIndex: 'invoiceCount', align: 'right' },
        { title: 'Tiền mặt', dataIndex: 'cashRevenue', align: 'right', render: (value: number) => <MoneyText amount={value} /> },
        { title: 'Chuyển khoản', dataIndex: 'bankTransferRevenue', align: 'right', render: (value: number) => <MoneyText amount={value} /> },
        { title: 'Doanh thu', dataIndex: 'revenue', align: 'right', render: (value: number) => <Typography.Text strong><MoneyText amount={value} /></Typography.Text> },
      ]} />
  </Space></section>
}
