import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Cpu,
  Dumbbell,
  Home,
  LogOut,
  Plus,
  Settings,
  TrendingUp,
} from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import AiConfigModal from '@/features/lab/AiConfigModal'

/** 一级导航 4 项，侧栏与底栏共用。`match` 是该入口应高亮的路径前缀集合：
 *  训练中心收纳了 /practice 与 /lab/*，NavLink 的 end 判断无法表达，故自行比对。 */
const NAV_ITEMS = [
  { to: '/home', label: '首页', icon: Home, match: ['/home'] },
  { to: '/lab', label: '训练中心', icon: Dumbbell, match: ['/practice', '/lab'] },
  { to: '/progress', label: '进度统计', icon: TrendingUp, match: ['/progress'] },
  { to: '/settings', label: '设置', icon: Settings, match: ['/settings'] },
]

const PAGE_CONTEXT: Record<string, string> = {
  '/home': '训练工作台',
  '/practice': '情境库',
  '/lab': '训练中心',
  '/lab/message': '消息诊断',
  '/lab/ai': 'AI 情景模拟',
  '/lab/ai/review': '训练复盘',
  '/progress': '能力与复盘',
  '/settings': '设置与隐私',
  '/privacy': '隐私与边界',
  '/terms': '使用条款',
  '/safety': '安全提示',
}

/** `/` 只精确匹配；其余按路径段前缀匹配，'/lab' 命中 '/lab/message' 但不命中 '/labs'。 */
function matchesPath(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** PAGE_CONTEXT 原为精确查表，参数化路由（如 /practice/:id、复盘路由）会静默落到兜底值。
 *  改为取最长命中前缀，参数段不参与匹配。 */
function resolveContext(pathname: string): string {
  let best = ''
  for (const key of Object.keys(PAGE_CONTEXT)) {
    if (matchesPath(pathname, key) && key.length > best.length) best = key
  }
  return best === '' ? '练习场景' : PAGE_CONTEXT[best]
}

function Brand() {
  return (
    <div className="brand">
      {/* 装饰性品牌标记：必须显式定尺寸，无内在尺寸的 SVG 会按 300×150 撑宽侧栏 */}
      <span className="brand-mark">
        <img src="/images/brand-mark.svg" alt="" aria-hidden="true" width={32} height={32} />
      </span>
      <span className="brand-text">
        <span className="brand-name">会聊</span>
        <span className="brand-tagline">成年人的关系沟通练习场</span>
      </span>
    </div>
  )
}

function NavItems({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
        const active = match.some((prefix) => matchesPath(pathname, prefix))
        return (
          <Link
            key={to}
            to={to}
            className="nav-link"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span className="nav-label">{label}</span>
          </Link>
        )
      })}
    </>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const { data } = useAppData()
  const context = resolveContext(location.pathname)
  const [showAiConfig, setShowAiConfig] = useState(false)
  const hasAiConfig = !!data.aiConfig?.apiKey

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-cta">
          <Link to="/practice" className="btn btn-primary btn-pill btn-block" aria-label="开始新对话">
            <Plus size={18} aria-hidden="true" />
            <span className="nav-label">开始新对话</span>
          </Link>
        </div>
        <nav className="sidebar-nav" aria-label="主导航">
          <NavItems pathname={location.pathname} />
        </nav>
        <div className="sidebar-footer">
          {/* 本应用无账号，"退出" 实为清除本地数据，可访问名须说明这一点 */}
          <Link to="/settings" className="nav-link" aria-label="退出与清除本地数据">
            <LogOut size={20} aria-hidden="true" />
            <span className="nav-label">退出</span>
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <span className="topbar-title">会聊</span>
          <span className="topbar-context">/ {context}</span>
          <span className="topbar-actions">
            <button
              className={`topbar-glyph ai-config-btn${hasAiConfig ? ' configured' : ''}`}
              onClick={() => setShowAiConfig(true)}
              aria-label="AI 连接配置"
              title={hasAiConfig ? 'AI 配置已就绪' : 'AI 连接未配置'}
            >
              <Cpu size={18} aria-hidden="true" />
            </button>
          </span>
        </header>
        <main id="main-content" className="content">
          <Outlet />
          <footer className="app-footer">
            <span>© 2026 会聊</span>
            <span className="footer-links">
              <Link to="/privacy">隐私协议</Link>
              <Link to="/terms">使用条款</Link>
              <Link to="/safety">安全提示</Link>
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="主导航（移动端）">
        <NavItems pathname={location.pathname} />
      </nav>
      <span className="visually-hidden">
        当前状态：{data.settings.onboardingCompleted ? '已设置完成' : '尚未完成首次设置'}
      </span>
      {showAiConfig && <AiConfigModal onClose={() => setShowAiConfig(false)} />}
    </div>
  )
}
