import { App, Button, Result, Space } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/authApi'
import type { Account, LoginRequest } from '../types/auth'
import { AuthContext } from './authState'
import { clearSession, readSession, saveSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(() => readSession() !== null)
  const [connectionError, setConnectionError] = useState(false)
  const [revision, setRevision] = useState(0)
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const pending = useRef<AbortController | null>(null)

  const logout = useCallback(() => {
    pending.current?.abort()
    clearSession()
    queryClient.clear()
    setAccount(null)
    setConnectionError(false)
    setLoading(false)
  }, [queryClient])

  useEffect(() => {
    const controller = new AbortController()
    pending.current = controller
    const session = readSession()
    if (!session) {
      return () => controller.abort()
    }
    authApi.me(controller.signal)
      .then(setAccount)
      .catch(() => {
        if (!controller.signal.aborted) {
          setAccount(null)
          setConnectionError(readSession() !== null)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])

  useEffect(() => {
    const expired = () => {
      logout()
      void message.info('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }
    const forbidden = () => { void message.error('Bạn không có quyền thực hiện thao tác này') }
    const changed = (event: StorageEvent) => {
      if (event.key === 'restaurant.session') {
        if (event.newValue === null) logout()
        else {
          setLoading(true)
          setConnectionError(false)
          setRevision((value) => value + 1)
        }
      }
    }
    window.addEventListener('auth:expired', expired)
    window.addEventListener('api:forbidden', forbidden)
    window.addEventListener('storage', changed)
    return () => {
      window.removeEventListener('auth:expired', expired)
      window.removeEventListener('api:forbidden', forbidden)
      window.removeEventListener('storage', changed)
    }
  }, [logout, message])

  useEffect(() => {
    const session = readSession()
    if (!account || !session) return
    const timer = window.setTimeout(() => {
      logout()
      void message.info('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }, Math.max(0, Date.parse(session.expiresAt) - Date.now()))
    return () => window.clearTimeout(timer)
  }, [account, logout, message])

  const login = useCallback(async (request: LoginRequest) => {
    const response = await authApi.login(request)
    saveSession({ accessToken: response.accessToken, expiresAt: response.expiresAt })
    queryClient.clear()
    setAccount(response.account)
    setConnectionError(false)
  }, [queryClient])

  const value = useMemo(() => ({ account, loading, login, logout }), [account, loading, login, logout])

  if (connectionError) {
    return <Result status="warning" title="Chưa thể kết nối với hệ thống" subTitle="Kiểm tra kết nối và thử tải lại thông tin đăng nhập."
      extra={<Space><Button type="primary" onClick={() => {
        setLoading(true)
        setConnectionError(false)
        setRevision((current) => current + 1)
      }}>Thử lại</Button>
        <Button onClick={logout}>Về đăng nhập</Button></Space>} />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
