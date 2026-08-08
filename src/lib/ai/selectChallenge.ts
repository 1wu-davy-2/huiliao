import type { TrialChallenge, TrialDifficulty, TrialMode } from '@/types'
import { getPublishedTrials } from '@/content/ai-trials'

export type RngFn = () => number

/**
 * 从已审核题目池中按模式和难度随机选题。
 *
 * - 优先避开 previousIds 中的最近三道题
 * - 如果避开后无剩余，则从全池中随机（不避开）
 * - 池空返回 undefined
 * - 使用注入的 rng 而非 Math.random，使行为可测试
 */
export function selectChallenge(
  mode: TrialMode,
  difficulty: TrialDifficulty,
  previousIds: string[],
  rng: RngFn,
): TrialChallenge | undefined {
  const pool = getPublishedTrials().filter(
    (t) => t.mode === mode && t.difficulty === difficulty,
  )
  if (pool.length === 0) return undefined

  const recentSet = new Set(previousIds.slice(-3))
  const fresh = pool.filter((t) => !recentSet.has(t.id))
  const candidates = fresh.length > 0 ? fresh : pool

  const index = Math.floor(rng() * candidates.length)
  return candidates[Math.min(index, candidates.length - 1)]
}
