import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  FlaskConical,
  Home,
  LayoutList,
  MessageCircle,
  Settings,
} from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: Home },
  { to: '/practice', label: '练习', icon: LayoutList },
  { to: '/lab', label: '实验室', icon: FlaskConical },
  { to: '/progress', label: '进度', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
]

const PAGE_CONTEXT: Record<string, string> = {
  '/': '训练工作台',
  '/practice': '情境库',
  '/lab': '消息实验室',
  '/progress': '能力与复盘',
  '/settings': '设置与隐私',
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <MessageCircle size={18} />
      </span>
      <span className="brand-text">
        <span className="brand-name">会聊</span>
        <span className="brand-tagline">成年人的关系沟通练习场</span>
      </span>
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const { data } = useAppData()
  const context =
    PAGE_CONTEXT[location.pathname] ?? '练习场景'

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="主导航">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="nav-link" end={to === '/'}>
              <Icon size={20} aria-hidden="true" />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <span className="topbar-title">会聊</span>
          <span className="topbar-context">/ {context}</span>
        </header>
        <main id="main-content" className="content">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="主导航（移动端）">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="nav-link" end={to === '/'}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <span className="visually-hidden">
        当前状态：{data.settings.onboardingCompleted ? '已设置完成' : '尚未完成首次设置'}
      </span>
    </div>
  )
}
