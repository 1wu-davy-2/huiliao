import { z } from 'zod'

// ─── 浏览器 → 函数请求 ──────────────────────────────────────

export const apiProtocolSchema = z.enum(['openai-compatible', 'anthropic', 'gemini'])

export const presetIdSchema = z.enum(['openai', 'anthropic', 'gemini'])

export const upstreamTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('preset'), presetId: presetIdSchema }),
  z.object({ kind: z.literal('custom'), baseUrl: z.string().min(1).max(2048) }),
])

export const trialMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
})

/**
 * 官方预设 Base URL。
 * 路径前缀（/v1、/v1beta）必须保留：适配器路径通过 joinPath 追加，不得覆盖。
 */
export const PRESET_BASE_URLS: Record<z.infer<typeof presetIdSchema>, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
}

/**
 * 协议 ↔ 官方预设绑定。
 * 防止把 Anthropic 密钥发到 OpenAI 主机（或任意跨厂商组合）。
 * 自定义地址不做此约束，由用户自行负责其网关兼容性。
 */
export const PROTOCOL_PRESET: Record<z.infer<typeof apiProtocolSchema>, z.infer<typeof presetIdSchema>> = {
  'openai-compatible': 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini',
}

/** 预设目标必须与协议匹配；不匹配一律拒绝，不做「就近纠正」。 */
export function presetMatchesProtocol(
  protocol: z.infer<typeof apiProtocolSchema>,
  presetId: z.infer<typeof presetIdSchema>,
): boolean {
  return PROTOCOL_PRESET[protocol] === presetId
}

const targetProtocolRefinement = <T extends { protocol: z.infer<typeof apiProtocolSchema>; target: z.infer<typeof upstreamTargetSchema> }>(
  value: T,
): boolean => value.target.kind !== 'preset' || presetMatchesProtocol(value.protocol, value.target.presetId)

export const turnRequestSchema = z
  .object({
    mode: z.enum(['communication', 'promptcraft']),
    difficulty: z.enum(['simple', 'normal', 'hard']),
    challengeId: z.string().min(1).max(128),
    protocol: apiProtocolSchema,
    target: upstreamTargetSchema,
    model: z.string().min(1).max(128),
    roundLimit: z.number().int().min(5).max(30),
    roundsUsed: z.number().int().min(0).max(30),
    messages: z.array(trialMessageSchema).min(1).max(61),
  })
  .refine((r) => r.roundsUsed <= r.roundLimit, { message: '已用轮数超过轮数上限' })
  .refine((r) => r.messages.length <= r.roundLimit * 2 + 1, { message: '消息数超过轮数限制' })
  .refine((r) => r.messages.reduce((sum, m) => sum + m.content.length, 0) <= 120_000, {
    message: '总字符数超过限制（120000）',
  })
  .refine(targetProtocolRefinement, { message: '协议与官方预设不匹配' })

export const evaluateRequestSchema = z
  .object({
    mode: z.enum(['communication', 'promptcraft']),
    difficulty: z.enum(['simple', 'normal', 'hard']),
    challengeId: z.string().min(1).max(128),
    protocol: apiProtocolSchema,
    target: upstreamTargetSchema,
    model: z.string().min(1).max(128),
    roundLimit: z.number().int().min(5).max(30),
    roundsUsed: z.number().int().min(0).max(30),
    messages: z.array(trialMessageSchema).min(1).max(60),
  })
  .refine((r) => r.roundsUsed <= r.roundLimit, { message: '已用轮数超过轮数上限' })
  .refine((r) => r.messages.reduce((sum, m) => sum + m.content.length, 0) <= 120_000, {
    message: '总字符数超过限制（120000）',
  })
  .refine(targetProtocolRefinement, { message: '协议与官方预设不匹配' })

export type TurnRequest = z.infer<typeof turnRequestSchema>
export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>

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
  | 'UNKNOWN_CHALLENGE'
  | 'UPSTREAM_AUTH'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_BAD_RESPONSE'
  | 'UPSTREAM_SECRET_ECHO'
  | 'UPSTREAM_UNAVAILABLE'

/** 敏感头：凭据只经此头传递一次，不复用 Authorization（可能被 Vercel Preview Protection 占用）。 */
export const HEADER_API_KEY = 'x-huiliao-api-key'

export const MAX_BODY_BYTES = 262_144 // 256 KB
export const MAX_API_KEY_BYTES = 4096

/** 凭据头校验：缺失、重复、控制字符、超长一律拒绝。 */
export function readApiKey(
  raw: string | string[] | undefined,
): { ok: true; apiKey: string } | { ok: false; code: ApiErrorCode } {
  if (Array.isArray(raw)) return { ok: false, code: 'INVALID_REQUEST' }
  if (typeof raw !== 'string' || raw.length === 0) return { ok: false, code: 'UPSTREAM_AUTH' }
  if (Buffer.byteLength(raw, 'utf8') > MAX_API_KEY_BYTES) return { ok: false, code: 'INVALID_REQUEST' }
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i)
    // 控制字符（含 CR/LF/NUL/DEL）一律拒绝，防止头注入
    if (code <= 0x1f || code === 0x7f) return { ok: false, code: 'INVALID_REQUEST' }
  }
  return { ok: true, apiKey: raw }
}
