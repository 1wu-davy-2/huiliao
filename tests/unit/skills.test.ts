import { describe, expect, it } from 'vitest'
import {
  aggregateSkillScores,
  applyDeltas,
  boundaryAccuracy,
  emptySkillMap,
  recommendScenario,
} from '@/lib/skills/skills'
import { SCENARIOS } from '@/content'
import type { ProgressRecord } from '@/types'

const SCENARIO_IDS = SCENARIOS.map((s) => s.id)

function makeRecord(partial: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    scenarioId: 's02',
    completedAt: '2026-08-06T10:00:00.000Z',
    attempts: 3,
    retryCount: 0,
    scores: { clarity: 70, authenticity: 70, listening: 70, pace: 70, boundaries: 70 },
    boundaryCheckPassed: true,
    ...partial,
  }
}

describe('skills', () => {
  it('applyDeltas 在 0–100 之间钳制', () => {
    const base = emptySkillMap(50)
    const next = applyDeltas(base, { clarity: 100, authenticity: -100, listening: 30 })
    expect(next.clarity).toBe(100)
    expect(next.authenticity).toBe(0)
    expect(next.listening).toBe(80)
    expect(next.pace).toBe(50)
  })

  it('无 deltas 时原样返回', () => {
    const base = emptySkillMap(60)
    expect(applyDeltas(base, undefined)).toEqual(base)
  })

  it('aggregateSkillScores 计算均值并取整', () => {
    const records = [
      makeRecord({ scenarioId: 's02', scores: { clarity: 80, authenticity: 70, listening: 60, pace: 50, boundaries: 40 } }),
      makeRecord({ scenarioId: 's03', scores: { clarity: 70, authenticity: 70, listening: 70, pace: 70, boundaries: 70 } }),
    ]
    const result = aggregateSkillScores(records)
    expect(result.clarity).toBe(75)
    expect(result.authenticity).toBe(70)
    expect(result.boundaries).toBe(55)
  })

  it('无记录时返回基线水平', () => {
    const result = aggregateSkillScores([])
    expect(result.clarity).toBe(60)
  })

  it('boundaryAccuracy 无记录返回 null，否则返回通过比例', () => {
    expect(boundaryAccuracy([])).toBeNull()
    const records = [
      makeRecord({ boundaryCheckPassed: true }),
      makeRecord({ scenarioId: 's03', boundaryCheckPassed: true }),
      makeRecord({ scenarioId: 's04', boundaryCheckPassed: false }),
    ]
    expect(boundaryAccuracy(records)).toBe(67)
  })

  it('recommendScenario 优先未完成场景', () => {
    const id = recommendScenario(['start'], [], SCENARIO_IDS)
    expect(id).toBe('s02')
  })

  it('recommendScenario 跳过已完成场景', () => {
    const id = recommendScenario(['start'], ['s02'], SCENARIO_IDS)
    expect(id).toBe('s03')
  })

  it('recommendScenario 全完成后回退到已练场景', () => {
    const id = recommendScenario(['start'], ['s02', 's03'], SCENARIO_IDS)
    expect(id).toBe('s02')
  })

  it('recommendScenario 无默认选项时返回 null', () => {
    const id = recommendScenario(['boundary'], SCENARIO_IDS, [])
    expect(id).toBeNull()
  })

  it('未选择困难时使用默认推荐', () => {
    const id = recommendScenario([], [], SCENARIO_IDS)
    expect(id).toBe('s02')
  })
})
