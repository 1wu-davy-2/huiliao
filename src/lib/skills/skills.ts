import type { ProgressRecord, SkillKey } from '@/types'
import { SKILL_KEYS } from '@/types'

export const BASE_SKILL_LEVEL = 60

export function emptySkillMap(level = BASE_SKILL_LEVEL): Record<SkillKey, number> {
  return {
    clarity: level,
    authenticity: level,
    listening: level,
    pace: level,
    boundaries: level,
  }
}

export function applyDeltas(
  base: Record<SkillKey, number>,
  deltas: Partial<Record<SkillKey, number>> | undefined,
): Record<SkillKey, number> {
  const next = { ...base }
  for (const key of SKILL_KEYS) {
    const delta = deltas?.[key] ?? 0
    next[key] = Math.max(0, Math.min(100, next[key] + delta))
  }
  return next
}

export function aggregateSkillScores(records: ProgressRecord[]): Record<SkillKey, number> {
  const result = emptySkillMap()
  if (records.length === 0) return result
  for (const key of SKILL_KEYS) {
    const values = records.map((r) => r.scores[key])
    result[key] = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }
  return result
}

export function boundaryAccuracy(records: ProgressRecord[]): number | null {
  if (records.length === 0) return null
  const passed = records.filter((r) => r.boundaryCheckPassed).length
  return Math.round((passed / records.length) * 100)
}

export const CHALLENGE_OPTIONS = [
  { id: 'start', label: '不知道怎么开口' },
  { id: 'cold', label: '聊天容易冷场' },
  { id: 'express', label: '不敢表达好感' },
  { id: 'fear', label: '害怕被拒绝' },
  { id: 'boundary', label: '不确定如何把握边界' },
] as const

export const CHALLENGE_SCENARIO_PRIORITY: Record<string, string[]> = {
  start: ['s02', 's03'],
  cold: ['s03', 's04'],
  express: ['s05', 's06'],
  fear: ['s07', 's05', 's08'],
  boundary: ['s08', 's10', 's09', 's07'],
}

export function recommendScenario(
  selectedChallenges: string[],
  completedIds: string[],
  scenarioIds: string[],
): string | null {
  const challenges = selectedChallenges.length > 0 ? selectedChallenges : ['start']
  for (const challenge of challenges) {
    const priority = CHALLENGE_SCENARIO_PRIORITY[challenge] ?? []
    const first = priority.find((id) => !completedIds.includes(id) && scenarioIds.includes(id))
    if (first) return first
    const fallback = priority.find((id) => scenarioIds.includes(id))
    if (fallback) return fallback
  }
  return null
}
