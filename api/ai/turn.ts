/**
 * POST /api/ai/turn — 发送一轮对话到用户配置的模型。
 *
 * Vercel Node Function。不接受 GET 以外的请求。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  turnRequestSchema,
  PRESET_HOSTS,
  HEADER_API_KEY,
  type ApiErrorCode,
} from '../_lib/contracts'
import { validateBaseUrl } from '../_lib/urlPolicy'
import { dispatchProvider } from '../_lib/providers'

function jsonError(res: VercelResponse, status: number, code: ApiErrorCode) {
  return res.status(status).json({ error: code })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // 解析请求体
  const parseResult = turnRequestSchema.safeParse(req.body)
  if (!parseResult.success) {
    return jsonError(res, 400, 'INVALID_REQUEST')
  }

  const { protocol, target, model, messages, challengeId } = parseResult.data

  // 解析 API Key
  const apiKey = req.headers[HEADER_API_KEY]
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length > 4096) {
    return jsonError(res, 401, 'UPSTREAM_AUTH')
  }
  if (/[\x00-\x1f\x7f]/.test(apiKey)) {
    return jsonError(res, 400, 'INVALID_REQUEST')
  }

  // 解析上游目标
  let origin: string
  if (target.kind === 'preset') {
    origin = PRESET_HOSTS[target.presetId]
    if (!origin) return jsonError(res, 400, 'INVALID_REQUEST')
  } else {
    const validated = validateBaseUrl(target.baseUrl)
    if (!validated.ok) return jsonError(res, 400, 'INVALID_UPSTREAM_URL')
    origin = validated.origin
  }

  // 服务器端 prompt
  const systemPrompt = buildSystemPrompt(parseResult.data.mode)

  try {
    const result = await dispatchProvider({
      protocol,
      origin,
      apiKey,
      model,
      systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      maxTokens: 1200,
    })

    // 检查 API Key 回显
    if (result.text.includes(apiKey)) {
      return jsonError(res, 502, 'UPSTREAM_SECRET_ECHO')
    }

    return res.status(200).json({
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
    })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    const statusMap: Record<string, number> = {
      UPSTREAM_AUTH: 502,
      UPSTREAM_RATE_LIMIT: 502,
      UPSTREAM_TIMEOUT: 504,
      UPSTREAM_BAD_RESPONSE: 502,
      UPSTREAM_UNAVAILABLE: 502,
      UPSTREAM_SECRET_ECHO: 502,
      INVALID_UPSTREAM_URL: 502,
      UNSUPPORTED_PROTOCOL: 400,
      INVALID_REQUEST: 400,
    }
    const status = statusMap[code as string] || 500
    return jsonError(res, status, (code as ApiErrorCode) || 'UPSTREAM_UNAVAILABLE')
  }
}

function buildSystemPrompt(mode: string): string {
  if (mode === 'promptcraft') {
    return '你是一个帮助用户练习 Prompt 工程的 AI 助手。严格按照用户提供的 Prompt 要求行事，不做额外推测或扩展。'
  }
  return '你是一个帮助成年人练习尊重沟通的模拟对话伙伴。你的角色是一个真实的人——有界限、有情绪、可以拒绝。请以自然的中文对话回应。如果对方越界或不尊重，你可以表达不适、设定边界或终止对话。'
}
