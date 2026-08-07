import { z } from 'zod'

// ─── 浏览器 → 函数请求 ──────────────────────────────────────

export const apiProtocolSchema = z.enum(['openai-compatible', 'anthropic', 'gemini'])

export const upstreamTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('preset'), presetId: z.enum(['openai', 'anthropic', 'gemini']) }),
  z.object({ kind: z.literal('custom'), baseUrl: z.string().min(1) }),
])

export const trialMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
})

export const turnRequestSchema = z.object({
  mode: z.enum(['communication', 'promptcraft']),
  difficulty: z.enum(['simple', 'normal', 'hard']),
  challengeId: z.string().min(1),
  protocol: apiProtocolSchema,
  target: upstreamTargetSchema,
  model: z.string().min(1).max(128),
  roundLimit: z.number().int().min(5).max(30),
  roundsUsed: z.number().int().min(0),
  messages: z.array(trialMessageSchema).min(0).max(61),
})
.refine((r) => r.messages.length <= r.roundLimit * 2 + 1, {
  message: '消息数超过轮数限制',
})
.refine((r) => {
  const totalChars = r.messages.reduce((sum, m) => sum + m.content.length, 0)
  return totalChars <= 120_000
}, { message: '总字符数超过限制（120000）' })

export const evaluateRequestSchema = z.object({
  challengeId: z.string().min(1),
  protocol: apiProtocolSchema,
  target: upstreamTargetSchema,
  model: z.string().min(1).max(128),
  roundLimit: z.number().int().min(5).max(30),
  roundsUsed: z.number().int().min(0),
  messages: z.array(trialMessageSchema).min(1).max(60),
})

// ─── 函数 → 浏览器响应 ──────────────────────────────────────

export interface NormalizedResponse {
  text: string
  finishReason: 'stop' | 'length' | 'blocked' | 'unknown'
  usage: { inputTokens: number | null; outputTokens: number | null }
}

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_PROTOCOL'
  | 'INVALID_UPSTREAM_URL'
  | 'UPSTREAM_AUTH'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_BAD_RESPONSE'
  | 'UPSTREAM_SECRET_ECHO'
  | 'UPSTREAM_UNAVAILABLE'

export const PRESET_HOSTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
}

export const HEADER_API_KEY = 'x-huiliao-api-key'
