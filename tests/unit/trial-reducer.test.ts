import { describe, expect, it } from 'vitest'
import { createInitialState, trialReducer } from '@/lib/ai/trialReducer'

describe('trialReducer', () => {
  it('初始状态为 setup', () => {
    const s = createInitialState()
    expect(s.phase).toBe('setup')
    expect(s.roundsUsed).toBe(0)
    expect(s.messages).toHaveLength(0)
    expect(s.pendingRequestId).toBeNull()
  })

  it('START 进入 running，接受指定轮数', () => {
    const s = trialReducer(createInitialState(), { type: 'START', roundLimit: 15 })
    expect(s.phase).toBe('running')
    expect(s.roundLimit).toBe(15)
  })

  it('接受恰好设定轮数的提交', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 3 })
    for (let i = 0; i < 3; i++) {
      s = trialReducer(s, { type: 'SUBMIT', requestId: `req-${i}`, content: `message ${i}` })
      s = trialReducer(s, { type: 'MODEL_RESPONSE', requestId: `req-${i}`, content: `reply ${i}` })
    }
    expect(s.roundsUsed).toBe(3)
    expect(s.phase).toBe('evaluating')
    expect(s.messages).toHaveLength(6) // 3 user + 3 assistant
  })

  it('请求挂起时阻止重复提交', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'req-1', content: 'first' })
    // 第二次提交应被忽略
    const s2 = trialReducer(s, { type: 'SUBMIT', requestId: 'req-2', content: 'second' })
    expect(s2.pendingRequestId).toBe('req-1')
    expect(s2.messages).toHaveLength(1)
  })

  it('忽略不匹配的过期响应', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'req-1', content: 'msg' })
    // 过期 requestId 被忽略
    const s2 = trialReducer(s, { type: 'MODEL_RESPONSE', requestId: 'req-2', content: 'stale' })
    expect(s2.pendingRequestId).toBe('req-1')
    expect(s2.roundsUsed).toBe(0)
  })

  it('达到上限时转换到 evaluating', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 5 })
    for (let i = 0; i < 5; i++) {
      s = trialReducer(s, { type: 'SUBMIT', requestId: `r${i}`, content: `m${i}` })
      s = trialReducer(s, { type: 'MODEL_RESPONSE', requestId: `r${i}`, content: `r${i}` })
    }
    expect(s.roundsUsed).toBe(5)
    expect(s.phase).toBe('evaluating')
    // 第六次提交被忽略
    const s2 = trialReducer(s, { type: 'SUBMIT', requestId: 'r6', content: 'extra' })
    expect(s2.messages).toHaveLength(10)
  })

  it('允许提前结束', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'r1', content: 'm1' })
    s = trialReducer(s, { type: 'MODEL_RESPONSE', requestId: 'r1', content: 'r1' })
    s = trialReducer(s, { type: 'FINISH' })
    expect(s.phase).toBe('evaluating')
    expect(s.roundsUsed).toBe(1)
  })

  it('保留上游错误不增加轮数', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'r1', content: 'msg' })
    expect(s.roundsUsed).toBe(0)
    s = trialReducer(s, { type: 'REQUEST_FAILED', requestId: 'r1', errorCode: 'UPSTREAM_TIMEOUT' })
    expect(s.roundsUsed).toBe(0)
    expect(s.pendingRequestId).toBeNull()
    expect(s.errorCode).toBe('UPSTREAM_TIMEOUT')
    // 失败后可以重试
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'r2', content: 'retry' })
    expect(s.pendingRequestId).toBe('r2')
  })

  it('拒绝空提交', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'r1', content: '' })
    expect(s.messages).toHaveLength(0)
  })

  it('拒绝超长消息', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'r1', content: 'x'.repeat(8001) })
    expect(s.messages).toHaveLength(0)
  })

  it('CANCEL_REQUEST 清除挂起状态', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'r1', content: 'msg' })
    s = trialReducer(s, { type: 'CANCEL_REQUEST' })
    expect(s.pendingRequestId).toBeNull()
    // 消息仍然保留
    expect(s.messages).toHaveLength(1)
  })

  it('RESET 回到初始状态', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SUBMIT', requestId: 'r1', content: 'msg' })
    s = trialReducer(s, { type: 'RESET' })
    expect(s.phase).toBe('setup')
    expect(s.roundsUsed).toBe(0)
    expect(s.messages).toHaveLength(0)
  })

  it('SET_HARD_SCORE 限制在 0-100', () => {
    let s = trialReducer(createInitialState(), { type: 'START', roundLimit: 10 })
    s = trialReducer(s, { type: 'SET_HARD_SCORE', score: 150 })
    expect(s.hardScore).toBe(100)
    s = trialReducer(s, { type: 'SET_HARD_SCORE', score: -10 })
    expect(s.hardScore).toBe(0)
  })
})
