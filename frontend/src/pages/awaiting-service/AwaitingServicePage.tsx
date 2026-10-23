import { Button, Empty, Skeleton, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { sessionApi } from '../../api/sessionApi'
import { OrderQueueCard } from '../../components/OrderQueueCard'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { liveQueryOptions, refreshLiveQueries } from '../../realtime/invalidation'
import type { OrderQueueItem } from '../../types/sessions'

export default function AwaitingServicePage() {
  const cache = useQueryClient()
  const query = useQuery({ queryKey: ['awaiting-service'], queryFn: ({ signal }) => sessionApi.awaitingService(signal), ...liveQueryOptions })
  const { report, message } = useApiFeedback(query.error)
  const serve = useMutation({ mutationFn: (item: OrderQueueItem) => sessionApi.serve(item.id), onError: (error) => report(error), onSuccess: async (_, item) => {
    await refreshLiveQueries(cache, { type: 'ORDER', sessionId: item.sessionId }); void message.success('Đã xác nhận phục vụ')
  } })
  return <section>
    <div className="page-heading"><div><Typography.Title level={1}>Món chờ phục vụ</Typography.Title>
      <Typography.Paragraph>Mang món đã hoàn thành ra đúng bàn và xác nhận sau khi phục vụ.</Typography.Paragraph></div>
      <Button loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button></div>
    {query.isPending ? <Skeleton active /> : <div className="queue-columns">{(['READY', 'UNAVAILABLE'] as const).map((status) => {
      const items = (query.data ?? []).filter((item) => item.status === status)
      return <section key={status} className="queue-column" aria-label={status === 'READY' ? 'Món hoàn thành' : 'Cần báo khách'}>
        <div className="queue-column-heading"><Typography.Title level={2}>{status === 'READY' ? 'Món hoàn thành' : 'Không thể chế biến — cần báo khách'}</Typography.Title><span>{items.length} món</span></div>
        {!items.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có món" />}
        {items.map((item) => <OrderQueueCard key={item.id} item={item}>
          {status === 'READY' && <Button type="primary" size="large" disabled={serve.isPending} loading={serve.isPending && serve.variables?.id === item.id} onClick={() => serve.mutate(item)}>Đã phục vụ</Button>}
          <Link to={`/sessions/${item.sessionId}`}>Xem phiên</Link>
        </OrderQueueCard>)}
      </section>
    })}</div>}
  </section>
}
