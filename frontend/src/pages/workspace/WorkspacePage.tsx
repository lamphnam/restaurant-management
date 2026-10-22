import { Empty, Typography } from 'antd'

export default function WorkspacePage({ title, description }: { title: string; description: string }) {
  return <section aria-labelledby="workspace-heading">
    <div className="workspace-title"><Typography.Title id="workspace-heading" level={1}>{title}</Typography.Title>
      <Typography.Paragraph>{description}</Typography.Paragraph></div>
    <div className="workspace-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có nội dung để hiển thị." /></div>
  </section>
}
