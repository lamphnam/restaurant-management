import { Badge, Button, Empty, Skeleton, Space, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tableApi } from '../../api/tableApi'
import { useAuth } from '../../auth/useAuth'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { FloorTable } from '../../types/tables'
import { formatTime } from '../../utils/time'
import OpenSessionModal from './OpenSessionModal'
import { liveQueryOptions } from '../../realtime/invalidation'

export default function FloorPlanPage() {
  const { account } = useAuth()
  const canOpen = account?.role === 'WAITER' || account?.role === 'MANAGER'
  const [selected, setSelected] = useState<FloorTable | null>(null)
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['floor-plan'], queryFn: ({ signal }) => tableApi.floorPlan(signal), ...liveQueryOptions })
  useApiFeedback(query.error)
  return <section>
    <div className="page-heading"><div><Typography.Title level={1}>Sơ đồ bàn</Typography.Title>
      <Typography.Paragraph>Chọn bàn để đón khách và theo dõi lượt đặt trước.</Typography.Paragraph></div>
      <Button loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button></div>
    <div className="floor-legend"><StatusTag group="TableStatus" value="AVAILABLE" /><StatusTag group="TableStatus" value="OCCUPIED" /><StatusTag group="TableStatus" value="INACTIVE" /><span>Tự cập nhật trực tiếp · Kiểm tra dự phòng mỗi 30 giây</span></div>
    {query.isPending ? <Skeleton active /> : (query.data ?? []).length === 0 ? <Empty description="Chưa có bàn trong khu vực đang hoạt động." /> : query.data?.map((area) => <section className="floor-area" key={area.id} aria-label={area.name}>
      <div className="area-heading"><Typography.Title level={2}>{area.name}</Typography.Title><span>{area.tables.length} bàn</span></div>
      <div className="floor-grid">{area.tables.map((table) => <article className={`table-card table-${table.status.toLowerCase()}`} key={table.id} data-table-name={table.name}>
        <div className="table-card-heading"><Typography.Title level={3}>{table.name}</Typography.Title><StatusTag group="TableStatus" value={table.status} /></div>
        <div className="table-capacity"><span className="table-symbol" aria-hidden="true" />{table.capacity} khách</div>
        <div className="reservation-preview">{table.upcomingReservation ? <><Badge status="warning" text="Có đặt trước" /><strong>{table.upcomingReservation.customerName}</strong><span>{formatTime(table.upcomingReservation.startTime)}</span></> : <span className="muted-text">Chưa có đặt trước sắp tới</span>}</div>
        <Space className="table-actions">
          {canOpen && table.status === 'AVAILABLE' && <Button type="primary" onClick={() => setSelected(table)}>Mở phiên</Button>}
          {canOpen && table.activeSessionId && <Button onClick={() => navigate(`/sessions/${table.activeSessionId}`)}>Xem phiên</Button>}
          {!canOpen && table.activeSessionId && <span>Phiên #{table.activeSessionId}</span>}
          {table.status === 'INACTIVE' && <span className="muted-text">Bàn tạm ngừng sử dụng</span>}
        </Space>
      </article>)}</div>
    </section>)}
    {selected && <OpenSessionModal key={selected.id} table={selected} onClose={() => setSelected(null)} />}
  </section>
}
