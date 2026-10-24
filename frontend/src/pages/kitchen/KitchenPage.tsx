import { Alert, Button, Card, Drawer, Empty, Form, Input, Modal, Skeleton, Space, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { kitchenApi } from '../../api/kitchenApi'
import { OrderQueueCard } from '../../components/OrderQueueCard'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { liveQueryOptions, refreshLiveQueries } from '../../realtime/invalidation'
import type { IngredientAvailability, OrderQueueItem } from '../../types/sessions'
import { formatTime } from '../../utils/time'
import { InventoryCheckDialog } from './InventoryCheckDialog'
import type { InventoryCheck } from './InventoryCheckDialog'

export default function KitchenPage() {
  const cache = useQueryClient()
  const queue = useQuery({ queryKey: ['kitchen'], queryFn: ({ signal }) => kitchenApi.queue(signal), ...liveQueryOptions })
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const detail = useQuery({ queryKey: ['kitchen', 'order', selectedOrder], queryFn: ({ signal }) => kitchenApi.batch(selectedOrder!, signal), enabled: selectedOrder != null, ...liveQueryOptions })
  const { report, message } = useApiFeedback(queue.error)
  const [unavailable, setUnavailable] = useState<OrderQueueItem | null>(null)
  const [check, setCheck] = useState<InventoryCheck | null>(null)
  const [form] = Form.useForm<{ reason: string }>()
  const start = useMutation({ mutationFn: ({ item, confirm }: { item: OrderQueueItem; confirm: boolean }) => kitchenApi.start(item.id, confirm),
    onError: (error, { item }) => {
      if (axios.isAxiosError<{ ingredients?: IngredientAvailability[]; code?: string }>(error) && error.response?.data.code === 'INSUFFICIENT_STOCK' && error.response.data.ingredients)
        setCheck({ item, blocked: true, ingredients: error.response.data.ingredients })
      else report(error)
      void refreshLiveQueries(cache, { type: 'ORDER', sessionId: item.sessionId })
    }, onSuccess: async (result, { item }) => {
      if (!result.started) { setCheck({ item, blocked: false, ingredients: result.ingredients }); return }
      setCheck(null)
      await refreshLiveQueries(cache, { type: 'ORDER', sessionId: item.sessionId })
      void message.success('Đã bắt đầu chế biến và giữ nguyên liệu')
    } })
  const change = useMutation({ mutationFn: ({ item, action, reason }: { item: OrderQueueItem; action: 'complete' | 'unavailable'; reason?: string }) =>
    action === 'unavailable' ? kitchenApi.unavailable(item.id, reason ?? '') : kitchenApi.complete(item.id),
    onError: (error) => report(error, form), onSuccess: async (_, { item }) => {
      setUnavailable(null)
      await refreshLiveQueries(cache, { type: 'ORDER', sessionId: item.sessionId })
      void message.success('Đã cập nhật trạng thái món')
    } })
  const busy = start.isPending || change.isPending
  const batches = new Map<number, OrderQueueItem[]>()
  for (const item of queue.data ?? []) batches.set(item.orderId, [...(batches.get(item.orderId) ?? []), item])
  const orderedBatches = [...batches.entries()].sort((a, b) => Date.parse(a[1][0].orderedAt) - Date.parse(b[1][0].orderedAt) || a[0] - b[0])
  const showUnavailable = (item: OrderQueueItem, reason = '') => { form.setFieldsValue({ reason }); setUnavailable(item) }
  return <section className="kitchen-page">
    <div className="page-heading"><div><Typography.Title level={1}>Bếp</Typography.Title><Typography.Paragraph>Mỗi đợt gọi món là một đơn. Các món được xử lý độc lập.</Typography.Paragraph></div>
      <Button loading={queue.isFetching} onClick={() => void queue.refetch()}>Làm mới</Button></div>
    {queue.isPending ? <Skeleton active /> : !orderedBatches.length ? <Empty description="Chưa có đợt cần chế biến" /> : <div className="kitchen-batches">
      {orderedBatches.map(([orderId, items]) => <Card key={orderId} data-order-id={orderId} className="queue-card" title={`${items[0].tableCode ?? items[0].tableName} · Đợt #${orderId}`}>
        <p>{formatTime(items[0].orderedAt)} · Phiên #{items[0].sessionId}</p>
        <p>{items.filter((item) => item.status === 'PENDING').length} chờ chế biến · {items.filter((item) => item.status === 'COOKING').length} đang chế biến</p>
        <ul>{items.map((item) => <li key={item.id}>{item.menuItemName} ×{item.quantity}</li>)}</ul>
        <Button type="primary" size="large" onClick={() => setSelectedOrder(orderId)}>Xem đợt #{orderId}</Button>
      </Card>)}
    </div>}
    <Drawer title={`Chi tiết đợt #${selectedOrder ?? ''}`} open={selectedOrder != null} onClose={() => { if (!busy) setSelectedOrder(null) }} width={760} closable={!busy} mask={{ closable: !busy }}>
      {detail.isPending ? <Skeleton active /> : detail.isError ? <Alert type="error" title="Chưa tải được đợt gọi món" action={<Button onClick={() => void detail.refetch()}>Thử lại</Button>} /> : detail.data?.map((item) => <OrderQueueCard key={item.id} item={item}>
        {item.status === 'PENDING' && <Button type="primary" size="large" disabled={busy} onClick={() => start.mutate({ item, confirm: false })}>Bắt đầu</Button>}
        {item.status === 'COOKING' && <Button type="primary" size="large" disabled={busy} onClick={() => change.mutate({ item, action: 'complete' })}>Hoàn thành</Button>}
        {(item.status === 'PENDING' || item.status === 'COOKING') && <Button danger size="large" disabled={busy} onClick={() => showUnavailable(item)}>Không thể chế biến</Button>}
      </OrderQueueCard>)}
    </Drawer>
    <InventoryCheckDialog check={check} busy={busy} onClose={() => { if (!busy) setCheck(null) }} onContinue={() => { if (check) start.mutate({ item: check.item, confirm: true }) }}
      onUnavailable={() => { if (check) { showUnavailable(check.item, 'Hết nguyên liệu'); setCheck(null) } }} />
    <Modal title={`Không thể chế biến · ${unavailable?.menuItemName ?? ''}`} open={!!unavailable} onCancel={() => setUnavailable(null)} footer={null} closable={!busy} mask={{ closable: !busy }}>
      <Form form={form} layout="vertical" disabled={busy} onFinish={({ reason }) => { if (unavailable) change.mutate({ item: unavailable, action: 'unavailable', reason }) }}>
        <Form.Item name="reason" label="Lý do cần báo khách" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do không thể chế biến' }, { max: 500, message: 'Lý do tối đa 500 ký tự' }]}>
          <Input.TextArea maxLength={500} showCount rows={3} /></Form.Item>
        <Space className="form-actions"><Button disabled={busy} onClick={() => setUnavailable(null)}>Đóng</Button><Button danger type="primary" htmlType="submit" loading={busy}>Xác nhận</Button></Space>
      </Form>
    </Modal>
  </section>
}
