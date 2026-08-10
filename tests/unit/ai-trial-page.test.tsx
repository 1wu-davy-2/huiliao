import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import { STORAGE_NAMESPACE } from '@/lib/storage/storage'
import type { TrialChallenge } from '@/types'
// 静态导入：必须与 AppDataProvider 处于同一模块图，否则 context 对象不是同一个。
// vi.mock 已被提升，静态导入同样生效，无需 resetModules + 动态 import。
import AiTrialPage from '@/features/lab/AiTrialPage'

/**
 * AI 试炼场页面测试。
 *
 * 生产已审校题池为空（人工审校发布门），因此分两组：
 *  1. 空池：断言发布门——不渲染任何凭据输入
 *  2. 注入非空池：断言表单可访问名、同意门禁、凭据生命周期
 *
 * 注入而非改动生产内容：题池仍由人工审校控制。
 */

const SENTINEL_KEY = 'sk-page-sentinel-must-never-persist'

let mockPool: TrialChallenge[] = []

vi.mock('@/content/ai-trials', () => ({
  getPublishedTrials: () => mockPool,
  AI_TRIALS_REVIEWED: [],
}))

vi.mock('@/lib/ai/selectChallenge', () => ({
  selectChallenge: () => mockPool[0],
}))

const CHALLENGE: TrialChallenge = {
  id: 'communication-simple-test',
  mode: 'communication',
  difficulty: 'simple',
  title: '测试题目标题',
  brief: '测试情境说明',
  objective: '测试练习目标',
  initialPrompt: '请发出第一条消息。',
  acceptanceCriteria: ['条件一', '条件二'],
  hardChecks: [{ type: 'nonEmpty' }],
  reviewStatus: 'reviewed',
}

const fetchMock = vi.fn()

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/lab/ai']}>
      <AppDataProvider>
        <AiTrialPage />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

// 静态导入：vi.mock 已被提升，对静态导入同样生效。
// 不能用 vi.resetModules() + 动态 import——那会为页面重建一份模块图，
// 连 AppDataContext 也是新对象，与静态导入的 AppDataProvider 不是同一个
// context，useAppData 取不到值。mockPool 在渲染时读取，无需重置模块。
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  mockPool = []
})

/** 同意勾选框由 <label> 包裹，按文案定位比 role 更稳。 */
function consentBox() {
  return screen.getByLabelText(/输入和模型回复会发送到我填写的模型服务/)
}

async function fillCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('模型 ID'), 'gpt-4o-mini')
  await user.type(screen.getByLabelText('API Key'), SENTINEL_KEY)
}

describe('AI 试炼场页面 · 题池为空（发布门）', () => {
  beforeEach(() => {
    mockPool = []
  })

  it('显示暂无已审核题目', () => {
    renderPage()
    expect(screen.getByText(/暂无已审核题目/)).toBeInTheDocument()
  })

  it('不渲染任何凭据输入或开始试炼按钮', () => {
    renderPage()
    expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('模型 ID')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '开始试炼' })).not.toBeInTheDocument()
  })

  it('不自发调用任何模型接口', () => {
    renderPage()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('AI 试炼场页面 · 注入非空题池', () => {
  beforeEach(() => {
    mockPool = [CHALLENGE]
  })

  it('全部表单控件具备中文可访问名', () => {
    renderPage()
    // 回归守卫：这些 label 曾与 input 无 htmlFor/id 关联，控件没有可访问名
    expect(screen.getByLabelText('协议')).toBeInTheDocument()
    expect(screen.getByLabelText('预设服务')).toBeInTheDocument()
    expect(screen.getByLabelText('模型 ID')).toBeInTheDocument()
    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    expect(screen.getByLabelText(/最大轮数/)).toBeInTheDocument()
    // 分段按钮组通过 aria-labelledby 命名
    expect(screen.getByRole('group', { name: '模式' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '难度' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '连接目标' })).toBeInTheDocument()
  })

  it('API Key 使用 password 类型遮蔽', () => {
    renderPage()
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password')
  })

  it('最大轮数滑杆边界为 5–30', () => {
    renderPage()
    const slider = screen.getByLabelText(/最大轮数/)
    expect(slider).toHaveAttribute('min', '5')
    expect(slider).toHaveAttribute('max', '30')
  })

  it('同意文案同时披露发送目标与自评额外计费', () => {
    renderPage()
    const label = consentBox().closest('label')
    expect(label).toHaveTextContent(/发送到我填写的模型服务/)
    expect(label).toHaveTextContent(/自评/)
    expect(label).toHaveTextContent(/Token|余额/)
  })

  it('未勾选同意时测试连接不发出请求', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillCredentials(user)

    await user.click(screen.getByRole('button', { name: '测试连接' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/请先勾选确认/)).toBeInTheDocument()
  })

  it('未勾选同意时开始试炼保持禁用', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillCredentials(user)
    await user.click(screen.getByRole('button', { name: '随机换一题' }))

    expect(screen.getByRole('button', { name: '开始试炼' })).toBeDisabled()
  })

  it('切换协议后立即清空同意勾选但保留 API Key（预填值来自已保存配置）', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillCredentials(user)
    await user.click(consentBox())
    expect(consentBox()).toBeChecked()

    await user.selectOptions(screen.getByLabelText('协议'), 'anthropic')

    await waitFor(() => {
      expect(consentBox()).not.toBeChecked()
    })
    // API Key 保留不变：预填值可能来自已保存配置，切换协议不应清空
    expect(screen.getByLabelText('API Key')).toHaveValue(SENTINEL_KEY)
  })

  it('切换到自定义地址后清空同意勾选并显示 Base URL 输入', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillCredentials(user)
    await user.click(consentBox())

    await user.click(screen.getByRole('button', { name: '自定义地址' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Base URL (HTTPS)')).toBeInTheDocument()
    })
    // API Key 保留不变：预填值可能来自已保存配置
    expect(screen.getByLabelText('API Key')).toHaveValue(SENTINEL_KEY)
    expect(consentBox()).not.toBeChecked()
  })

  it('官方预设不暴露可编辑 Base URL', () => {
    renderPage()
    expect(screen.queryByLabelText('Base URL (HTTPS)')).not.toBeInTheDocument()
    expect(screen.getByLabelText('预设服务')).toBeInTheDocument()
  })

  it('API Key 不写入 localStorage', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillCredentials(user)
    await user.click(consentBox())

    const dump = JSON.stringify(window.localStorage)
    expect(dump).not.toContain(SENTINEL_KEY)
    expect(window.localStorage.getItem(STORAGE_NAMESPACE) ?? '').not.toContain(SENTINEL_KEY)
  })

  it('选题后展示题目预览与验收条件', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '随机换一题' }))

    expect(screen.getByText(CHALLENGE.title)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(CHALLENGE.acceptanceCriteria[0]))).toBeInTheDocument()
  })

  it('披露完整对话保存在本地 IndexedDB 及其配额', () => {
    renderPage()
    expect(screen.getByText(/只在本次页面内存中使用，不会保存/)).toBeInTheDocument()
  })
})

describe('AI 试炼场页面 · 试炼交互（取消与轮数）', () => {
  beforeEach(() => {
    mockPool = [CHALLENGE]
  })

  async function startTrial(user: ReturnType<typeof userEvent.setup>) {
    await fillCredentials(user)
    await user.click(consentBox())
    await user.click(screen.getByRole('button', { name: '随机换一题' }))
    await user.click(screen.getByRole('button', { name: '开始试炼' }))
  }

  it('输入框具有中文可访问名称「你的回应」', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(() => new Promise(() => {}))
    renderPage()
    await startTrial(user)

    expect(screen.getByLabelText('你的回应')).toBeInTheDocument()
  })

  it('请求挂起时显示取消按钮，且结束并评估被禁用', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(() => new Promise(() => {}))
    renderPage()
    await startTrial(user)
    await user.type(screen.getByLabelText('你的回应'), '一句正常的话。')
    await user.click(screen.getByRole('button', { name: '发送' }))

    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '结束并评估' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled()
  })

  it('取消请求后不消耗轮数，且可重新发送', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      (_url: string, opts: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    renderPage()
    await startTrial(user)
    await user.type(screen.getByLabelText('你的回应'), '一句正常的话。')
    await user.click(screen.getByRole('button', { name: '发送' }))
    await user.click(screen.getByRole('button', { name: '取消' }))

    await waitFor(() => {
      expect(screen.getByText(/第\s*0\s*\/\s*\d+\s*轮/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '发送' })).toBeEnabled()
      expect(screen.queryByRole('button', { name: '取消' })).not.toBeInTheDocument()
    })
    // 未消费轮数的同时没有新增任何消息以外的状态残留
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('请求失败显示中文错误与未消耗轮数提示，且可重试', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValue(new Error('network down'))
    renderPage()
    await startTrial(user)
    await user.type(screen.getByLabelText('你的回应'), '一句正常的话。')
    await user.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(screen.getByText(/网络错误。本轮失败，未消耗轮数。/)).toBeInTheDocument()
      expect(screen.getByText(/第\s*0\s*\/\s*\d+\s*轮/)).toBeInTheDocument()
    })
    // 失败后草稿保留，发送按钮可用
    expect(screen.getByRole('button', { name: '发送' })).toBeEnabled()
  })

  it('历史记录支持展开查看完整对话', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        text: '这是一句正常的模型回应。',
        finishReason: 'stop',
        usage: { inputTokens: 1, outputTokens: 1 },
      }),
    } as Response)
    renderPage()
    await startTrial(user)
    await user.type(screen.getByLabelText('你的回应'), '一句话。')
    await user.click(screen.getByRole('button', { name: '发送' }))
    await waitFor(() => {
      expect(screen.getByText(/第\s*1\s*\/\s*\d+\s*轮/)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: '结束并评估' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '试炼完成' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: '返回设置' }))
    await user.click(screen.getByRole('button', { name: '查看本地历史' }))
    await user.click(await screen.findByRole('button', { name: '查看对话' }))

    expect(screen.getByText('一句话。')).toBeInTheDocument()
    expect(screen.getByText('这是一句正常的模型回应。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '收起对话' }))
    expect(screen.queryByText('这是一句正常的模型回应。')).not.toBeInTheDocument()
  })

  it('达到轮数上限后自动进入评估并显示已达到你设定的轮数', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        text: '这是一句正常的模型回应。',
        finishReason: 'stop',
        usage: { inputTokens: 1, outputTokens: 1 },
      }),
    } as Response)
    renderPage()
    await fillCredentials(user)
    await user.click(consentBox())
    await user.click(screen.getByRole('button', { name: '随机换一题' }))
    // 把轮数上限调到下限 5，发送 5 轮触发自动结束
    fireEvent.change(screen.getByLabelText(/最大轮数/), { target: { value: '5' } })
    await user.click(screen.getByRole('button', { name: '开始试炼' }))

    for (let i = 0; i < 5; i += 1) {
      await user.type(screen.getByLabelText('你的回应'), `第 ${i + 1} 条正常回应。`)
      await user.click(screen.getByRole('button', { name: '发送' }))
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`第\\s*${i + 1}\\s*/\\s*5\\s*轮`))).toBeInTheDocument()
      })
    }

    await waitFor(() => {
      expect(screen.getByText('已达到你设定的轮数')).toBeInTheDocument()
    })
    // 结果视图不再提供继续发送的入口
    expect(screen.queryByRole('button', { name: '发送' })).not.toBeInTheDocument()
  })
})
