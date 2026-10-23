import { Button, Empty, Form, Input, InputNumber, Modal, Select, Space, Spin } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { menuApi } from '../../api/menuApi'
import { sessionApi } from '../../api/sessionApi'
import { MoneyText } from '../../components/MoneyText'
import { useApiFeedback } from '../../hooks/useApiFeedback'
import { refreshLiveQueries } from '../../realtime/invalidation'
import type { OrderLine } from '../../types/sessions'

export default function OrderModal({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const [form] = Form.useForm<{ items: OrderLine[] }>()
  const cache = useQueryClient()
  const menu = useQuery({ queryKey: ['menu-items', { status: 'ON_SALE' }], queryFn: ({ signal }) => menuApi.list({ status: 'ON_SALE' }, signal) })
  const { report, message } = useApiFeedback(menu.error)
  const save = useMutation({ mutationFn: (values: { items: OrderLine[] }) => sessionApi.order(sessionId, values.items),
    onError: (error) => report(error, form), onSuccess: async () => {
      await refreshLiveQueries(cache, { type: 'ORDER', sessionId })
      void message.success('Đã gửi đợt gọi món đến bếp'); onClose()
    } })
  return <Modal title="Gọi món / gọi thêm" open onCancel={onClose} footer={null} width={780} mask={{ closable: !save.isPending }} closable={!save.isPending}>
    {menu.isPending ? <Spin /> : <Form form={form} layout="vertical" initialValues={{ items: [{ quantity: 1 }] }}
      onFinish={(values) => save.mutate(values)} disabled={save.isPending || !!menu.error}>
      {menu.data?.length === 0 && <Empty description="Chưa có món đang kinh doanh" />}
      <Form.List name="items" rules={[{ validator: async (_, lines) => { if (!lines?.length) throw new Error('Vui lòng chọn ít nhất một món') } }]}>{(fields, { add, remove }, { errors }) => <>
        {fields.map(({ key, name }) => <div className="order-form-line" key={key}>
          <div className="order-form-choice">
            <Form.Item name={[name, 'menuItemId']} label={`Món ${name + 1}`} rules={[{ required: true, message: 'Chọn món' }]}>
              <Select showSearch optionFilterProp="label" placeholder="Chọn món đang kinh doanh" options={menu.data?.map((item) => ({ value: item.id, label: item.name,
                title: item.name, content: <>{item.name} · <MoneyText amount={item.price} /></> }))}
                optionRender={(option) => option.data.content} />
            </Form.Item>
            <Form.Item name={[name, 'quantity']} label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }, { type: 'integer', min: 1, max: 2147483647, message: 'Nhập số nguyên lớn hơn 0' }]}>
              <InputNumber min={1} max={2147483647} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name={[name, 'note']} label="Ghi chú cho bếp" rules={[{ max: 500, message: 'Ghi chú tối đa 500 ký tự' }]}><Input.TextArea maxLength={500} autoSize={{ minRows: 1, maxRows: 3 }} /></Form.Item>
          <Button danger onClick={() => remove(name)} aria-label={`Bỏ món ${name + 1}`}>Bỏ dòng</Button>
        </div>)}
        <Form.ErrorList errors={errors} /><Button onClick={() => add({ quantity: 1 })}>Thêm món</Button>
      </>}</Form.List>
      <Space className="form-actions"><Button onClick={onClose} disabled={save.isPending}>Đóng</Button>
        <Button type="primary" htmlType="submit" loading={save.isPending} disabled={!menu.data?.length}>Gửi bếp</Button></Space>
    </Form>}
  </Modal>
}
