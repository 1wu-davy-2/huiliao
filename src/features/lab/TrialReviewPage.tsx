import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'

/**
 * 占位页。批次 4 接 IndexedDB 读取单次会话转录 + 5 维评分。
 * 现阶段一律渲染空状态：不读库、不抛错、不写 console，
 * 保证 app-mount.spec.ts 的零 console error 闸门在本路由上成立。
 */
export default function TrialReviewPage() {
  return (
    <div className="fade-in">
      <header className="page-head">
        <h1 className="page-title">本次训练总结</h1>
        <p className="page-sub">单次 AI 情景模拟的复盘：对话回放与五个维度的表现。</p>
      </header>
      <div className="empty">
        <FileText size={22} aria-hidden="true" />
        <p>没有找到这条训练记录。记录只存在本机浏览器里，清理过浏览器数据或换过域名都会导致读不到。</p>
        <Link className="btn btn-secondary" to="/lab/ai">
          回到 AI 情景模拟
        </Link>
      </div>
    </div>
  )
}
