import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

const GOOD1 = /那条路线是我上个月走的/
const GOOD2 = /连续上坡/
const GOOD3 = /我周末一般也是补觉/

describe('模拟对话页', () => {
  it('未找到场景时显示空状态', () => {
    renderScenario('/practice/nope')
    expect(screen.getByText(/没有找到这个练习场景/)).toBeInTheDocument()
  })

  it('展示角色卡、背景与节点一消息', () => {
    renderScenario()
    expect(screen.getByText('林璐 · 26 岁')).toBeInTheDocument()
    expect(screen.getByText('虚构练习角色')).toBeInTheDocument()
    expect(screen.getByText(/一次徒步兴趣活动上认识林璐/)).toBeInTheDocument()
    expect(screen.getByText(/哈喽，今天活动上你讲的那个徒步路线/)).toBeInTheDocument()
  })

  it('选择选项后展示反馈，重试可回到节点', async () => {
    const user = userEvent.setup()
    renderScenario()
    await user.click(screen.getByRole('button', { name: GOOD1 }))
    expect(screen.getByText(/做得好的地方/)).toBeInTheDocument()
    expect(screen.getByText(/可能带来的感受/)).toBeInTheDocument()
    expect(screen.getByText(/一个关键修改/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试此节点/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /重试此节点/ }))
    expect(screen.queryByText(/做得好的地方/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: GOOD1 })).toBeEnabled()
  })

  it('危险选项有边界提示且反馈为警告样式', async () => {
    const user = userEvent.setup()
    renderScenario()
    await user.click(screen.getByRole('button', { name: /在吗？你平时有什么爱好/ }))
    expect(screen.getByText(/边界提示：/)).toBeInTheDocument()
    expect(screen.getByText(/连续提问像查户口/)).toBeInTheDocument()
  })

  it('走完节点到达结局并写入完成记录', async () => {
    const user = userEvent.setup()
    renderScenario()
    await user.click(screen.getByRole('button', { name: GOOD1 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: GOOD2 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: GOOD3 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))

    expect(screen.getByText(/练习结束/)).toBeInTheDocument()
    expect(screen.getByText('自然收尾，话题留待下次')).toBeInTheDocument()
    expect(screen.getByText('边界检查通过')).toBeInTheDocument()
    expect(screen.getByText(/现实小任务/)).toBeInTheDocument()

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      progress: Array<{ scenarioId: string; attempts: number; boundaryCheckPassed: boolean }>
    }
    expect(stored.progress).toHaveLength(1)
    expect(stored.progress[0].scenarioId).toBe('s02')
    expect(stored.progress[0].attempts).toBe(3)
    expect(stored.progress[0].boundaryCheckPassed).toBe(true)
  })

  it('选择过危险选项的完成记录边界检查不通过', async () => {
    const user = userEvent.setup()
    renderScenario()
    await user.click(screen.getByRole('button', { name: GOOD1 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    // 危险选项直达冷却结局，不再续走
    await user.click(screen.getByRole('button', { name: /下次我带你去走一条更难的/ }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))

    expect(screen.getByText(/练习结束/)).toBeInTheDocument()
    expect(screen.getByText('本次有越界尝试，已标注')).toBeInTheDocument()
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      progress: Array<{ boundaryCheckPassed: boolean }>
    }
    expect(stored.progress[0].boundaryCheckPassed).toBe(false)
  })

  it('保存复盘写入本地且结局视图可返回情境库', async () => {
    const user = userEvent.setup()
    renderScenario()
    await user.click(screen.getByRole('button', { name: GOOD1 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: GOOD2 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: GOOD3 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))

    const textarea = screen.getByPlaceholderText(/写下这次练习中你注意到的/)
    await user.type(textarea, '复盘：今天提问少了，分享多了')
    await user.click(screen.getByRole('button', { name: '保存复盘' }))
    expect(screen.getByText('已保存')).toBeInTheDocument()

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_NAMESPACE)!) as {
      reflections: Array<{ text: string }>
    }
    expect(stored.reflections).toHaveLength(1)
    expect(stored.reflections[0].text).toBe('复盘：今天提问少了，分享多了')
  })

  it('结局的复盘问题来自数据且不小于两个', async () => {
    const user = userEvent.setup()
    renderScenario()
    await user.click(screen.getByRole('button', { name: GOOD1 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: GOOD2 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    await user.click(screen.getByRole('button', { name: GOOD3 }))
    await user.click(screen.getByRole('button', { name: /^继续$/ }))
    const reviewList = screen.getByRole('heading', { name: '复盘' }).parentElement!
    expect(within(reviewList).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2)
  })
})
