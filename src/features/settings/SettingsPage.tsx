import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, RefreshCcw, ShieldAlert, Trash2 } from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import { exportStoredData } from '@/lib/storage/storage'
import { Modal } from '@/components/ui/Modal'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { data, updateSettings, resetSettings, clearAll } = useAppData()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exported, setExported] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)

  const exportJson = () => {
    const json = exportStoredData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `huiliao-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setExported(true)
  }

  // clearAll 现在会 await IndexedDB（试炼完整对话）清理。
  // 失败必须显式暴露：不能在未真正清空的情况下关掉弹层并跳转，谎报成功。
  const handleClear = async () => {
    setClearError(null)
    setClearing(true)
    try {
      await clearAll()
    } catch {
      setClearError('清除失败：保存完整试炼对话的本地数据库未能清空，本地数据未变更。请重试。')
      return
    } finally {
      setClearing(false)
    }
    setConfirmOpen(false)
    navigate('/onboarding', { replace: true })
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">设置与隐私</h1>
        <p className="page-sub">管理你的本地数据、动效偏好，以及重新进行首次设置。</p>
      </header>

      <section className="section" aria-labelledby="principles-title">
        <h2 className="section-title" id="principles-title">
          产品原则
        </h2>
        <div className="card mt-16">
          <ul className="stack">
            <li>只训练你能控制的表达和行为，不承诺任何恋爱或关系结果。</li>
            <li>每句表达都留出轻松的拒绝空间；收到拒绝或停止信号后不再推进。</li>
            <li>亲密练习只训练双方意愿表达、同意确认、暂停和退出。</li>
          </ul>
          <p className="small muted mt-16" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <ShieldAlert size={16} className="mt-8" aria-hidden="true" />
            涉及操控、欺骗、强迫、灌酒、纠缠、偷拍、未成年人或明显权力差的意图，产品不会提供执行建议。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="prefs-title">
        <h2 className="section-title" id="prefs-title">
          偏好
        </h2>
        <div className="card mt-16">
          <div className="list-row">
            <div>
              <p className="bold">减少动态效果</p>
              <p className="small muted">关闭页面切换和动画过渡，减少视觉刺激。</p>
            </div>
            <label className="switch" htmlFor="reduced-motion">
              <input
                id="reduced-motion"
                type="checkbox"
                role="switch"
                aria-label="减少动态效果"
                checked={data.settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
              />
              <span aria-hidden="true" />
            </label>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="privacy-title">
        <h2 className="section-title" id="privacy-title">
          数据说明
        </h2>
        <div className="card mt-16">
          <p className="bold">保存在本浏览器的内容</p>
          <ul className="stack mt-8">
            <li>首次设置：成年确认、选择的困难和动效偏好。基线判断题的答案不保存。</li>
            <li>进度：完成的情境、提交回应次数、重试次数、五维能力变化；同一场景重复练习只保留最近一次记录。</li>
            <li>收藏的情境，以及你主动点击“保存复盘”的原文；复盘也会进入导出文件，请勿写入可识别的敏感信息。</li>
          </ul>
          <p className="bold mt-16">不保存的内容</p>
          <ul className="stack mt-8">
            <li>消息实验室草稿和模拟对话自由输入原文不会写入 localStorage；它们只在当前页面内存中保留到清空、离开或刷新。</li>
            <li>首次设置中的三道基线判断题答案。</li>
          </ul>
          <p className="small muted mt-16">
            训练输入不发送到应用服务器。网站托管平台仍会为提供静态文件处理 IP、User-Agent、请求路径等基础请求元数据；项目不启用广告、用户画像、跨站跟踪或可选分析。清除只影响当前站点的 huiliao:v1，不会删除已下载的导出或损坏备份文件。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="privacy-link-title">
        <h2 className="section-title" id="privacy-link-title">
          隐私与边界
        </h2>
        <div className="card mt-16">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <p className="bold">隐私与边界手册</p>
              <p className="small muted">
                应用数据处理、聊天与身份隐私、影像与分享、成年人情趣边界四个主题。
              </p>
            </div>
            <Link to="/privacy" className="btn btn-secondary">
              查看手册
            </Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="actions-title">
        <h2 className="section-title" id="actions-title">
          数据操作
        </h2>
        <div className="card mt-16">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <p className="bold">导出数据</p>
              <p className="small muted">下载包含 schema 版本与导出时间的 JSON 文件。</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={exportJson}>
              <Download size={16} aria-hidden="true" />
              导出 JSON
            </button>
          </div>
          {exported && (
            <p className="small muted mt-8" role="status">
              已生成导出文件，请检查下载目录。
            </p>
          )}
          <hr className="divider" />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <p className="bold">清除全部数据</p>
              <p className="small muted">删除本浏览器保存的所有设置、进度、收藏与复盘。</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={16} aria-hidden="true" />
              清除数据
            </button>
          </div>
          <hr className="divider" />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <p className="bold">重新进行首次设置</p>
              <p className="small muted">回到成年确认与困难选择，可以重新开始。</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                resetSettings()
                navigate('/onboarding', { replace: true })
              }}
            >
              <RefreshCcw size={16} aria-hidden="true" />
              重新设置
            </button>
          </div>
        </div>
      </section>

      <Modal open={confirmOpen} title="确认清除全部数据" onClose={() => setConfirmOpen(false)}>
        <p>
          这将删除本浏览器中保存的首次设置、进度、收藏、全部复盘，以及 AI 试炼场的完整对话记录（IndexedDB），且无法恢复。建议先导出备份。
        </p>
        {clearError !== null && (
          <p className="field-error" role="alert">
            {clearError}
          </p>
        )}
        <div className="row mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
            取消
          </button>
          <button type="button" className="btn btn-danger" onClick={handleClear} disabled={clearing}>
            {clearing ? '清除中…' : '确认清除'}
          </button>
        </div>
      </Modal>
    </>
  )
}
