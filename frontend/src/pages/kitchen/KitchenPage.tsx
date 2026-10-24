import { Button, Empty, Form, Input, Modal, Skeleton, Space, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { kitchenApi } from '../../api/kitchenApi'
import { OrderQueueCard } from '../../components/OrderQueueCard'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { liveQueryOptions, refreshLiveQueries } from '../../realtime/invalidation'
import type { OrderQueueItem } from '../../types/sessions'
import { statusLabel } from '../../utils/labels'

export default function KitchenPage() {
  const cache = useQueryClient()
  const query = useQuery({ queryKey: ['kitchen'], queryFn: ({ signal }) => kitchenApi.queue(signal), ...liveQueryOptions })
  const { report, message } = useApiFeedback(query.error)
  const [unavailable, setUnavailable] = useState<OrderQueueItem | null>(null)
  const [form] = Form.useForm<{ reason: string }>()
  const change = useMutation({ mutationFn: ({ item, action, reason }: { item: OrderQueueItem; action: 'start' | 'complete' | 'unavailable'; reason?: string }) =>
    action === 'unavailable' ? kitchenApi.unavailable(item.id, reason ?? '') : kitchenApi[action](item.id),
    onError: (error) => report(error, form), onSuccess: async (_, { item, action }) => {
      await refreshLiveQueries(cache, { type: 'ORDER', sessionId: item.sessionId })
      if (action === 'unavailable') setUnavailable(null)
      void message.success('Đã cập nhật trạng thái món')
    } })
  return <section className="kitchen-page">
    <div className="page-heading"><div><Typography.Title level={1}>Bếp</Typography.Title>
      <Typography.Paragraph>Món được xếp theo thời gian gọi, từ sớm đến muộn.</Typography.Paragraph></div>
      <Button loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button></div>
    {query.isPending ? <Skeleton active /> : <div className="queue-columns">{(['PENDING', 'COOKING'] as const).map((status) => {
      const items = (query.data ?? []).filter((item) => item.status === status)
      return <section key={status} aria-label={statusLabel('OrderItemStatus', status)} className="queue-column">
        <div className="queue-column-heading"><Typography.Title level={2}>{statusLabel('OrderItemStatus', status)}</Typography.Title><span>{items.length} món</span></div>
        {!items.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có món" />}
        {items.map((item) => <OrderQueueCard key={item.id} item={item}>
          <Button type="primary" size="large" disabled={change.isPending} loading={change.isPending && change.variables?.item.id === item.id}
            onClick={() => change.mutate({ item, action: status === 'PENDING' ? 'start' : 'complete' })}>{status === 'PENDING' ? 'Bắt đầu' : 'Hoàn thành'}</Button>
          <Button danger size="large" disabled={change.isPending} onClick={() => { form.resetFields(); setUnavailable(item) }}>Không thể chế biến</Button>
        </OrderQueueCard>)}
      </section>
    })}</div>}
    <Modal title={`Không thể chế biến · ${unavailable?.menuItemName ?? ''}`} open={!!unavailable} onCancel={() => setUnavailable(null)} footer={null} closable={!change.isPending} mask={{ closable: !change.isPending }}>
      <Form form={form} layout="vertical" disabled={change.isPending} onFinish={({ reason }) => { if (unavailable) change.mutate({ item: unavailable, action: 'unavailable', reason }) }}>
        <Form.Item name="reason" label="Lý do cần báo khách" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do không thể chế biến' }, { max: 500, message: 'Lý do tối đa 500 ký tự' }]}>
          <Input.TextArea maxLength={500} showCount rows={3} /></Form.Item>
        <Space className="form-actions"><Button disabled={change.isPending} onClick={() => setUnavailable(null)}>Đóng</Button><Button danger type="primary" htmlType="submit" loading={change.isPending}>Xác nhận</Button></Space>
      </Form>
    </Modal>
  </section>
}
