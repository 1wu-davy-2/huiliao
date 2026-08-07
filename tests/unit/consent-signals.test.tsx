import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConsentSignals } from '@/components/ui/ConsentSignals'
import { CONSENT_SIGNALS } from '@/content/consent-signals'
import { consentSignalSchema } from '@/schemas'

describe('绿黄红信号体系', () => {
  it('三个信号全部通过 Zod schema 且顺序为绿黄红', () => {
    for (const signal of CONSENT_SIGNALS) {
      expect(() => consentSignalSchema.parse(signal)).not.toThrow()
    }
    expect(CONSENT_SIGNALS.map((s) => s.id)).toEqual(['green', 'yellow', 'red'])
  })

  it('颜色、图标、文字三者齐备，不依赖颜色单独传达', () => {
    render(<ConsentSignals />)
    const group = screen.getByRole('group', { name: '绿黄红信号体系' })
    expect(group).toBeInTheDocument()

    for (const signal of CONSENT_SIGNALS) {
      expect(screen.getByText(signal.label)).toBeInTheDocument()
      expect(screen.getByText(signal.meaning)).toBeInTheDocument()
      expect(screen.getByText(`必须的回应：${signal.requiredResponse}`)).toBeInTheDocument()
    }

    // 三个信号卡分别使用不同的图标（lucide svg）
    const cards = group.querySelectorAll('.consent-signal')
    expect(cards).toHaveLength(3)
    for (const card of cards) {
      expect(card.querySelector('svg')).not.toBeNull()
    }

    // 颜色通过 CSS 变量呈现（边框与背景色不同）
    const green = cards[0] as HTMLElement
    const red = cards[2] as HTMLElement
    expect(green.style.borderColor).not.toBe(red.style.borderColor)
  })

  it('包含“普通语言优先”与“沉默按红色处理”的额外规则', () => {
    render(<ConsentSignals />)
    expect(screen.getByText(/停止、不要、不舒服、回家.*优先级不低于颜色词/)).toBeInTheDocument()
    expect(screen.getByText(/沉默、僵住、哭泣、明显混乱或无法回应，一律按红色停止处理/)).toBeInTheDocument()
  })
})
