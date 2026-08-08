import { useState } from 'react'
import { Download, RefreshCcw, ShieldAlert, Trash2 } from 'lucide-react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppData } from '@/lib/settings/AppDataContext'
import AppLayout from '@/components/layout/AppLayout'
import OnboardingPage from '@/features/onboarding/OnboardingPage'
import HomePage from '@/features/home/HomePage'
import PracticePage from '@/features/practice/PracticePage'
import ScenarioPage from '@/features/practice/ScenarioPage'
import MessageLabPage from '@/features/lab/MessageLabPage'
import AiTrialPage from '@/features/lab/AiTrialPage'
import ProgressPage from '@/features/progress/ProgressPage'
import SettingsPage from '@/features/settings/SettingsPage'
import PrivacyPage from '@/features/privacy/PrivacyPage'
import { Modal } from '@/components/ui/Modal'

function StorageRecoveryPage() {
  const {
    storageRecovery,
    storageRecoveryError,
    retryStorage,
    clearCorruptStorage,
  } = useAppData()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)

  if (!storageRecovery) return null

  const recoveryMessage =
    storageRecovery.reason === 'unsupported-version'
      ? '检测到当前版本无法识别的本地数据。为避免降级或丢失字段，应用已暂停进入练习。'
      : storageRecovery.reason === 'storage-unavailable'
        ? '浏览器拒绝访问本地存储。应用已暂停读写，请先检查浏览器隐私或站点存储权限。'
        : '检测到当前站点的本地数据无法读取。为避免覆盖原值，应用已暂停进入练习。'

  const downloadRawData = () => {
    if (storageRecovery.rawData === null) return
    const blob = new Blob([storageRecovery.rawData], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `huiliao-unreadable-backup-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main id="main-content" className="content storage-recovery-page">
      <header className="page-head">
        <h1 className="page-title">本地数据需要处理</h1>
        <p className="page-sub" role="alert">
          {recoveryMessage}
        </p>
      </header>

      <section className="card" aria-labelledby="storage-recovery-title">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <ShieldAlert size={22} color="var(--warning)" aria-hidden="true" />
          <div>
            <h2 className="section-title" id="storage-recovery-title">
              先备份，再决定是否清除
            </h2>
            <p className="muted mt-8">
              {storageRecovery.reason === 'storage-unavailable'
                ? '请先恢复当前站点的存储权限，再重新读取。应用不会在无法读取原数据时提供清除操作。'
                : '当前只显示空白临时状态，应用不会用默认值覆盖原数据。若原始文本可读取，你可以先下载备份供排查；恢复页不会把内容上传到任何服务器。'}
            </p>
          </div>
        </div>
        {storageRecoveryError && (
          <p className="small mt-16" role="alert">
            {storageRecoveryError}
          </p>
        )}
        <div className="row mt-24">
          <button type="button" className="btn btn-secondary" onClick={retryStorage}>
            <RefreshCcw size={16} aria-hidden="true" />
            重新读取本地数据
          </button>
          {storageRecovery.rawData !== null && (
            <button type="button" className="btn btn-secondary" onClick={downloadRawData}>
              <Download size={16} aria-hidden="true" />
              下载原始备份
            </button>
          )}
          {storageRecovery.reason !== 'storage-unavailable' && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={16} aria-hidden="true" />
              清除并重新开始
            </button>
          )}
        </div>
      </section>

      <Modal open={confirmOpen} title="确认清除无法读取的数据" onClose={() => setConfirmOpen(false)}>
        <p>清除后，当前站点下的原始本地数据将无法由本应用恢复。已下载的备份文件不会被删除。</p>
        {clearError !== null && (
          <p className="form-error" role="alert">
            {clearError}
          </p>
        )}
        <div className="row mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={clearing}
            onClick={async () => {
              setClearError(null)
              setClearing(true)
              try {
                await clearCorruptStorage()
              } catch {
                // 两个存储都未确认清空时不谎报成功，保持确认框可见供重试
                setClearError('清除未完成：本地对话记录无法删除，数据未改动。请重试。')
              } finally {
                setClearing(false)
              }
            }}
          >
            {clearing ? '清除中…' : '确认清除'}
          </button>
        </div>
      </Modal>
    </main>
  )
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { data } = useAppData()
  const location = useLocation()
  // 成年确认与首次设置必须同时完成；矛盾状态（已完成设置但未确认成年）一律回到首次设置
  if (!data.settings.onboardingCompleted || !data.settings.isAdultConfirmed) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />
  }
  return children
}

export default function App() {
  const { storageRecovery } = useAppData()

  if (storageRecovery) return <StorageRecoveryPage />

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        element={
          <RequireOnboarding>
            <AppLayout />
          </RequireOnboarding>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/:id" element={<ScenarioPage />} />
        <Route path="/lab" element={<MessageLabPage />} />
        <Route path="/lab/ai" element={<AiTrialPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
