import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('heading', { name: /今天想练点什么/ })).toBeInTheDocument()
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

    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBeNull()
    expect(screen.getByRole('heading', { name: '首次设置' })).toBeInTheDocument()
  })

  it('运行期间本地数据损坏后，下一次写操作进入恢复页且不覆盖原值', async () => {
    const user = userEvent.setup()
    renderAt('/practice', true)
    const raw = '{{{ 运行期间损坏'
    window.localStorage.setItem(STORAGE_NAMESPACE, raw)

    await user.click(screen.getAllByRole('button', { name: '收藏' })[0])

    expect(screen.getByRole('heading', { name: '本地数据需要处理' })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBe(raw)
  })

  it('存储权限恢复后可重新读取原数据，不提供盲目清除入口', async () => {
    const user = userEvent.setup()
    const raw = JSON.stringify({
      schemaVersion: 1,
      settings: {
        isAdultConfirmed: true,
        selectedChallenges: ['start'],
        onboardingCompleted: true,
        reducedMotion: false,
      },
      progress: [],
      favorites: ['s02'],
      reflections: [],
    })
    window.localStorage.setItem(STORAGE_NAMESPACE, raw)
    const originalGetItem = Storage.prototype.getItem
    let denied = true
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key,
    ) {
      if (denied) throw new DOMException('denied', 'SecurityError')
      return originalGetItem.call(this, key)
    })

    renderAt('/')
    expect(screen.getByRole('alert')).toHaveTextContent('浏览器拒绝访问本地存储')
    expect(screen.queryByRole('button', { name: '清除并重新开始' })).not.toBeInTheDocument()

    denied = false
    await user.click(screen.getByRole('button', { name: '重新读取本地数据' }))

    expect(screen.getByRole('heading', { name: /今天想练点什么/ })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBe(raw)
    getItemSpy.mockRestore()
  })

  it('清除损坏数据失败时显示反馈并保留原值', async () => {
    const user = userEvent.setup()
    const raw = '{{{ 无法解析'
    window.localStorage.setItem(STORAGE_NAMESPACE, raw)
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    renderAt('/')

    await user.click(screen.getByRole('button', { name: '清除并重新开始' }))
    await user.click(screen.getByRole('button', { name: '确认清除' }))

    expect(screen.getByText(/清除失败，原数据未被删除/)).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBe(raw)
    removeSpy.mockRestore()
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
    expect(screen.getByRole('heading', { name: /今天想练点什么/ })).toBeInTheDocument()
  })

})
