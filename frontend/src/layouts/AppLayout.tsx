import { Avatar, Button, Drawer, Layout, Menu, Tag, Typography } from 'antd'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { navigation } from '../auth/roles'
import { roleLabels } from '../utils/labels'

export function AppLayout() {
  const { account, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  if (!account) return null
  const entries = navigation.filter((item) => item.roles.includes(account.role))
  const menu = <Menu mode="inline" selectedKeys={[location.pathname]} onClick={() => setMenuOpen(false)}
    items={entries.map((item) => ({ key: item.path, label: <Link to={item.path}>{item.label}</Link> }))} />
  const brand = <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
    <span>Quản lý quán ăn<small>Không gian vận hành</small></span></div>

  return (
    <Layout className="application-layout">
      <Layout.Sider width={248} theme="light" className="desktop-sidebar">
        {brand}<nav aria-label="Điều hướng chính">{menu}</nav>
        <div className="sidebar-note">Bán hàng tại bàn<br />Quản lý nguyên vật liệu</div>
      </Layout.Sider>
      <Layout className="workspace-layout">
        <Layout.Header className="workspace-header">
          <Button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Mở menu điều hướng">Menu</Button>
          <Typography.Text className="header-caption">Không gian làm việc</Typography.Text>
          <div className="account-summary">
            <Avatar className="account-avatar">{account.fullName.slice(0, 1)}</Avatar>
            <div className="account-name"><strong>{account.fullName}</strong><Tag>{roleLabels[account.role]}</Tag></div>
            <Button onClick={logout}>Đăng xuất</Button>
          </div>
        </Layout.Header>
        <Layout.Content className="workspace-content"><Outlet /></Layout.Content>
      </Layout>
      <Drawer title="Quản lý quán ăn" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)} width={280}>
        <nav aria-label="Điều hướng trên thiết bị nhỏ">{menu}</nav>
      </Drawer>
    </Layout>
  )
}
