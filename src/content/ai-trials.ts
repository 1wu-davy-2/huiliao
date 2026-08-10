/// <reference types="vite/client" />
import type { TrialChallenge } from '@/types'

/**
 * AI 试炼场——人类审校通过的题目池。
 *
 * 当前为空：18 道候选题目在 ai-trials-draft.ts 中等待专业审校。
 * 审校通过后，将题目逐条加入此数组，reviewStatus 改为 reviewed。
 *
 * 生产入口：getPublishedTrials() 仅返回 reviewed 题目。
 * 在题目池不为空前，UI 显示"暂无已审核题目"。
 */
export const AI_TRIALS_REVIEWED: TrialChallenge[] = []

// ─── 仅开发模式预览用 ────────────────────────────────────────────
// import.meta.env.DEV 在生产构建时被 Vite 替换为 false，
// Rollup 消除死代码后此对象不会进入 bundle。
// title 同时加入了 scripts/verify-deploy.mjs 的 DRAFT_MARKERS 作为双重保险。
const _DEV_DEMO: TrialChallenge = {
  id: 'demo-preview-001',
  reviewStatus: 'reviewed',
  mode: 'communication',
  difficulty: 'simple',
  title: '【演示专用】日常寒暄练习',
  brief: '在朋友重新联系的情境中，自然地回应对方的问候，练习尊重的沟通节奏。',
  objective:
    '以朋友的口吻回应久未联系后的问候，不超过 100 字，真诚、不过分热情。',
  initialPrompt:
    '你现在是一位久未联系的朋友。对方说：「最近怎么样？感觉你好久没出现了。」请回复。',
  acceptanceCriteria: [
    '回应不超过 100 字',
    '语气自然真诚，没有攻击性表达',
    '没有连续追问或施加压力',
  ],
  hardChecks: [
    { type: 'nonEmpty' },
    { type: 'maxChars', max: 200 },
    { type: 'safeCommunication' },
  ],
}

export function getPublishedTrials(): TrialChallenge[] {
  const reviewed = AI_TRIALS_REVIEWED.filter((t) => t.reviewStatus === 'reviewed')
  // 开发模式下题库为空时注入演示题，方便本地预览 UI 交互流程
  if (reviewed.length === 0 && import.meta.env.DEV) return [_DEV_DEMO]
  return reviewed
}
