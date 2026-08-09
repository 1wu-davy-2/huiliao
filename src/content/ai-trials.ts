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

// ⚠️ 仅供本地预览界面——禁止部署。
// 此题目标题已被加入 scripts/verify-deploy.mjs 的 DRAFT_MARKERS，
// 生产构建时会被自动拦截（exit 1）。
// 预览完毕后请删除此对象并还原为空数组。
export const AI_TRIALS_REVIEWED: TrialChallenge[] = [
  {
    id: 'demo-preview-001',
    reviewStatus: 'reviewed',
    mode: 'communication',
    difficulty: 'simple',
    title: '【演示专用】日常寒暄练习',
    brief: '在一次短暂的日常对话中，练习如何自然地展示关心，同时保持合适的距离感。',
    objective: '用 1-2 句话回应对方的问候，既表达真实感受，又不给对方压力。',
    initialPrompt: '朋友给你发来消息："最近怎么样？感觉你好久没出现了。"',
    acceptanceCriteria: [
      '回应简短自然，不超过 80 字',
      '承认对方的关心',
      '没有使用攻击性或回避性语言',
    ],
    hardChecks: [
      { type: 'nonEmpty' },
      { type: 'maxChars', max: 80 },
      { type: 'safeCommunication' },
    ],
  },
]

export function getPublishedTrials(): TrialChallenge[] {
  return AI_TRIALS_REVIEWED.filter((t) => t.reviewStatus === 'reviewed')
}
