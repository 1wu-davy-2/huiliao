import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TermsPage from '@/features/legal/TermsPage'
import SafetyPage from '@/features/legal/SafetyPage'

// 两页都是纯静态长文，只依赖 Link，不需要 AppDataProvider。
const renderPage = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

/** 取页面纯文本，用于跨元素边界的断言（正文里有 <span> 分段，逐节点匹配会漏）。 */
const pageText = () => document.body.textContent ?? ''

describe('使用条款页', () => {
  it('渲染 h1 标题', () => {
    renderPage(<TermsPage />)
    expect(screen.getByRole('heading', { level: 1, name: '使用条款' })).toBeInTheDocument()
  })

  it('陈述「无账号、无服务器端用户数据」', () => {
    renderPage(<TermsPage />)
    expect(pageText()).toContain('没有注册、没有登录、没有账号，也没有服务器端保存的用户数据')
    expect(pageText()).toContain('没有云同步')
  })

  it('陈述练习数据只存在本机浏览器', () => {
    renderPage(<TermsPage />)
    const text = pageText()
    expect(text).toContain('只写进当前浏览器')
    expect(text).toContain('huiliao:v1')
    expect(text).toContain('huiliao-ai-trials')
  })

  it('声明这不是心理治疗、医疗或法律建议', () => {
    renderPage(<TermsPage />)
    const text = pageText()
    expect(text).toContain('不是心理治疗')
    expect(text).toContain('不构成医疗建议')
    expect(text).toContain('不是法律建议')
    expect(text).toContain('不承诺任何恋爱、约会或关系结果')
  })

  it('声明仅限成年人并说明存在成年确认闸门', () => {
    renderPage(<TermsPage />)
    const text = pageText()
    expect(text).toContain('只面向 18 岁以上的成年人')
    expect(text).toContain('成年确认')
    // 不夸大：这是自主声明，不是身份核验
    expect(text).toContain('不做身份核验')
  })

  it('说明 AI 功能用自带 Key 且只留在内存', () => {
    renderPage(<TermsPage />)
    const text = pageText()
    expect(text).toContain('自己的模型 API Key')
    expect(text).toContain('不提供共享模型')
    expect(text).toContain('只存在于当前页面的内存里')
    expect(text).toContain('不会写入')
    expect(text).toContain('刷新页面即消失')
  })

  it('声明 AGPL-3.0 许可', () => {
    renderPage(<TermsPage />)
    const text = pageText()
    expect(text).toContain('AGPL-3.0')
    expect(text).toContain('LICENSE')
    // 许可 ≠ 服务协议，避免误读
    expect(text).toContain('本身不是一份面向使用者的服务协议')
  })

  it('声明不做统计与追踪', () => {
    renderPage(<TermsPage />)
    expect(pageText()).toContain('不接入分析、埋点、错误上报、广告或跨站跟踪')
  })

  it('末尾标注待法务复核', () => {
    renderPage(<TermsPage />)
    const text = pageText()
    expect(text).toContain('尚待专业法务复核')
    expect(text).toContain('不能当作一份经过审阅的正式协议')
  })

  // 回归闸门：这一页刻意不含任何虚构的法律条文。为真实产品编造有约束力的条款会误导使用者。
  it('不含编造的法律条文', () => {
    renderPage(<TermsPage />)
    const text = pageText()
    for (const forbidden of ['仲裁', '管辖', '适用法律', '责任上限', '不可抗力', '保留权利', '我们保留']) {
      expect(text).not.toContain(forbidden)
    }
  })

  it('标题层级为单个 h1 + 若干 h2，无跳级', () => {
    renderPage(<TermsPage />)
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName[1]))
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    expect(new Set(levels.slice(1))).toEqual(new Set([2]))
  })
})

describe('安全提示页', () => {
  it('渲染 h1 标题', () => {
    renderPage(<SafetyPage />)
    expect(screen.getByRole('heading', { level: 1, name: '安全提示' })).toBeInTheDocument()
  })

  it('把同意与边界作为底线', () => {
    renderPage(<SafetyPage />)
    const text = pageText()
    expect(text).toContain('清醒、自愿、具体、可以随时撤回')
    expect(text).toContain('不是一次性的')
    expect(text).toContain('留出轻松拒绝的空间')
    expect(text).toContain('边界是双向的')
  })

  it('说明模拟对话不预测真实关系结果', () => {
    renderPage(<SafetyPage />)
    const text = pageText()
    expect(text).toContain('不是任何真实的人')
    expect(text).toContain('模拟里顺利，不等于现实中对方会答应')
    expect(text).toContain('模拟里碰壁，也不等于你在现实中做错了什么')
  })

  it('说明分数只衡量自己的表达，不衡量对方感受', () => {
    renderPage(<SafetyPage />)
    const text = pageText()
    // 五维标签与 SKILL_LABELS 一致
    expect(text).toContain('清晰、真诚、倾听、分寸、边界')
    expect(text).toContain('评的是你写下的这段话本身')
    expect(text).toContain('对方的感受')
    expect(text).toContain('没有任何分数能替真实的人回答')
    expect(text).toContain('不是对你的评价')
  })

  it('给出停止信号：该结束对话而非优化说法', () => {
    renderPage(<SafetyPage />)
    const text = pageText()
    expect(text).toContain('正确的下一步是结束，不是换一种措辞再试')
    expect(text).toContain('明确说了不')
    expect(text).toContain('无法清醒判断')
    expect(text).toContain('权力差')
    expect(text).toContain('结束对话不是失败')
  })

  it('声明操控、施压与话术不在功能范围内', () => {
    renderPage(<SafetyPage />)
    const text = pageText()
    expect(text).toContain('操控、施压和话术套路不在功能范围内')
    expect(text).toContain('而不是给出')
    for (const category of ['操控与情绪胁迫', '欺骗', '强迫与施压', '骚扰', '侵犯隐私', '未成年人', '权力差']) {
      expect(text).toContain(category)
    }
    // 不把自动判断说成万无一失
    expect(text).toContain('会有漏判和误判')
  })

  it('以一般性措辞指向专业人士与当地紧急服务', () => {
    renderPage(<SafetyPage />)
    const text = pageText()
    expect(text).toContain('当地紧急服务')
    expect(text).toContain('有资质的心理专业人士')
    expect(text).toContain('请通过当地官方渠道查询最新信息')
  })

  // 回归闸门：不编造具体热线号码——写错的号码比不写更糟。
  // 只按「数字形状」判定：页面本身有一句「本页不提供具体的热线号码」的说明，
  // 按关键词匹配会把这句正当的免责声明也判为违规，故不对措辞下断言。
  it('不含任何具体热线号码', () => {
    renderPage(<SafetyPage />)
    const text = pageText()
    expect(text).not.toMatch(/\d{5,}/)
    expect(text).not.toMatch(/\d{3,}[-\s]\d{3,}/)
    expect(text).toContain('本页不提供具体的热线号码')
  })

  it('标题层级为单个 h1 + 若干 h2，无跳级', () => {
    renderPage(<SafetyPage />)
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName[1]))
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    expect(new Set(levels.slice(1))).toEqual(new Set([2]))
  })
})
