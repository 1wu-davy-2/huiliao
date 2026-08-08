import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import { STORAGE_NAMESPACE } from '@/lib/storage/storage'
import ProgressPage from '@/features/progress/ProgressPage'

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
      progress: [
        {
          scenarioId: 's02',
          completedAt: '2026-08-06T10:00:00.000Z',
          attempts: 3,
          scores: { clarity: 80, authenticity: 70, listening: 75, pace: 66, boundaries: 62 },
          boundaryCheckPassed: true,
        },
        {
          scenarioId: 's07',
          completedAt: '2026-08-05T10:00:00.000Z',
          attempts: 2,
          scores: { clarity: 60, authenticity: 65, listening: 60, pace: 58, boundaries: 40 },
          boundaryCheckPassed: false,
        },
      ],
      favorites: ['s02'],
      reflections: [
        { id: 'r-1', scenarioId: 's02', createdAt: '2026-08-06T10:05:00.000Z', text: '复盘一：提问太多' },
      ],
    }),
  )
}

function renderProgress() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <ProgressPage />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

describe('进度页', () => {
  it('无记录时显示空状态', () => {
    renderProgress()
    expect(screen.getByText(/还没有完成过情境练习/)).toBeInTheDocument()
    expect(screen.getByText(/还没有保存过复盘/)).toBeInTheDocument()
    // 不把默认数值伪装成真实能力结果：无记录时不显示伪造的 60 分
    expect(screen.getByText(/没有数据时不显示默认分数/)).toBeInTheDocument()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
  })

  it('展示完成记录、边界正确率、收藏与复盘', () => {
    seedData()
    renderProgress()
    // 场景标题同时出现在完成记录与收藏区，用出现次数断言
    expect(screen.getAllByText('刚加好友后的第一轮聊天').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('对方拒绝邀约后体面结束').length).toBeGreaterThanOrEqual(1)
    // 边界正确率 1/2 = 50%
    expect(screen.getByText('50%')).toBeInTheDocument()
    // 复盘内容
    expect(screen.getByText('复盘一：提问太多')).toBeInTheDocument()
  })

  it('可删除复盘', async () => {
    const user = userEvent.setup()
    seedData()
    renderProgress()
    await user.click(screen.getByRole('button', { name: '删除这条复盘' }))
    expect(screen.queryByText('复盘一：提问太多')).not.toBeInTheDocument()
    expect(screen.getByText(/还没有保存过复盘/)).toBeInTheDocument()
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      reflections: unknown[]
    }
    expect(stored.reflections).toHaveLength(0)
  })

  it('可取消收藏', async () => {
    const user = userEvent.setup()
    seedData()
    renderProgress()
    // 按可及名称定位收藏区，不依赖标题的 DOM 嵌套层级
    const favSection = screen.getByRole('region', { name: '收藏' })
    await user.click(within(favSection).getByRole('button', { name: '取消收藏' }))
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      favorites: string[]
    }
    expect(stored.favorites).toEqual([])
  })
})
