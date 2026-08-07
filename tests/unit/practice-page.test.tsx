import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import PracticePage from '@/features/practice/PracticePage'
import { getPublishedScenarios } from '@/content'
import { SKILL_LABELS } from '@/types'

// 情境库只展示已发布（reviewed）场景
const SCENARIOS = getPublishedScenarios()

function renderPractice() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <PracticePage />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

describe('情境库', () => {
  it('默认展示全部场景', () => {
    renderPractice()
    for (const scenario of SCENARIOS) {
      expect(screen.getByRole('heading', { name: scenario.title })).toBeInTheDocument()
    }
    expect(screen.getByText(`共 ${SCENARIOS.length} 个场景`)).toBeInTheDocument()
  })

  it('按渠道筛选只显示即时消息场景', async () => {
    const user = userEvent.setup()
    renderPractice()
    await user.click(screen.getByRole('button', { name: '即时消息' }))
    const expected = SCENARIOS.filter((s) => s.channel === 'instant')
    for (const scenario of expected) {
      expect(screen.getByRole('heading', { name: scenario.title })).toBeInTheDocument()
    }
    for (const scenario of SCENARIOS.filter((s) => s.channel !== 'instant')) {
      expect(screen.queryByRole('heading', { name: scenario.title })).not.toBeInTheDocument()
    }
  })

  it('组合筛选无结果时显示空状态', async () => {
    const user = userEvent.setup()
    renderPractice()
    // 初次约会（date）均为约会现场渠道，与即时消息无交集
    await user.click(screen.getByRole('button', { name: '初次约会' }))
    await user.click(screen.getByRole('button', { name: '即时消息' }))
    expect(screen.getByText('没有符合条件的场景。试试清除筛选，或调整组合。')).toBeInTheDocument()
  })

  it('清除筛选恢复全部场景', async () => {
    const user = userEvent.setup()
    renderPractice()
    await user.click(screen.getByRole('button', { name: '线下' }))
    expect(screen.getByText(`共 ${SCENARIOS.filter((s) => s.channel === 'offline').length} 个场景`)).toBeInTheDocument()
    const clearButtons = screen.getAllByRole('button', { name: '清除筛选' })
    expect(clearButtons.length).toBeGreaterThanOrEqual(1)
    await user.click(clearButtons[0])
    expect(screen.getByText(`共 ${SCENARIOS.length} 个场景`)).toBeInTheDocument()
  })

  it('“隐私”专题标签筛选出隐私专项场景', async () => {
    const user = userEvent.setup()
    renderPractice()
    await user.click(screen.getByRole('button', { name: '隐私' }))
    const privacyScenarios = SCENARIOS.filter((s) => s.riskTags.includes('隐私'))
    expect(privacyScenarios.length).toBeGreaterThanOrEqual(3)
    for (const scenario of privacyScenarios) {
      expect(screen.getByRole('heading', { name: scenario.title })).toBeInTheDocument()
    }
    for (const scenario of SCENARIOS.filter((s) => !s.riskTags.includes('隐私'))) {
      expect(screen.queryByRole('heading', { name: scenario.title })).not.toBeInTheDocument()
    }
    await user.click(screen.getByRole('button', { name: '清除筛选' }))
    expect(screen.getByText(`共 ${SCENARIOS.length} 个场景`)).toBeInTheDocument()
  })

  it('场景卡展示时长、难度、能力与边界标签', () => {
    renderPractice()
    const first = SCENARIOS[0]
    const card = screen.getByRole('heading', { name: first.title }).closest('article')!
    expect(within(card).getByText(first.difficulty)).toBeInTheDocument()
    expect(within(card).getByText(`约 ${first.durationMinutes} 分钟`)).toBeInTheDocument()
    expect(within(card).getByText(`训练：${SKILL_LABELS[first.skills[0]]}`)).toBeInTheDocument()
    for (const tag of first.riskTags) {
      expect(within(card).getByText(`边界：${tag}`)).toBeInTheDocument()
    }
  })
})
