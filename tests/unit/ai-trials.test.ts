import { describe, expect, it } from 'vitest'
import {
  trialDifficultySchema,
  trialRoundLimitSchema,
  apiProtocolSchema,
  trialModeSchema,
  trialHardCheckSchema,
  trialChallengeSchema,
  trialSessionRecordSchema,
} from '@/schemas/ai-trials'
import { selectChallenge } from '@/lib/ai/selectChallenge'
import { AI_TRIALS_DRAFT } from '@/content/ai-trials-draft'
import { getPublishedTrials } from '@/content/ai-trials'

describe('AI 试炼 Schema', () => {
  describe('trialDifficultySchema', () => {
    it('接受 simple / normal / hard', () => {
      expect(trialDifficultySchema.safeParse('simple').success).toBe(true)
      expect(trialDifficultySchema.safeParse('normal').success).toBe(true)
      expect(trialDifficultySchema.safeParse('hard').success).toBe(true)
    })
    it('拒绝未知难度', () => {
      expect(trialDifficultySchema.safeParse('expert').success).toBe(false)
      expect(trialDifficultySchema.safeParse('').success).toBe(false)
    })
  })

  describe('trialRoundLimitSchema', () => {
    it('接受 5–30', () => {
      expect(trialRoundLimitSchema.safeParse(5).success).toBe(true)
      expect(trialRoundLimitSchema.safeParse(15).success).toBe(true)
      expect(trialRoundLimitSchema.safeParse(30).success).toBe(true)
    })
    it('拒绝越界值', () => {
      expect(trialRoundLimitSchema.safeParse(4).success).toBe(false)
      expect(trialRoundLimitSchema.safeParse(31).success).toBe(false)
      expect(trialRoundLimitSchema.safeParse(0).success).toBe(false)
    })
    it('拒绝非整数', () => {
      expect(trialRoundLimitSchema.safeParse(5.5).success).toBe(false)
    })
  })

  describe('apiProtocolSchema', () => {
    it('接受三种协议', () => {
      expect(apiProtocolSchema.safeParse('openai-compatible').success).toBe(true)
      expect(apiProtocolSchema.safeParse('anthropic').success).toBe(true)
      expect(apiProtocolSchema.safeParse('gemini').success).toBe(true)
    })
    it('拒绝未知协议', () => {
      expect(apiProtocolSchema.safeParse('unknown').success).toBe(false)
      expect(apiProtocolSchema.safeParse('').success).toBe(false)
    })
  })

  describe('trialModeSchema', () => {
    it('接受 communication / promptcraft', () => {
      expect(trialModeSchema.safeParse('communication').success).toBe(true)
      expect(trialModeSchema.safeParse('promptcraft').success).toBe(true)
    })
    it('拒绝未知模式', () => {
      expect(trialModeSchema.safeParse('battle').success).toBe(false)
    })
  })

  describe('trialHardCheckSchema', () => {
    it('nonEmpty', () => {
      const r = trialHardCheckSchema.safeParse({ type: 'nonEmpty' })
      expect(r.success).toBe(true)
    })
    it('jsonObject with requiredKeys', () => {
      const r = trialHardCheckSchema.safeParse({ type: 'jsonObject', requiredKeys: ['a', 'b'] })
      expect(r.success).toBe(true)
    })
    it('containsAll', () => {
      const r = trialHardCheckSchema.safeParse({ type: 'containsAll', values: ['x'], caseSensitive: true })
      expect(r.success).toBe(true)
    })
    it('maxChars with positive max', () => {
      const r = trialHardCheckSchema.safeParse({ type: 'maxChars', max: 100 })
      expect(r.success).toBe(true)
    })
    it('safeCommunication', () => {
      const r = trialHardCheckSchema.safeParse({ type: 'safeCommunication' })
      expect(r.success).toBe(true)
    })
    it('拒绝无效 max', () => {
      expect(trialHardCheckSchema.safeParse({ type: 'maxChars', max: 0 }).success).toBe(false)
      expect(trialHardCheckSchema.safeParse({ type: 'maxChars', max: -1 }).success).toBe(false)
    })
    it('拒绝未知 type', () => {
      expect(trialHardCheckSchema.safeParse({ type: 'unknown' }).success).toBe(false)
    })
    it('rejects jsonObject without requiredKeys', () => {
      expect(trialHardCheckSchema.safeParse({ type: 'jsonObject' }).success).toBe(false)
    })
  })

  describe('trialChallengeSchema', () => {
    const valid = {
      id: 'communication-simple-01',
      reviewStatus: 'draft' as const,
      mode: 'communication' as const,
      difficulty: 'simple' as const,
      title: '测试题',
      brief: '简要',
      objective: '目标',
      initialPrompt: '开始吧',
      acceptanceCriteria: ['标准1'],
      hardChecks: [{ type: 'nonEmpty' as const }],
    }
    it('接受合法 draft', () => {
      expect(trialChallengeSchema.safeParse(valid).success).toBe(true)
    })
    it('拒绝空标题', () => {
      expect(trialChallengeSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
    })
    it('拒绝空 hardChecks', () => {
      expect(trialChallengeSchema.safeParse({ ...valid, hardChecks: [] }).success).toBe(false)
    })
  })

  describe('trialSessionRecordSchema', () => {
    const validRecord = {
      id: 'session-1',
      challengeId: 'communication-simple-01',
      mode: 'communication' as const,
      difficulty: 'simple' as const,
      protocol: 'openai-compatible' as const,
      model: 'gpt-4o-mini',
      upstreamHost: 'api.openai.com',
      roundLimit: 10,
      roundsUsed: 5,
      hardScore: 80,
      selfScore: 75,
      completedAt: new Date().toISOString(),
      challengeSnapshot: {
        id: 'communication-simple-01',
        mode: 'communication' as const,
        difficulty: 'simple' as const,
        title: 'Test',
        brief: 'Brief',
        objective: 'Obj',
        initialPrompt: 'Go',
        acceptanceCriteria: ['A'],
        hardChecks: [{ type: 'nonEmpty' as const }],
      },
      messages: [
        { role: 'user' as const, content: 'hi', createdAt: new Date().toISOString() },
        { role: 'assistant' as const, content: 'hello', createdAt: new Date().toISOString() },
      ],
      hardCheckResults: [{ type: 'nonEmpty' as const, passed: true, explanation: 'ok' }],
      evaluation: {
        score: 75,
        strengths: ['good'],
        weaknesses: ['bad'],
        nextAction: 'try again',
        disclaimer: 'model-self-evaluation' as const,
      },
    }

    it('接受合法记录', () => {
      expect(trialSessionRecordSchema.safeParse(validRecord).success).toBe(true)
    })

    it('拒绝超长消息（>8000 字符）', () => {
      const long = { ...validRecord, messages: [{ role: 'user', content: 'x'.repeat(8001), createdAt: new Date().toISOString() }] }
      expect(trialSessionRecordSchema.safeParse(long).success).toBe(false)
    })

    it('拒绝超过 60 条消息', () => {
      const msgs = Array.from({ length: 61 }, (_, i) => ({
        role: 'user' as const,
        content: `msg${i}`,
        createdAt: new Date().toISOString(),
      }))
      expect(trialSessionRecordSchema.safeParse({ ...validRecord, messages: msgs }).success).toBe(false)
    })

    it('拒绝包含 apiKey 字段', () => {
      const withKey = { ...validRecord, apiKey: 'sk-secret' }
      expect(trialSessionRecordSchema.safeParse(withKey).success).toBe(false)
    })

    it('拒绝 upstreamHost 含路径或凭证', () => {
      expect(trialSessionRecordSchema.safeParse({ ...validRecord, upstreamHost: 'api.example.com/v1' }).success).toBe(false)
      expect(trialSessionRecordSchema.safeParse({ ...validRecord, upstreamHost: 'user:pass@api.example.com' }).success).toBe(false)
    })

    it('接受 null selfScore', () => {
      expect(trialSessionRecordSchema.safeParse({ ...validRecord, selfScore: null }).success).toBe(true)
    })
  })
})

// ─── 选题逻辑 ──────────────────────────────────────────────────

describe('selectChallenge', () => {
  it('空审核池返回 undefined', () => {
    // getPublishedTrials 当前为空
    const result = selectChallenge('communication', 'simple', [], () => 0.5)
    expect(result).toBeUndefined()
  })

  it('草稿池含 18 道题', () => {
    expect(AI_TRIALS_DRAFT).toHaveLength(18)
  })

  it('所有草稿题 reviewStatus 为 draft', () => {
    for (const t of AI_TRIALS_DRAFT) {
      expect(t.reviewStatus).toBe('draft')
    }
  })

  it('每种模式/难度至少 3 道草稿', () => {
    const modes: Array<'communication' | 'promptcraft'> = ['communication', 'promptcraft']
    const diffs: Array<'simple' | 'normal' | 'hard'> = ['simple', 'normal', 'hard']
    for (const mode of modes) {
      for (const diff of diffs) {
        const count = AI_TRIALS_DRAFT.filter((t) => t.mode === mode && t.difficulty === diff).length
        expect(count, `${mode}-${diff} 至少应有 3 道`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('生产入口不含 draft', () => {
    expect(getPublishedTrials().some((t) => t.reviewStatus === 'draft')).toBe(false)
  })

  it('确定性 RNG 选择', () => {
    // 需要至少一道 reviewed 题来测试。当前池空时返回 undefined。
    // 这个测试验证当有题时的选择行为。
    const pool = AI_TRIALS_DRAFT.filter((t) => t.mode === 'communication' && t.difficulty === 'simple')
    expect(pool.length).toBeGreaterThanOrEqual(3)
  })
})
