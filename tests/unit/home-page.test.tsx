import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import { STORAGE_NAMESPACE } from '@/lib/storage/storage'
import HomePage from '@/features/home/HomePage'

const DAY = 24 * 3600 * 1000

// s02 时长 5 分钟、s07 时长 6 分钟；completedAt 用相对当下的时间，
// 以免 7 天窗口断言随真实日期漂移。
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
          completedAt: new Date(Date.now() - 2 * DAY).toISOString(),
          attempts: 3,
          scores: { clarity: 80, authenticity: 70, listening: 75, pace: 66, boundaries: 62 },
          boundaryCheckPassed: true,
        },
        {
          scenarioId: 's07',
          completedAt: new Date(Date.now() - 30 * DAY).toISOString(),
          attempts: 2,
          scores: { clarity: 60, authenticity: 65, listening: 60, pace: 58, boundaries: 40 },
          boundaryCheckPassed: false,
        },
      ],
      favorites: [],
      reflections: [
        {
          id: 'r-1',
          scenarioId: 's02',
          createdAt: new Date(Date.now() - 2 * DAY).toISOString(),
          text: '复盘一：提问太多',
        },
      ],
    }),
  )
}

function renderHome() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <HomePage />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

describe('首页', () => {
  it('只有一个 h1，且标题保持「今天练哪一场」', () => {
    const { container } = renderHome()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: /今天练哪一场/ })).toBeInTheDocument()
  })

  it('分节标题不跳级：h1 之下只有 h2', () => {
    const { container } = renderHome()
    expect(container.querySelectorAll('h3, h4, h5, h6')).toHaveLength(0)
    expect(container.querySelectorAll('h2').length).toBeGreaterThan(0)
  })

  it('保留用户口吻的「我现在卡在……」，不采用设计稿的「情境探索」', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: '我现在卡在……' })).toBeInTheDocument()
    expect(screen.queryByText('情境探索')).not.toBeInTheDocument()
  })

  it('最近复盘标题带装饰图标，且图标不进入可访问名', () => {
    renderHome()
    const heading = screen.getByRole('heading', { name: '最近复盘' })
    const glyph = heading.querySelector('svg')
    expect(glyph).not.toBeNull()
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
  })

  it('五个卡点入口直达对应情境', () => {
    renderHome()
    const targets = ['/practice/s02', '/practice/s04', '/practice/s06', '/practice/s07', '/practice/s08']
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items.map((el) => el.getAttribute('href'))).toEqual(targets)
  })

  it('保留既有数据推导：7 天窗口与累计时长', () => {
    seedData()
    renderHome()
    // 两条记录中只有一条落在 7 天内
    expect(screen.getByText(/本周已完成 1 个情境练习/)).toBeInTheDocument()
    const aside = screen.getByRole('complementary', { name: '能力成长' })
    expect(within(aside).getByText('1')).toBeInTheDocument()
    // 累计时长按 durationMinutes 累加：s02(5) + s07(6) = 11
    expect(within(aside).getByText('11')).toBeInTheDocument()
    expect(screen.getByText('复盘一：提问太多')).toBeInTheDocument()
  })

  it('无记录时不显示默认分数，复盘区走空状态', () => {
    renderHome()
    expect(screen.getByText(/没有数据时不显示默认分数/)).toBeInTheDocument()
    expect(screen.getByText(/还没有保存过复盘/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '五维能力概况' })).not.toBeInTheDocument()
  })
})
