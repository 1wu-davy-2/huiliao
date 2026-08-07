/**
 * POST /api/ai/evaluate — 调用同一模型对完成试炼进行自评。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  evaluateRequestSchema,
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

  const parseResult = evaluateRequestSchema.safeParse(req.body)
  if (!parseResult.success) {
    return jsonError(res, 400, 'INVALID_REQUEST')
  }

  const { protocol, target, model, messages } = parseResult.data

  const apiKey = req.headers[HEADER_API_KEY]
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length > 4096) {
    return jsonError(res, 401, 'UPSTREAM_AUTH')
  }

  let origin: string
  if (target.kind === 'preset') {
    origin = PRESET_HOSTS[target.presetId]
    if (!origin) return jsonError(res, 400, 'INVALID_REQUEST')
  } else {
    const validated = validateBaseUrl(target.baseUrl)
    if (!validated.ok) return jsonError(res, 400, 'INVALID_UPSTREAM_URL')
    origin = validated.origin
  }

  const transcript = messages
    .map((m) => `${m.role === 'user' ? '用户' : '模型'}: ${m.content}`)
    .join('\n\n')

  const evalPrompt = `你是一位严格但公正的沟通教练。请根据以下对话记录，对用户的沟通表现进行评分。

评分标准（0-100）：
- 清晰度：表达是否清晰易懂
- 真诚度：是否以真实感受而非技巧驱动
- 倾听：是否回应了对方实际表达的内容
- 分寸：消息密度、索取程度是否适当
- 边界：是否尊重对方的拒绝和界线

对话记录：
${transcript}

请以严格的 JSON 格式回复（不要包含 markdown 代码块标记）：
{
  "score": <0-100 整数>,
  "strengths": ["做得好的地方", ...],
  "weaknesses": ["可以改进的地方", ...],
  "nextAction": "下一步建议"
}`

  try {
    const result = await dispatchProvider({
      protocol,
      origin,
      apiKey,
      model,
      systemPrompt: '你是一个严格但公正的沟通教练。请严格按照 JSON 格式输出评估结果，不要包含任何额外文字或解释。',
      messages: [{ role: 'user', content: evalPrompt }],
      maxTokens: 800,
    })

    if (result.text.includes(apiKey)) {
      return jsonError(res, 502, 'UPSTREAM_SECRET_ECHO')
    }

    // 解析自评 JSON
    let evaluation = null
    try {
      const cleaned = result.text.replace(/```json\s*|\s*```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (
        typeof parsed.score === 'number' &&
        parsed.score >= 0 &&
        parsed.score <= 100 &&
        Number.isInteger(parsed.score) &&
        Array.isArray(parsed.strengths) &&
        Array.isArray(parsed.weaknesses) &&
        typeof parsed.nextAction === 'string'
      ) {
        evaluation = {
          score: parsed.score,
          strengths: parsed.strengths.slice(0, 5).map((s: unknown) => String(s).slice(0, 500)),
          weaknesses: parsed.weaknesses.slice(0, 5).map((s: unknown) => String(s).slice(0, 500)),
          nextAction: String(parsed.nextAction).slice(0, 500),
          disclaimer: 'model-self-evaluation' as const,
        }
      }
    } catch {
      // 无法解析 → null
    }

    return res.status(200).json(evaluation)
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    const status = code === 'INVALID_REQUEST' || code === 'UNSUPPORTED_PROTOCOL' ? 400 : 502
    return jsonError(res, status, (code as ApiErrorCode) || 'UPSTREAM_UNAVAILABLE')
  }
}
