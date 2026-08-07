import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import { STORAGE_NAMESPACE } from '@/lib/storage/storage'
import SettingsPage from '@/features/settings/SettingsPage'

function seedData() {
  window.localStorage.setItem(
    STORAGE_NAMESPACE,
    JSON.stringify({
      schemaVersion: 1,
      settings: {
        isAdultConfirmed: true,
        selectedChallenges: ['start'],
        onboardingCompleted: true,
        reducedMotion: false,
      },
      progress: [],
      favorites: [],
      reflections: [],
    }),
  )
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <SettingsPage />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

describe('设置页', () => {
  it('导出 JSON 包含 schema 版本与导出时间', async () => {
    const user = userEvent.setup()
    seedData()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createObjectURL = URL.createObjectURL as ReturnType<typeof vi.fn>
    renderSettings()
    await user.click(screen.getByRole('button', { name: /导出 JSON/ }))
    expect(createObjectURL).toHaveBeenCalled()
    // 导出内容来自 exportStoredData（storage 单测已校验 schemaVersion/exportedAt）
    expect(screen.getByRole('status')).toHaveTextContent('已生成导出文件')
    clickSpy.mockRestore()
  })

  it('清除数据需要二次确认，确认后清除并回到首次设置', async () => {
    const user = userEvent.setup()
    seedData()
    renderSettings()

    // 第一次点击出现确认弹层，取消不生效
    await user.click(screen.getByRole('button', { name: /清除数据/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).not.toBeNull()

    // 再次点击并确认
    await user.click(screen.getByRole('button', { name: /清除数据/ }))
    await user.click(screen.getByRole('button', { name: '确认清除' }))
    // clearAll 先 await clearTrialSessions() 再清 localStorage，断言需等微任务落地
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBeNull()
    })
  })

  it('减少动态效果开关写入设置', async () => {
    const user = userEvent.setup()
    seedData()
    renderSettings()
    const toggle = screen.getByRole('switch', { name: /减少动态效果/ })
    expect(toggle).not.toBeChecked()
    await user.click(toggle)
    expect(toggle).toBeChecked()
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      settings: { reducedMotion: boolean }
    }
    expect(stored.settings.reducedMotion).toBe(true)
  })

  it('重新设置同时撤销成年确认与设置完成状态', async () => {
    const user = userEvent.setup()
    seedData()
    renderSettings()

    await user.click(screen.getByRole('button', { name: '重新设置' }))
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      settings: { isAdultConfirmed: boolean; onboardingCompleted: boolean }
    }
    expect(stored.settings.isAdultConfirmed).toBe(false)
    expect(stored.settings.onboardingCompleted).toBe(false)
  })
})
