import { describe, expect, it } from 'vitest'
import { analyzeMessage } from '@/lib/analysis/analyze'
import type { LabContext } from '@/types'

const POSITIVE: LabContext = { stage: 'matched', purpose: 'invite', responseStatus: 'positive' }

describe('analyzeMessage', () => {
  it('正常邀约返回 ok 并提供三种示例', () => {
    const result = analyzeMessage(POSITIVE, '周末天气不错，你有空的话一起散个步，没空就下次')
    expect(result.status).toBe('ok')
    expect(result.examples).toHaveLength(3)
    expect(result.examples.map((e) => e.tone)).toEqual(['直接', '轻松', '稳重'])
    expect(result.stopCondition.length).toBeGreaterThan(0)
  })

  it('连续提问造成审问感 → caution', () => {
    const result = analyzeMessage(
      { ...POSITIVE, purpose: 'continue' },
      '你吃饭了吗？几点下班？住哪？周末干嘛？',
    )
    expect(result.status).toBe('caution')
    expect(result.concerns.join('')).toContain('盘问')
    expect(result.scores.listening).toBeLessThan(78)
  })

  it('邀约缺少具体时间地点 → caution', () => {
    const result = analyzeMessage(POSITIVE, '我们见一面吧')
    expect(result.status).toBe('caution')
    expect(result.concerns.join('')).toContain('时间或地点')
  })

  it('邀约缺少拒绝出口 → caution', () => {
    const result = analyzeMessage(POSITIVE, '周六见个面吧')
    expect(result.status).toBe('caution')
    expect(result.concerns.join('')).toContain('拒绝')
  })

  it('大段自我输出且不回应对方 → caution', () => {
    const longText =
      '我今天加班到很晚回家做饭，周末要去爬山还要修电脑，下周出差去深圳，最近看了一部讲人工智能的电影，还打算报个健身课，顺便学一下做菜，感觉生活充实了很多，还准备约朋友露营，想换个新工作，房子也在看，月底还有一次体检要安排。'
    const result = analyzeMessage(
      { ...POSITIVE, purpose: 'continue' },
      longText,
    )
    expect(result.status).toBe('caution')
    expect(result.concerns.join('')).toContain('自我输出')
  })

  it('安全拦截时 blocked 且不提供示例', () => {
    const result = analyzeMessage(POSITIVE, '我想灌醉她然后带走')
    expect(result.status).toBe('blocked')
    expect(result.examples).toEqual([])
    expect(result.concerns.length).toBeGreaterThan(0)
    expect(result.stopCondition.length).toBeGreaterThan(0)
  })

  it('caution 输入只提供两个低压力示例', () => {
    const result = analyzeMessage(POSITIVE, '你必须来，一定要见面')
    expect(result.status).toBe('caution')
    expect(result.examples.length).toBeLessThanOrEqual(2)
  })

  it('对方已拒绝时停止条件明确', () => {
    const result = analyzeMessage(
      { ...POSITIVE, responseStatus: 'rejection' },
      '周末天气不错，你有空的话一起散个步，没空就下次',
    )
    expect(result.stopCondition).toContain('最后一条')
  })

  it('文本出现拒绝信号时覆盖误选的积极状态，不生成推进示例', () => {
    const result = analyzeMessage(POSITIVE, '她已经拒绝我了，我想再约一次')
    expect(result.status).toBe('caution')
    expect(result.stopCondition).toContain('最后一条')
    // 不出现邀约推进示例（时间地点/咖啡店等），只出现接受与停止的表达
    expect(result.examples.map((e) => e.text).join('')).toContain('我尊重你的决定')
    expect(result.examples.map((e) => e.text).join('')).not.toContain('咖啡')
  })

  it('“她说不要，但我还是想继续”必须拦截且示例为空', () => {
    const result = analyzeMessage(POSITIVE, '她说不要，但我还是想继续')
    expect(result.status).toBe('blocked')
    expect(result.examples).toEqual([])
  })

  it('偷拍、传播与规避发现输入必须拦截', () => {
    for (const text of [
      '把她发给我的私密照片转给朋友看看',
      '偷拍她不会被发现的方法',
      '怎么录音不让她知道',
    ]) {
      const result = analyzeMessage(POSITIVE, text)
      expect(result.status, text).toBe('blocked')
      expect(result.examples).toEqual([])
    }
  })

  it('改写原则：有问题时输出“优先修改 + 推荐结构”', () => {
    const result = analyzeMessage(POSITIVE, '我们见一面吧')
    expect(result.rewritePrinciple).toContain('优先修改')
    expect(result.rewritePrinciple).toContain('推荐结构')
    expect(result.rewritePrinciple).not.toContain('保持')
  })

  it('改写原则：无问题时输出“保留优点 + 换成自己的语气”', () => {
    const result = analyzeMessage(POSITIVE, '周末天气不错，你有空的话一起散个步，没空就下次')
    expect(result.rewritePrinciple).toContain('保留')
    expect(result.rewritePrinciple).toContain('换成你自己的真实语气')
  })

  it('倾听判定：文本里恰好出现“你”不算回应意识', () => {
    // “你的方法不错”不是对对方内容的回应（无具体指代）
    const result = analyzeMessage(
      { ...POSITIVE, purpose: 'continue' },
      '你的方法不错，我今天下午去公园跑步，晚上回家做饭，周末还要去超市采购，顺便把房间收拾一下，下周准备出趟短差，最近还看了一本书，讲的是历史方面的内容，写得挺有意思的，另外还打算报名学一门课，月底还要搬家，行程排得比较满，时间基本都用在工作上了。',
    )
    expect(result.concerns.join('')).toContain('自我输出')
  })

  it('倾听判定：回应对方具体内容时判定为有倾听意识', () => {
    const result = analyzeMessage(
      { ...POSITIVE, purpose: 'continue' },
      '你上次说的那家店，我后来去试了，还挺好。你说到的那道菜确实值得点。',
    )
    expect(result.strengths.join('')).toContain('回应对方')
  })

  it('自然度：正常内容四条自然表达均为 ok 且原则给出“保留优点 + 换语气”', () => {
    const cases = [
      { text: '周末天气不错，你有空的话一起散个步，没空就下次', purpose: 'invite' as const },
      { text: '你上次说的那家店我去试了，挺好', purpose: 'continue' as const },
      { text: '我对你挺有好感，你不需要现在回应我', purpose: 'express' as const },
      { text: '明白了，我尊重你的决定，不再继续', purpose: 'end' as const },
    ]
    for (const c of cases) {
      const result = analyzeMessage({ ...POSITIVE, purpose: c.purpose }, c.text)
      expect(result.status, c.text).toBe('ok')
      expect(result.rewritePrinciple).toContain('保留')
      expect(result.rewritePrinciple).toContain('换成你自己的真实语气')
    }
  })

  it('自然度：谨慎、拒绝与拦截各有至少两条代表输入', () => {
    const cautionCases = ['你为什么不回我？', '我为你做了那么多，你却不领情']
    for (const text of cautionCases) {
      const result = analyzeMessage({ ...POSITIVE, purpose: 'continue' }, text)
      expect(result.status, text).toBe('caution')
      expect(result.examples.length).toBeGreaterThan(0)
    }
    const rejectionCases = ['我已经拒绝你了，别再联系我', '不用再约了，到此为止吧']
    for (const text of rejectionCases) {
      const result = analyzeMessage({ ...POSITIVE, purpose: 'invite' }, text)
      expect(result.status, text).toBe('caution')
      expect(result.examples.every((e) => e.text.includes('不再联系') || e.text.includes('收') || e.text.includes('接受')))
    }
    const blockedCases = ['她说不要，但我还是想继续', '把她发给我的私密照片转给朋友看看']
    for (const text of blockedCases) {
      const result = analyzeMessage(POSITIVE, text)
      expect(result.status, text).toBe('blocked')
      expect(result.examples).toEqual([])
    }
  })

  it('五维分数全部在 0–100 区间', () => {
    const texts = ['随便写点东西', '你为什么每次都不回我消息', '我想约你周末去公园散步，没空也没关系']
    for (const text of texts) {
      const result = analyzeMessage(POSITIVE, text)
      for (const value of Object.values(result.scores)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
    }
  })
})
