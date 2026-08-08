import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { within } from '@testing-library/react'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import { STORAGE_NAMESPACE } from '@/lib/storage/storage'
import App from '@/app/App'

function renderAt(path: string, seeded = false) {
  if (seeded) {
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
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

describe('路由与首次设置门禁', () => {
  it('未完成首次设置时访问首页被重定向到首次设置', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: '首次设置' })).toBeInTheDocument()
  })

  it('未完成首次设置时深层路由同样被重定向', () => {
    renderAt('/practice/s02')
    expect(screen.getByRole('heading', { name: '首次设置' })).toBeInTheDocument()
  })

  it('未知路由回退到首页（未设置时回退到首次设置）', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: '首次设置' })).toBeInTheDocument()
  })

  it('完成后各页面可直接打开', () => {
    renderAt('/practice', true)
    expect(screen.getByRole('heading', { name: '情境库' })).toBeInTheDocument()
  })

  it('完成后访问首页展示工作台而非首次设置', () => {
    renderAt('/', true)
    expect(screen.getByRole('heading', { name: /今天练哪一场/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '首次设置' })).not.toBeInTheDocument()
  })

  it('矛盾状态（已设置但未确认成年）重定向到首次设置', () => {
    window.localStorage.setItem(
      STORAGE_NAMESPACE,
      JSON.stringify({
        schemaVersion: 1,
        settings: {
          isAdultConfirmed: false,
          selectedChallenges: ['start'],
          onboardingCompleted: true,
          reducedMotion: false,
        },
        progress: [],
        favorites: [],
        reflections: [],
      }),
    )
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppDataProvider>
          <App />
        </AppDataProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: '首次设置' })).toBeInTheDocument()
  })

  it('损坏数据时阻止进入应用，并允许确认清除后重新开始', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_NAMESPACE, '{{{ 无法解析')
    renderAt('/')

    expect(screen.getByRole('alert')).toHaveTextContent('本地数据无法读取')
    expect(screen.getByRole('heading', { name: '本地数据需要处理' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '清除并重新开始' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认清除' }))

    // clearCorruptStorage 先清 IndexedDB 再清 localStorage，断言需等微任务落地
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBeNull()
    })
    expect(screen.getByRole('heading', { name: '首次设置' })).toBeInTheDocument()
  })

  it('五个一级导航入口均可到达', async () => {
    const user = userEvent.setup()
    renderAt('/', true)
    const nav = screen.getByRole('navigation', { name: '主导航' })
    await user.click(within(nav).getByRole('link', { name: '练习' }))
    expect(screen.getByRole('heading', { name: '情境库' })).toBeInTheDocument()
    await user.click(within(nav).getByRole('link', { name: '实验室' }))
    expect(screen.getByRole('heading', { name: '消息实验室' })).toBeInTheDocument()
    await user.click(within(nav).getByRole('link', { name: '进度' }))
    expect(screen.getByRole('heading', { name: '进度与复盘' })).toBeInTheDocument()
    await user.click(within(nav).getByRole('link', { name: '设置' }))
    expect(screen.getByRole('heading', { name: '设置与隐私' })).toBeInTheDocument()
    await user.click(within(nav).getByRole('link', { name: '首页' }))
    expect(screen.getByRole('heading', { name: /今天练哪一场/ })).toBeInTheDocument()
  })

})
