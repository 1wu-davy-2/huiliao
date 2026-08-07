import { useState } from 'react'
import { Download, ShieldAlert, Trash2 } from 'lucide-react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppData } from '@/lib/settings/AppDataContext'
import AppLayout from '@/components/layout/AppLayout'
import OnboardingPage from '@/features/onboarding/OnboardingPage'
import HomePage from '@/features/home/HomePage'
import PracticePage from '@/features/practice/PracticePage'
import ScenarioPage from '@/features/practice/ScenarioPage'
import MessageLabPage from '@/features/lab/MessageLabPage'
import ProgressPage from '@/features/progress/ProgressPage'
import SettingsPage from '@/features/settings/SettingsPage'
import PrivacyPage from '@/features/privacy/PrivacyPage'
import { Modal } from '@/components/ui/Modal'

function StorageRecoveryPage() {
  const { storageRecovery, clearCorruptStorage } = useAppData()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!storageRecovery) return null

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
          检测到当前站点的本地数据无法读取。为避免覆盖原值，应用已暂停进入练习。
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
              当前只显示空白临时状态，原始值尚未被应用改写。你可以先下载原始文本供排查；恢复页不会把内容上传到任何服务器。
            </p>
          </div>
        </div>
        <div className="row mt-24">
          {storageRecovery.rawData !== null && (
            <button type="button" className="btn btn-secondary" onClick={downloadRawData}>
              <Download size={16} aria-hidden="true" />
              下载原始备份
            </button>
          )}
          <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} aria-hidden="true" />
            清除并重新开始
          </button>
        </div>
      </section>

      <Modal open={confirmOpen} title="确认清除无法读取的数据" onClose={() => setConfirmOpen(false)}>
        <p>清除后，当前站点下的原始本地数据将无法由本应用恢复。已下载的备份文件不会被删除。</p>
        <div className="row mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
            取消
          </button>
          <button type="button" className="btn btn-danger" onClick={clearCorruptStorage}>
            确认清除
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
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
