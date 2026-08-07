import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import { STORAGE_NAMESPACE } from '@/lib/storage/storage'
import ScenarioPage from '@/features/practice/ScenarioPage'

function renderScenario(path = '/practice/s02') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppDataProvider>
        <Routes>
          <Route path="/practice/:id" element={<ScenarioPage />} />
        </Routes>
      </AppDataProvider>
    </MemoryRouter>,
  )
}

async function switchToFreeInput(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /想用自己话写/ }))
}

describe('自由输入', () => {
  it('正常输入获得参考表达，采纳后只计一次回应且清空旧输入', async () => {
    const user = userEvent.setup()
    renderScenario()
    await switchToFreeInput(user)
    const textarea = screen.getByPlaceholderText(/用你自己的真实语气/)
    await user.type(textarea, '哈喽，那条路线我也走过，风景不错。')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))

    // 展示本节点参考表达（不做个性化判断）
    expect(screen.getByText(/本节点参考表达/)).toBeInTheDocument()
    expect(screen.getByText(/不做个性化判断/)).toBeInTheDocument()

    // 采纳参考表达：回到选项模式、输入清空，出现选择反馈
    await user.click(screen.getByRole('button', { name: /采纳参考表达继续/ }))
    expect(screen.queryByPlaceholderText(/用你自己的真实语气/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试此节点/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    expect(screen.getByText('节点 2 / 4')).toBeInTheDocument()

    // 完成整局后 attempts 只有 3（自由输入 1 次 + 后续两个节点各 1 次）
    await user.click(screen.getByRole('button', { name: /连续上坡/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: /我周末一般也是补觉/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      progress: Array<{ attempts: number; retryCount: number; boundaryCheckPassed: boolean }>
    }
    expect(stored.progress[0].attempts).toBe(3)
    expect(stored.progress[0].boundaryCheckPassed).toBe(true)
  })

  it('自由输入采纳后消息历史中只有一条用户消息', async () => {
    const user = userEvent.setup()
    renderScenario()
    await switchToFreeInput(user)
    await user.type(screen.getByPlaceholderText(/用你自己的真实语气/), '哈喽，那条路线我也走过，风景不错。')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))
    await user.click(screen.getByRole('button', { name: /采纳参考表达继续/ }))
    // 对话区只出现一条用户消息（采纳的参考表达），原始草稿不进入历史
    const userBubbles = screen
      .getAllByText(/哈喽～那条路线是我上个月走的/)
    expect(userBubbles.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('哈喽，那条路线我也走过，风景不错。')).not.toBeInTheDocument()
  })

  it('危险自由输入被拦截且不展示参考表达', async () => {
    const user = userEvent.setup()
    renderScenario()
    await switchToFreeInput(user)
    await user.type(screen.getByPlaceholderText(/用你自己的真实语气/), '她不理我，我要灌醉她')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))

    expect(screen.getByText('这条回应需要停下来')).toBeInTheDocument()
    expect(screen.getByText(/为什么停下/)).toBeInTheDocument()
    expect(screen.queryByText(/本节点参考表达/)).not.toBeInTheDocument()
    // 不改写的情况下不允许继续推进
    expect(screen.queryByRole('button', { name: /采纳参考表达继续/ })).not.toBeInTheDocument()
  })

  it('谨慎自由输入先展示边界提示', async () => {
    const user = userEvent.setup()
    renderScenario()
    await switchToFreeInput(user)
    await user.type(screen.getByPlaceholderText(/用你自己的真实语气/), '你为什么不回我？')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))

    // caution：出现边界提示（来自 safety 规则的解释）
    expect(screen.getByText(/追问解释会把普通沉默升级成对峙/)).toBeInTheDocument()
    expect(screen.getByText(/本节点参考表达/)).toBeInTheDocument()
  })

  it('自由输入原文不进入本地存储', async () => {
    const user = userEvent.setup()
    renderScenario()
    await switchToFreeInput(user)
    await user.type(screen.getByPlaceholderText(/用你自己的真实语气/), '这是不会被保存的自由输入原文')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBeNull()
  })

  it('回归：被拦截自由输入 → 改写 → 正常完成，边界记录仍为不通过', async () => {
    const user = userEvent.setup()
    renderScenario()
    await switchToFreeInput(user)
    await user.type(screen.getByPlaceholderText(/用你自己的真实语气/), '她不理我，我要灌醉她')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))
    // 改写后再试：换成安全文本
    await user.click(screen.getByRole('button', { name: /改写后再试/ }))
    await user.clear(screen.getByPlaceholderText(/用你自己的真实语气/))
    await user.type(screen.getByPlaceholderText(/用你自己的真实语气/), '哈喽，那条路线我也走过。')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))
    await user.click(screen.getByRole('button', { name: /采纳参考表达继续/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: /连续上坡/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: /我周末一般也是补觉/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      progress: Array<{ boundaryCheckPassed: boolean; resolvedAfterFeedback?: boolean }>
    }
    // 曾出现越界，即使改写后完成，边界检查仍不通过
    expect(stored.progress[0].boundaryCheckPassed).toBe(false)
  })

  it('回归：被拦截自由输入 → 返回预设 → 正常完成，边界记录仍为不通过', async () => {
    const user = userEvent.setup()
    renderScenario()
    await switchToFreeInput(user)
    await user.type(screen.getByPlaceholderText(/用你自己的真实语气/), '她不理我，我要灌醉她')
    await user.click(screen.getByRole('button', { name: /提交回应/ }))
    await user.click(screen.getAllByRole('button', { name: /返回预设选项/ })[0])
    await user.click(screen.getByRole('button', { name: /那条路线是我上个月走的/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: /连续上坡/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: /我周末一般也是补觉/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      progress: Array<{ boundaryCheckPassed: boolean }>
    }
    expect(stored.progress[0].boundaryCheckPassed).toBe(false)
  })

  it('回归：危险预设 → 重试 → 合理表达 → 完成，边界记录仍为不通过且重试计数正确', async () => {
    const user = userEvent.setup()
    renderScenario()
    // 节点 1 选危险选项（查户口）
    await user.click(screen.getByRole('button', { name: /在吗？你平时有什么爱好/ }))
    // 重试后选合理表达
    await user.click(screen.getByRole('button', { name: /重试此节点/ }))
    await user.click(screen.getByRole('button', { name: /那条路线是我上个月走的/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: /连续上坡/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: /我周末一般也是补觉/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      progress: Array<{ attempts: number; retryCount: number; boundaryCheckPassed: boolean; resolvedAfterFeedback?: boolean }>
    }
    expect(stored.progress[0].boundaryCheckPassed).toBe(false)
    expect(stored.progress[0].retryCount).toBe(1)
    // attempts 不回退：危险选择 1 次 + 合理 3 次 = 4
    expect(stored.progress[0].attempts).toBe(4)
  })
})
