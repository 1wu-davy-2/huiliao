import { afterEach, describe, expect, it } from 'vitest'
import {
  saveTrialSession,
  listTrialSessions,
  getTrialSession,
  deleteTrialSession,
  clearTrialSessions,
  closeTrialDb,
} from '@/lib/ai/trialDb'
import type { TrialSessionRecord } from '@/types'

function makeRecord(id: string, overrides: Partial<TrialSessionRecord> = {}): TrialSessionRecord {
  return {
    id,
    challengeId: 'test-challenge',
    mode: 'communication',
    difficulty: 'simple',
    protocol: 'openai-compatible',
    model: 'gpt-4o-mini',
    upstreamHost: 'api.openai.com',
    roundLimit: 10,
    roundsUsed: 5,
    hardScore: 80,
    selfScore: 75,
    completedAt: new Date().toISOString(),
    challengeSnapshot: {
      id: 'test-challenge',
      mode: 'communication',
      difficulty: 'simple',
      title: 'Test',
      brief: 'Test',
      objective: 'Test',
      initialPrompt: 'Test',
      acceptanceCriteria: ['A'],
      hardChecks: [{ type: 'nonEmpty' }],
    },
    messages: [
      { role: 'user', content: 'hello', createdAt: new Date().toISOString() },
      { role: 'assistant', content: 'hi there', createdAt: new Date().toISOString() },
    ],
    hardCheckResults: [{ type: 'nonEmpty', passed: true, explanation: 'ok' }],
    evaluation: {
      score: 75,
      strengths: ['good'],
      weaknesses: ['work on this'],
      nextAction: 'try again',
      disclaimer: 'model-self-evaluation',
    },
    ...overrides,
  }
}

afterEach(async () => {
  await clearTrialSessions()
  // Don't close between tests so fake-indexeddb state persists
})

afterEach(async () => {
  await closeTrialDb()
})

describe('trialDb', () => {
  it('保存并读取一条记录', async () => {
    const record = makeRecord('session-1')
    const result = await saveTrialSession(record)
    expect(result.saved).toBe(true)
    expect(result.evictedIds).toHaveLength(0)

    const loaded = await getTrialSession('session-1')
    expect(loaded).toBeDefined()
    expect(loaded!.id).toBe('session-1')
  })

  it('列出多条记录，按完成时间倒序', async () => {
    const r1 = makeRecord('s1', { completedAt: '2026-01-01T00:00:00Z' })
    const r2 = makeRecord('s2', { completedAt: '2026-02-01T00:00:00Z' })
    const r3 = makeRecord('s3', { completedAt: '2026-03-01T00:00:00Z' })
    await saveTrialSession(r1)
    await saveTrialSession(r2)
    await saveTrialSession(r3)

    const list = await listTrialSessions()
    expect(list).toHaveLength(3)
    expect(list[0].id).toBe('s3') // 最新在前
  })

  it('删除单条', async () => {
    await saveTrialSession(makeRecord('s1'))
    await saveTrialSession(makeRecord('s2'))
    await deleteTrialSession('s1')
    const list = await listTrialSessions()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('s2')
  })

  it('清空全部', async () => {
    await saveTrialSession(makeRecord('s1'))
    await saveTrialSession(makeRecord('s2'))
    await clearTrialSessions()
    const list = await listTrialSessions()
    expect(list).toHaveLength(0)
  })

  it('超过 20 条时清理最旧', async () => {
    for (let i = 0; i < 25; i++) {
      const timestamp = new Date(2026, 0, i + 1).toISOString()
      await saveTrialSession(makeRecord(`s${i}`, { completedAt: timestamp }))
    }
    const list = await listTrialSessions()
    expect(list.length).toBeLessThanOrEqual(20)
  })

  // 2 MB 单条上限是纵深防御：schema 层已把 messages 限到 60 条 × 8000 字符
  // （≈480 KB），正常输入触不到它。所以这里分两条断言：
  //  1) schema 允许的最大记录确实能存进去（上限不会误伤合法数据）
  //  2) 真正超限的记录被拒绝，且一个字节都没落库
  it('schema 允许的最大记录仍可存储（2 MB 上限不误伤合法输入）', async () => {
    const maximal: TrialSessionRecord['messages'] = []
    for (let i = 0; i < 60; i++) {
      maximal.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'x'.repeat(8000),
        createdAt: new Date().toISOString(),
      })
    }
    const result = await saveTrialSession(makeRecord('maximal', { messages: maximal }))
    expect(result.saved).toBe(true)
    expect(result.error).toBeUndefined()
    expect(await getTrialSession('maximal')).toBeDefined()
  })

  it('单条超过 2 MB 拒绝存储且不写入数据库', async () => {
    // 直接构造超过 2 MB 的记录以触发 byteSize 守卫
    const huge = makeRecord('huge', {
      messages: [{
        role: 'user',
        content: 'x'.repeat(2 * 1024 * 1024 + 1024),
        createdAt: new Date().toISOString(),
      }],
    })

    const result = await saveTrialSession(huge)
    expect(result.saved).toBe(false)
    expect(result.error).toContain('2 MB')
    expect(result.evictedIds).toEqual([])

    // 关键：拒绝必须是「完全没写」，不能留下半条记录
    expect(await getTrialSession('huge')).toBeUndefined()
    expect(await listTrialSessions()).toHaveLength(0)
  })

  it('已存记录不含 apiKey', async () => {
    const record = makeRecord('clean')
    await saveTrialSession(record)
    const loaded = await getTrialSession('clean')
    const json = JSON.stringify(loaded)
    expect(json).not.toContain('apiKey')
    expect(json).not.toContain('sk-')
  })

  it('关闭数据库连接不抛异常', async () => {
    await saveTrialSession(makeRecord('s1'))
    await closeTrialDb()
    // 重新打开应正常工作
    const list = await listTrialSessions()
    expect(list.length).toBeGreaterThanOrEqual(0)
  })
})
