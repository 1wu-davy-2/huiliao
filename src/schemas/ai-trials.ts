import { z } from 'zod'
// 必须从 ./common 取，不能从 ./index 取：index 会 import 本文件的 trialSummarySchema，
// 两个值级导入互指会形成运行时循环，导致本文件顶层 const 触发 TDZ 并使整个应用白屏。
import { contentReviewStatusSchema } from './common'

// ─── 基础枚举 ────────────────────────────────────────────────

export const trialModeSchema = z.enum(['communication', 'promptcraft'])

export const trialDifficultySchema = z.enum(['simple', 'normal', 'hard'])

export const apiProtocolSchema = z.enum(['openai-compatible', 'anthropic', 'gemini'])

export const trialRoundLimitSchema = z.number().int().min(5).max(30)

// ─── 硬规则 ──────────────────────────────────────────────────

export const trialHardCheckSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('nonEmpty') }),
  z.object({
    type: z.literal('jsonObject'),
    requiredKeys: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('containsAll'),
    values: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean(),
  }),
  z.object({
    type: z.literal('maxChars'),
    max: z.number().int().positive(),
  }),
  z.object({ type: z.literal('safeCommunication') }),
])

// ─── 消息 ────────────────────────────────────────────────────

export const trialMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
  createdAt: z.string().min(1),
})

// ─── 题目 ────────────────────────────────────────────────────

export const trialChallengeSchema = z.object({
  id: z.string().min(1),
  reviewStatus: contentReviewStatusSchema,
  mode: trialModeSchema,
  difficulty: trialDifficultySchema,
  title: z.string().min(1),
  brief: z.string().min(1),
  objective: z.string().min(1),
  initialPrompt: z.string().min(1),
  testInput: z.string().optional(),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  hardChecks: z.array(trialHardCheckSchema).min(1),
})

// ─── 评估 ────────────────────────────────────────────────────

export const trialEvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().min(1).max(500)),
  weaknesses: z.array(z.string().min(1).max(500)),
  nextAction: z.string().min(1).max(500),
  disclaimer: z.literal('model-self-evaluation'),
})

// ─── 摘要 ────────────────────────────────────────────────────

export const trialSummarySchema = z.object({
  id: z.string().min(1),
  challengeId: z.string().min(1),
  mode: trialModeSchema,
  difficulty: trialDifficultySchema,
  protocol: apiProtocolSchema,
  model: z.string().min(1),
  roundLimit: trialRoundLimitSchema,
  roundsUsed: z.number().int().min(0),
  hardScore: z.number().int().min(0).max(100),
  selfScore: z.number().int().min(0).max(100).nullable(),
  completedAt: z.string().min(1),
})

// ─── 会话记录 ────────────────────────────────────────────────

const upstreamHostSchema = z.string().min(1).regex(
  /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/,
  'upstreamHost 只能包含主机名（无路径、凭证、端口或协议）',
)

export const trialHardCheckResultSchema = z.object({
  type: z.enum(['nonEmpty', 'jsonObject', 'containsAll', 'maxChars', 'safeCommunication']),
  passed: z.boolean(),
  explanation: z.string().min(1).max(500),
})

export const trialSessionRecordSchema = z.object({
  id: z.string().min(1),
  challengeId: z.string().min(1),
  mode: trialModeSchema,
  difficulty: trialDifficultySchema,
  protocol: apiProtocolSchema,
  model: z.string().min(1),
  upstreamHost: upstreamHostSchema,
  roundLimit: trialRoundLimitSchema,
  roundsUsed: z.number().int().min(0),
  hardScore: z.number().int().min(0).max(100),
  selfScore: z.number().int().min(0).max(100).nullable(),
  completedAt: z.string().min(1),
  challengeSnapshot: trialChallengeSchema.omit({ reviewStatus: true }),
  messages: z.array(trialMessageSchema).min(0).max(60),
  hardCheckResults: z.array(trialHardCheckResultSchema),
  evaluation: trialEvaluationSchema.nullable(),
}).strict()
