import { Button, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { reservationApi } from '../../api/reservationApi'
import { useAuth } from '../../auth/useAuth'
import { StatusTag } from '../../components/StatusTag'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { Reservation, ReservationFilters } from '../../types/tables'
import { statusLabels } from '../../utils/labels'
import { formatTime, nowInAppZone } from '../../utils/time'
import CreateReservationDrawer from './CreateReservationDrawer'

export default function ReservationsPage() {
  const { account } = useAuth()
  const manager = account?.role === 'MANAGER'
  const [filters, setFilters] = useState<ReservationFilters>({ date: nowInAppZone().format('YYYY-MM-DD'), page: 0, size: 20 })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | undefined>()
  const cache = useQueryClient()
  const query = useQuery({ queryKey: ['reservations', filters], queryFn: ({ signal }) => reservationApi.list(filters, signal), refetchInterval: 30_000, refetchOnWindowFocus: true })
  const { report, message } = useApiFeedback(query.error)
  const cancel = useMutation({ mutationFn: reservationApi.cancel, onError: (error) => report(error), onSuccess: async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: ['reservations'] }), cache.invalidateQueries({ queryKey: ['floor-plan'] })]); void message.success('Đã hủy đặt bàn')
  } })
  return <section>
    <div className="page-heading"><div><Typography.Title level={1}>Đặt bàn</Typography.Title><Typography.Paragraph>Theo dõi lịch hẹn và chuẩn bị đón khách.</Typography.Paragraph></div>
      {manager && <Button type="primary" size="large" onClick={() => { setEditing(undefined); setOpen(true) }}>Tạo đặt bàn</Button>}</div>
    <div className="filter-bar"><DatePicker aria-label="Ngày đặt bàn" format="DD/MM/YYYY" defaultValue={nowInAppZone()} onChange={(date) => setFilters((old) => ({ ...old, date: date?.format('YYYY-MM-DD'), page: 0 }))} />
      <Select aria-label="Trạng thái đặt bàn" allowClear placeholder="Tất cả trạng thái" style={{ minWidth: 180 }} options={Object.entries(statusLabels.ReservationStatus).map(([value, label]) => ({ value, label }))}
        onChange={(status) => setFilters((old) => ({ ...old, status, page: 0 }))} />
      <Input.Search aria-label="Tìm đặt bàn" placeholder="Tên hoặc số điện thoại khách" allowClear style={{ maxWidth: 320 }} onSearch={(q) => setFilters((old) => ({ ...old, q: q || undefined, page: 0 }))} /></div>
    <div className="data-panel"><Table<Reservation> rowKey="id" dataSource={query.data?.items ?? []} loading={query.isPending} scroll={{ x: 1000 }}
      pagination={{ current: filters.page + 1, pageSize: filters.size, total: query.data?.total ?? 0, showSizeChanger: true, pageSizeOptions: [20, 50, 100],
        showTotal: (total) => `${total} đặt bàn`, onChange: (page, size) => setFilters((old) => ({ ...old, page: size !== old.size ? 0 : page - 1, size })) }} columns={[
        { title: 'Khách hàng', render: (_, row) => <div className="cell-stack"><strong>{row.customerName}</strong><span>{row.customerPhone}</span>{row.note && <Typography.Text type="secondary">{row.note}</Typography.Text>}</div> },
        { title: 'Bàn', render: (_, row) => `${row.tableCode ?? row.tableName} · ${row.tableName}` }, { title: 'Số khách', dataIndex: 'guestCount' },
        { title: 'Thời gian', render: (_, row) => <div className="cell-stack"><span>{formatTime(row.startTime)}</span><span className="muted-text">đến {formatTime(row.endTime)}</span></div> },
        { title: 'Trạng thái', render: (_, row) => <Space wrap><StatusTag group="ReservationStatus" value={row.status} />{row.overdue && <Tag color="warning">Quá giờ</Tag>}</Space> },
        ...(manager ? [{ title: 'Thao tác', render: (_: unknown, row: Reservation) => row.status === 'CONFIRMED' && <Space><Button onClick={() => { setEditing(row); setOpen(true) }}>Sửa đặt bàn</Button><Popconfirm title="Hủy đặt bàn?" description="Lịch đặt bàn vẫn được lưu trong lịch sử." okText="Hủy đặt bàn" cancelText="Giữ lại" onConfirm={() => cancel.mutateAsync(row.id).catch(() => undefined)}>
          <Button danger disabled={cancel.isPending}>Hủy đặt bàn</Button></Popconfirm></Space> }] : []),
      ]} /></div>
    {open && <CreateReservationDrawer key={editing?.id ?? 'new'} reservation={editing} onClose={() => setOpen(false)} />}
  </section>
}
