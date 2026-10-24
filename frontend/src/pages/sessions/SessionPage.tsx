import { Alert, Button, Card, Descriptions, Empty, Popconfirm, Result, Skeleton, Space, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackNavigation } from '../../components/BackNavigation'
import { sessionApi } from '../../api/sessionApi'
import { useAuth } from '../../auth/useAuth'
import { MoneyText } from '../../components/MoneyText'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { liveQueryOptions, refreshLiveQueries } from '../../realtime/invalidation'
import { formatTime } from '../../utils/time'
import OrderModal from './OrderModal'

export default function SessionPage() {
  const sessionId = Number(useParams().id)
  const validId = Number.isSafeInteger(sessionId) && sessionId > 0
  const { account } = useAuth()
  const [ordering, setOrdering] = useState(false)
  const cache = useQueryClient()
  const query = useQuery({ queryKey: ['session', sessionId], queryFn: ({ signal }) => sessionApi.detail(sessionId, signal), enabled: validId, ...liveQueryOptions })
  const { report, message } = useApiFeedback(query.error)
  const change = useMutation({ mutationFn: ({ id, action }: { id: number; action: 'cancel' | 'serve' }) => sessionApi[action](id),
    onError: (error) => report(error), onSuccess: async (_, { action }) => {
      await refreshLiveQueries(cache, { type: 'ORDER', sessionId })
      void message.success(action === 'cancel' ? 'Đã hủy món' : 'Đã xác nhận phục vụ')
    } })
  const back = <BackNavigation to="/floor-plan" label="Về sơ đồ bàn" />
  if (!validId) return <section>{back}<Result status="404" title="Mã phiên không hợp lệ" /></section>
  if (query.isPending) return <section>{back}<Skeleton active /></section>
  if (!query.data) return <section>{back}<Result status="warning" title="Chưa tải được phiên phục vụ" extra={<Button onClick={() => void query.refetch()}>Thử lại</Button>} /></section>
  const session = query.data
  return <section>
    {back}
    <div className="page-heading"><div><Typography.Title level={1}>Phiên #{session.sessionId} · {session.tableCode ?? session.tableName}</Typography.Title>
      <Typography.Paragraph>{session.areaName} · Mở lúc {formatTime(session.openedAt)}</Typography.Paragraph></div>
      <Space wrap><StatusTag group="SessionStatus" value={session.status} />
        <Button type="primary" size="large" disabled={session.status !== 'ACTIVE'} onClick={() => setOrdering(true)}>{session.orders.length ? 'Gọi thêm' : 'Gọi món'}</Button></Space></div>
    {session.reservation && <Card size="small" className="session-reservation"><Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
      { key: 'customer', label: 'Khách đặt bàn', children: session.reservation.customerName },
      { key: 'phone', label: 'Số điện thoại', children: session.reservation.customerPhone },
      { key: 'guests', label: 'Số khách', children: session.reservation.guestCount },
      { key: 'time', label: 'Thời gian đặt', children: `${formatTime(session.reservation.startTime)} – ${formatTime(session.reservation.endTime)}` },
    ]} /></Card>}
    <div className="session-total"><div><span>Tạm tính</span><strong><MoneyText amount={session.total} /></strong></div>
      <span className="muted-text">Không tính món đã hủy hoặc không thể chế biến.</span></div>
    {session.orders.length === 0 ? <Empty description="Chưa có đợt gọi món. Chọn Gọi món để gửi bếp." /> : session.orders.map((order, index) => <Card key={order.id} className="food-order"
      title={`Đợt ${index + 1} · #${order.id}`} extra={<span className="muted-text">{formatTime(order.createdAt)}</span>}>
      <p className="muted-text">Người gọi: {order.createdByName}</p>
      {order.items.map((item) => <article key={item.id} className="session-item" data-item-id={item.id}>
        <div className="session-item-main"><div><Typography.Title level={3}>{item.menuItemName} <span className="item-quantity">× {item.quantity}</span></Typography.Title>
          <StatusTag group="OrderItemStatus" value={item.status} />
          {item.note && <p className="item-note">Ghi chú: {item.note}</p>}
          {item.unavailableReason && <Alert type="warning" showIcon title={`Lý do: ${item.unavailableReason}`} />}
        </div><div className="session-item-price"><MoneyText amount={item.subtotal} /><small>Đơn giá: <MoneyText amount={item.unitPriceAtOrder} /></small></div></div>
        <Space wrap>
          {session.status === 'ACTIVE' && item.status === 'PENDING' && <Popconfirm title="Hủy món này?" description="Món đã hủy sẽ không được chế biến." okText="Hủy món" cancelText="Giữ món" onConfirm={() => change.mutate({ id: item.id, action: 'cancel' })} disabled={change.isPending}>
            <Button danger disabled={change.isPending} loading={change.isPending && change.variables?.id === item.id}>Hủy món</Button></Popconfirm>}
          {session.status === 'ACTIVE' && account?.role === 'WAITER' && item.status === 'READY' && <Button type="primary" size="large" disabled={change.isPending} loading={change.isPending && change.variables?.id === item.id}
            onClick={() => change.mutate({ id: item.id, action: 'serve' })}>Đã phục vụ</Button>}
        </Space>
      </article>)}
      <div className="order-total">Tạm tính đợt: <MoneyText amount={order.total} /></div>
    </Card>)}
    {ordering && <OrderModal sessionId={sessionId} onClose={() => setOrdering(false)} />}
  </section>
}
