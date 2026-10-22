import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { BrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

dayjs.locale('vi')

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={viVN} theme={{
      token: {
        colorPrimary: '#176b77', colorText: '#172f3e', colorBgLayout: '#f4f7fa',
        colorTextDescription: '#617381', colorTextPlaceholder: '#617381',
        borderRadius: 8, fontFamily: "'Segoe UI', Arial, sans-serif", controlHeightLG: 48,
      },
      components: { Menu: { itemSelectedBg: '#e5f2f3', itemSelectedColor: '#12525b' } },
    }}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
