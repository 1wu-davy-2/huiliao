import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '@/lib/settings/AppDataContext'
import PrivacyPage from '@/features/privacy/PrivacyPage'
import { PRIVACY_TOPICS } from '@/content/privacy'
import { privacyTopicSchema } from '@/schemas'

describe('隐私与边界页', () => {
  it('全部主题通过 Zod schema 且为 reviewed', () => {
    for (const topic of PRIVACY_TOPICS) {
      expect(() => privacyTopicSchema.parse(topic)).not.toThrow()
      expect(topic.reviewStatus).toBe('reviewed')
    }
  })

  it('四个页内标签可用 Tab 聚焦与方向键切换', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AppDataProvider>
          <PrivacyPage />
        </AppDataProvider>
      </MemoryRouter>,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/如何区分页面内存/)
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/页面内存/)
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/托管平台/)
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/下载原始备份/)

    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/真实关系里/)

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowRight}')
    expect(tabs[3]).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/成年人自愿情趣与/)
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/设备与云备份/)
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/事后关心和复盘/)
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/安全词只有在双方事先约定/)
  })

  it('每个主题包含原则、示例与停止条件', () => {
    render(
      <MemoryRouter>
        <AppDataProvider>
          <PrivacyPage />
        </AppDataProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('原则')).toBeInTheDocument()
    expect(screen.getByText('对话示例')).toBeInTheDocument()
    expect(screen.getByText('停止条件')).toBeInTheDocument()
  })

  it('键盘不可用时点击标签同样可用', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AppDataProvider>
          <PrivacyPage />
        </AppDataProvider>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('tab', { name: '影像、录音与数字分享' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('不拍、不录、不保存、不分享')
  })
})
