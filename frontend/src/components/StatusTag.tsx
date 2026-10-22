import { Tag } from 'antd'
import { statusColors, statusLabel } from '../utils/labels'
import type { StatusGroup } from '../utils/labels'

export function StatusTag({ group, value }: { group: StatusGroup; value: string }) {
  return <Tag color={statusColors[value]}>{statusLabel(group, value)}</Tag>
}
