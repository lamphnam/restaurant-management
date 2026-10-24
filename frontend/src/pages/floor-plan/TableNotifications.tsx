import { Button, Drawer, Empty, Space } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { sessionApi } from '../../api/sessionApi'
import { OrderQueueCard } from '../../components/OrderQueueCard'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { refreshLiveQueries } from '../../realtime/invalidation'
import type { OrderQueueItem } from '../../types/sessions'
import type { FloorTable } from '../../types/tables'

export function TableNotifications({ table, items, canAct }: { table: FloorTable; items: OrderQueueItem[]; canAct: boolean }) {
  const [kind, setKind] = useState<'READY' | 'UNAVAILABLE' | null>(null)
  const cache = useQueryClient()
  const { report } = useApiFeedback()
  const relevant = items.filter((item) => item.tableId === table.id && item.sessionId === table.activeSessionId)
  const ready = relevant.filter((item) => item.status === 'READY')
  const unavailable = relevant.filter((item) => item.status === 'UNAVAILABLE')
  const change = useMutation({ mutationFn: (item: OrderQueueItem) => item.status === 'READY' ? sessionApi.serve(item.id) : sessionApi.acknowledgeUnavailable(item.id),
    onError: (error) => report(error), onSuccess: async (_, item) => { await refreshLiveQueries(cache, { type: 'ORDER', sessionId: item.sessionId }) } })
  const visible = kind === 'READY' ? ready : unavailable
  return <>
    <Space wrap className="table-notifications">
      {ready.length > 0 && <Button aria-label={`${table.name}: ${ready.length} dòng món chờ phục vụ`} onClick={() => setKind('READY')}><span aria-hidden="true">🔔</span> {ready.length}</Button>}
      {unavailable.length > 0 && <Button danger aria-label={`${table.name}: ${unavailable.length} dòng món không thể chế biến chưa xử lý`} onClick={() => setKind('UNAVAILABLE')}><span aria-hidden="true">⚠</span> {unavailable.length}</Button>}
    </Space>
    <Drawer title={`${table.name} · ${kind === 'READY' ? 'Món chờ phục vụ' : 'Không thể chế biến — cần báo khách'}`} open={kind != null && table.activeSessionId != null} onClose={() => setKind(null)} width={700}>
      {!visible.length && <Empty description="Đã xử lý hết thông báo" />}
      {visible.map((item) => <OrderQueueCard key={item.id} item={item}>{canAct && <Button type="primary" size="large" disabled={change.isPending} onClick={() => change.mutate(item)}>
        {kind === 'READY' ? 'Đã phục vụ' : 'Đã thông báo cho khách'}</Button>}</OrderQueueCard>)}
    </Drawer>
  </>
}
