import { Button, DatePicker, Drawer, Empty, Form, Input, InputNumber, Radio, Space, Spin, Steps, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import axios from 'axios'
import { useState } from 'react'
import { reservationApi } from '../../api/reservationApi'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import type { CreateReservation } from '../../types/tables'
import type { ApiError } from '../../types/auth'
import { formatTime, nowInAppZone, toInstant } from '../../utils/time'

interface ReservationForm { customerName: string; customerPhone: string; guestCount: number; startTime: Dayjs; endTime: Dayjs; note?: string }
function ChooseTable({ values, back, onClose, onFailure }: { values: Omit<CreateReservation, 'tableId'>; back: () => void; onClose: () => void; onFailure: (error: unknown) => void }) {
  const [tableId, setTableId] = useState<number>()
  const cache = useQueryClient()
  const params = { startTime: values.startTime, endTime: values.endTime, guestCount: values.guestCount }
  const query = useQuery({ queryKey: ['available-tables', params], queryFn: ({ signal }) => reservationApi.available(params, signal), refetchOnWindowFocus: true })
  const { message } = useApiFeedback(query.error)
  const save = useMutation({ mutationFn: () => reservationApi.create({ ...values, tableId: tableId! }),
    onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['reservations'] }), cache.invalidateQueries({ queryKey: ['floor-plan'] })]); void message.success('Đã tạo đặt bàn'); onClose() },
    onError: (error) => { onFailure(error); setTableId(undefined); void query.refetch() } })
  return <>
    <div className="reservation-summary"><strong>{values.customerName} · {values.guestCount} khách</strong><span>{formatTime(values.startTime)} – {formatTime(values.endTime)}</span></div>
    {query.isPending ? <Spin /> : query.data?.length ? <Radio.Group aria-label="Bàn phù hợp" className="available-table-list" value={tableId} onChange={(event) => setTableId(event.target.value)} disabled={save.isPending}>
      {query.data.map((table) => <Radio key={table.id} value={table.id}><strong>{table.name}</strong><span>{table.areaName} · {table.capacity} khách</span></Radio>)}
    </Radio.Group> : <Empty description="Chưa có bàn phù hợp trong khung giờ này. Thử đổi giờ hoặc số khách." />}
    <Space className="form-actions"><Button disabled={save.isPending} onClick={back}>Quay lại</Button><Button type="primary" disabled={!tableId || !query.data?.some((table) => table.id === tableId)} loading={save.isPending} onClick={() => save.mutate()}>Lưu đặt bàn</Button></Space>
  </>
}

export default function CreateReservationDrawer({ onClose }: { onClose: () => void }) {
  const [form] = Form.useForm<ReservationForm>()
  const { report } = useApiFeedback()
  const [values, setValues] = useState<Omit<CreateReservation, 'tableId'> | null>(null)
  const start = nowInAppZone().add(1, 'hour').startOf('hour')
  return <Drawer open title="Tạo đặt bàn" width={640} onClose={onClose}>
    <Steps size="small" current={values ? 1 : 0} items={[{ title: 'Thông tin khách' }, { title: 'Chọn bàn' }]} />
    <Typography.Paragraph className="page-note">Thời gian theo giờ Việt Nam.</Typography.Paragraph>
    {values && <ChooseTable values={values} back={() => setValues(null)} onClose={onClose} onFailure={(error) => {
      report(error, form)
      if (axios.isAxiosError<ApiError>(error) && Object.keys(error.response?.data.fieldErrors ?? {}).length) setValues(null)
    }} />}
    <Form form={form} layout="vertical" style={{ display: values ? 'none' : undefined }} initialValues={{ guestCount: 2, startTime: start, endTime: start.add(2, 'hour') }}
      onFinish={(value) => setValues({ ...value, startTime: toInstant(value.startTime), endTime: toInstant(value.endTime) })}>
      <Form.Item name="customerName" label="Tên khách" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên khách' }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
      <Form.Item name="customerPhone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }, { pattern: /^0\d{9}$/, message: 'Nhập 10 chữ số, bắt đầu bằng 0' }]}><Input type="tel" maxLength={15} /></Form.Item>
      <Form.Item name="guestCount" label="Số khách" rules={[{ required: true, message: 'Vui lòng nhập số khách' }, { type: 'number', min: 1 }]}><InputNumber min={1} max={2147483647} precision={0} style={{ width: '100%' }} /></Form.Item>
      <div className="form-two-columns"><Form.Item name="startTime" label="Bắt đầu" rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}><DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="endTime" label="Kết thúc" dependencies={['startTime']} rules={[{ required: true, message: 'Chọn giờ kết thúc' }, ({ getFieldValue }) => ({ validator: (_, end: Dayjs) => !end || !getFieldValue('startTime') || end.isAfter(getFieldValue('startTime')) ? Promise.resolve() : Promise.reject(new Error('Giờ kết thúc phải sau giờ bắt đầu')) })]}><DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} /></Form.Item></div>
      <Form.Item name="note" label="Ghi chú" rules={[{ max: 500 }]}><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item>
      <Space className="form-actions"><Button onClick={onClose}>Hủy</Button><Button type="primary" htmlType="submit">Tìm bàn phù hợp</Button></Space>
    </Form>
  </Drawer>
}
