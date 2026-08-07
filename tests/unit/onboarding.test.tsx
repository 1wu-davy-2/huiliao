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
    await user.click(screen.getByRole('checkbox', { name: /我已年满 18 岁/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
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

  it('未完成三题基线不能进入原则步骤', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('checkbox', { name: /我已年满 18 岁/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    await user.click(screen.getByRole('checkbox', { name: /不知道怎么开口/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请完成本步骤')
  })

  it('完整走完四步后写入本地设置', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('checkbox', { name: /我已年满 18 岁/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    await user.click(screen.getByRole('checkbox', { name: /不知道怎么开口/ }))
    await user.click(screen.getByRole('checkbox', { name: /害怕被拒绝/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    await user.click(screen.getByRole('radio', { name: /退一步停止追问/ }))
    await user.click(screen.getByRole('radio', { name: /具体的时间、地点/ }))
    await user.click(screen.getByRole('radio', { name: /暂停并确认/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
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
