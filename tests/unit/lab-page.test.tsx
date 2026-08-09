import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import MessageLabPage from '@/features/lab/MessageLabPage'

function renderLab() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <MessageLabPage />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

async function selectContext(user: ReturnType<typeof userEvent.setup>, status = 'positive') {
  await user.selectOptions(screen.getByLabelText('关系阶段'), 'chatting')
  await user.selectOptions(screen.getByLabelText('沟通目的'), 'invite')
  await user.selectOptions(screen.getByLabelText('对方回应状态'), status)
}

describe('消息实验室', () => {
  it('顶部面包屑返回训练中心', () => {
    renderLab()
    const back = screen.getByRole('link', { name: '返回训练中心' })
    expect(back).toHaveAttribute('href', '/lab')
    // 原两页签导航已被入口页取代，此处不应再出现 AI 试炼场页签
    expect(screen.queryByRole('link', { name: 'AI 试炼场' })).not.toBeInTheDocument()
  })

  it('未选择完整上下文时不能诊断', async () => {
    const user = userEvent.setup()
    renderLab()
    await user.type(screen.getByPlaceholderText(/粘贴或输入你想诊断的消息草稿/), '周末有空一起散步吗')
    await user.click(screen.getByRole('button', { name: '开始诊断' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请先选择关系阶段')
  })

  it('载入示例自动填入上下文与草稿并得到三类结果', async () => {
    const user = userEvent.setup()
    renderLab()
    await user.click(screen.getByRole('button', { name: /低压力邀约/ }))
    await user.click(screen.getByRole('button', { name: '开始诊断' }))
    expect(screen.getByText('三种自然版本')).toBeInTheDocument()
    expect(screen.getByText('直接', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('轻松', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('稳重', { exact: true })).toBeInTheDocument()
  })

  it('谨慎内容先展示边界风险', async () => {
    const user = userEvent.setup()
    renderLab()
    await selectContext(user)
    await user.type(screen.getByPlaceholderText(/粘贴或输入你想诊断的消息草稿/), '我为你做了那么多，你却不领情')
    await user.click(screen.getByRole('button', { name: '开始诊断' }))
    expect(screen.getByText(/先看一下这两个风险/)).toBeInTheDocument()
    expect(screen.getAllByText(/强调付出、要求回应/).length).toBeGreaterThan(0)
  })

  it('危险内容只显示拦截与安全替代，无任何改写', async () => {
    const user = userEvent.setup()
    renderLab()
    await selectContext(user)
    await user.type(screen.getByPlaceholderText(/粘贴或输入你想诊断的消息草稿/), '把她灌醉然后带去酒店')
    await user.click(screen.getByRole('button', { name: '开始诊断' }))
    expect(screen.getByText('这条内容不会被继续处理')).toBeInTheDocument()
    expect(screen.getByText(/安全替代：/)).toBeInTheDocument()
    expect(screen.queryByText('三种自然版本')).not.toBeInTheDocument()
    expect(screen.queryByText('直接', { exact: true })).not.toBeInTheDocument()
  })

  it('对方明确拒绝时不输出推进关系的示例', async () => {
    const user = userEvent.setup()
    renderLab()
    await selectContext(user, 'rejection')
    await user.type(screen.getByPlaceholderText(/粘贴或输入你想诊断的消息草稿/), '周末有空一起散步吗')
    await user.click(screen.getByRole('button', { name: '开始诊断' }))
    // 不出现邀约推进示例（invite 目的专属文案）
    expect(screen.queryByText(/时间、地点、活动都具体/)).not.toBeInTheDocument()
    expect(screen.queryByText(/周末天气不错，听说公园的花开了/)).not.toBeInTheDocument()
    // 只出现接受与停止的表达
    expect(screen.getAllByText(/我不会再联系你/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/对方已拒绝或要求停止/).length).toBeGreaterThanOrEqual(1)
  })

  it('原始草稿与自行重写不持久化', async () => {
    const user = userEvent.setup()
    renderLab()
    await user.click(screen.getByRole('button', { name: /低压力邀约/ }))
    await user.click(screen.getByRole('button', { name: '开始诊断' }))
    await user.type(screen.getByPlaceholderText(/看完示例后/), '我的重写版本内容')
    await user.click(screen.getByRole('button', { name: '保存我的版本' }))
    const keys = Object.keys(window.localStorage)
    for (const key of keys) {
      expect(window.localStorage.getItem(key)).not.toContain('我的重写版本内容')
    }
    expect(window.localStorage.getItem('huiliao:v1')).toBeNull()
  })
})
