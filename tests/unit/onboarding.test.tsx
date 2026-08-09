import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import { STORAGE_NAMESPACE } from '@/lib/storage/storage'
import OnboardingPage from '@/features/onboarding/OnboardingPage'

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <OnboardingPage />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

describe('首次设置', () => {
  it('未确认 18+ 时不能继续', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(screen.getByRole('alert')).toHaveTextContent('18 岁')
  })

  it('确认 18+ 后进入困难选择', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('checkbox', { name: /我已年满 18 岁/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(screen.getByRole('checkbox', { name: /不知道怎么开口/ })).toBeInTheDocument()
  })

  it('困难最多选择两项', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    // 困难与成年确认同处第一步；不勾成年，使 checked 计数只反映困难项
    const options = [
      /不知道怎么开口/,
      /聊天容易冷场/,
      /不敢表达好感/,
      /害怕被拒绝/,
      /不确定如何把握边界/,
    ]
    for (const name of options) {
      await user.click(screen.getByRole('checkbox', { name }))
    }
    const checked = screen.getAllByRole('checkbox', { checked: true })
    expect(checked).toHaveLength(2)
  })

  it('未完成基线与原则不能完成设置', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('checkbox', { name: /我已年满 18 岁/ }))
    await user.click(screen.getByRole('checkbox', { name: /不知道怎么开口/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    await user.click(screen.getByRole('button', { name: '完成并进入首页' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请完成全部题目并逐条确认原则')
  })

  it('完整走完两步后写入本地设置', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('checkbox', { name: /我已年满 18 岁/ }))
    await user.click(screen.getByRole('checkbox', { name: /不知道怎么开口/ }))
    await user.click(screen.getByRole('checkbox', { name: /害怕被拒绝/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    await user.click(screen.getByRole('radio', { name: /退一步停止追问/ }))
    await user.click(screen.getByRole('radio', { name: /具体的时间、地点/ }))
    await user.click(screen.getByRole('radio', { name: /暂停并确认/ }))
    await user.click(screen.getByRole('checkbox', { name: /真实表达/ }))
    await user.click(screen.getByRole('checkbox', { name: /让对方容易拒绝/ }))
    await user.click(screen.getByRole('checkbox', { name: /拒绝后停止/ }))
    await user.click(screen.getByRole('button', { name: '完成并进入首页' }))

    const raw = window.localStorage.getItem(STORAGE_NAMESPACE)
    expect(raw).not.toBeNull()
    const stored = JSON.parse(raw!)
    expect(stored.settings.isAdultConfirmed).toBe(true)
    expect(stored.settings.onboardingCompleted).toBe(true)
    expect(stored.settings.selectedChallenges).toEqual(['start', 'fear'])
  })
})
