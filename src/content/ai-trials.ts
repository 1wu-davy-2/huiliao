import type { TrialChallenge } from '@/types'

/**
 * AI 试炼场——人类审校通过的题目池。
 *
 * 当前为空：18 道候选题目在 ai-trials-draft.ts 中等待专业审校。
 * 审校通过后，将题目逐条从此文件暴露的数组中导入，reviewStatus 改为 reviewed。
 *
 * 生产入口：getPublishedTrials() 仅返回 reviewed 题目。
 * 在题目池不为空前，UI 显示"暂无已审核题目"。
 */

export const AI_TRIALS_REVIEWED: TrialChallenge[] = []

export function getPublishedTrials(): TrialChallenge[] {
  return AI_TRIALS_REVIEWED.filter((t) => t.reviewStatus === 'reviewed')
}
