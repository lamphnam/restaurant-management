import { Col, Row, Statistic } from 'antd'
import type { RevenueSummary } from '../types/reconciliation'
import { MoneyText } from './MoneyText'
import { statusLabel } from '../utils/labels'

export function RevenueStats({ data }: { data: RevenueSummary }) {
  return (
    <Row gutter={[24, 16]}>
      <Col xs={24} sm={12} xl={6}>
        <Statistic title="Doanh thu hệ thống" value={data.systemRevenue}
          formatter={() => <MoneyText amount={data.systemRevenue} />} />
      </Col>
      <Col xs={24} sm={12} xl={6}><Statistic title="Số hóa đơn" value={data.invoiceCount} /></Col>
      {data.methods.map((method) => (
        <Col xs={24} sm={12} xl={6} key={method.paymentMethod}>
          <Statistic title={`${statusLabel('PaymentMethod', method.paymentMethod)} (${method.invoiceCount} hóa đơn)`}
            value={method.revenue} formatter={() => <MoneyText amount={method.revenue} />} />
        </Col>
      ))}
    </Row>
  )
}
