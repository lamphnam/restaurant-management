import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'
import type { OrderQueueItem } from '../types/sessions'
import { formatTime } from '../utils/time'
import { StatusTag } from './StatusTag'

export function OrderQueueCard({ item, children }: { item: OrderQueueItem; children?: ReactNode }) {
  return <Card className="queue-card" data-item-id={item.id}>
    <div className="queue-card-heading"><strong>{item.tableCode ?? item.tableName} {item.tableCode && <small>· {item.tableName}</small>}</strong><StatusTag group="OrderItemStatus" value={item.status} /></div>
    <Typography.Title level={3}>{item.menuItemName} <span className="item-quantity">× {item.quantity}</span></Typography.Title>
    <div className="queue-meta">Đợt #{item.orderId} · Phiên #{item.sessionId}<br />{formatTime(item.orderedAt)}</div>
    {item.note && <p className="item-note">Ghi chú: {item.note}</p>}
    {item.unavailableReason && <p className="unavailable-reason"><strong>Lý do:</strong> {item.unavailableReason}</p>}
    {children && <div className="queue-actions">{children}</div>}
  </Card>
}
