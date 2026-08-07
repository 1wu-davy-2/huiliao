/**
 * POST /api/ai/turn — 一轮模型对话。
 *
 * 这不是通用模型中转接口：
 *  - challengeId 必须命中「已审校」题库，且与声明的 mode/difficulty 一致
 *  - 系统提示词一律由服务端按题目生成，浏览器只能发 user/assistant 消息
 *  - 官方预设必须与协议匹配（防止把 A 厂密钥发到 B 厂主机）
 *  - 自定义地址经 DNS 解析 + 公网 unicast 校验 + 地址钉定
 *
 * 不记录请求体、响应文本、提示词或凭据。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { turnRequestSchema, readApiKey, HEADER_API_KEY } from '../_lib/contracts'
import {
  bodyTooLarge,
  fetchSiteAllowed,
  jsonError,
  originAllowed,
  resolveTarget,
  setJsonHeaders,
  statusForCode,
} from '../_lib/http'
import {
  buildSystemPrompt,
  challengeMatches,
  getReviewedChallenge,
  hasReviewedPool,
} from '../_lib/challenges'
import { dispatchProvider } from '../_lib/providers'
import { errorCodeOf } from '../_lib/errors'

const MAX_OUTPUT_TOKENS = 1200

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setJsonHeaders(res)

  // 方法先于 Origin：诊断用 GET 仍返回 JSON 405
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return jsonError(res, 405, 'METHOD_NOT_ALLOWED')
  }
  if (bodyTooLarge(req)) {
    return jsonError(res, 413, 'INVALID_REQUEST')
  }
  if (!originAllowed(req) || !fetchSiteAllowed(req)) {
    return jsonError(res, 403, 'FORBIDDEN_ORIGIN')
  }

  const parsed = turnRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return jsonError(res, 400, 'INVALID_REQUEST')
  }
  const { mode, difficulty, challengeId, protocol, target, model, messages } = parsed.data

  const key = readApiKey(req.headers[HEADER_API_KEY])
  if (!key.ok) {
    return jsonError(res, key.code === 'UPSTREAM_AUTH' ? 401 : 400, key.code)
  }

  // 审核门：题池为空时功能整体不可用
  if (!hasReviewedPool()) {
    return jsonError(res, 400, 'UNKNOWN_CHALLENGE')
  }
  const challenge = getReviewedChallenge(challengeId)
  if (!challenge || !challengeMatches(challenge, mode, difficulty)) {
    return jsonError(res, 400, 'UNKNOWN_CHALLENGE')
  }

  const pinned = await resolveTarget(target, req)
  if (!pinned.ok) {
    return jsonError(res, 400, 'INVALID_UPSTREAM_URL')
  }

  try {
    const result = await dispatchProvider({
      protocol,
      target: pinned,
      apiKey: key.apiKey,
      model,
      systemPrompt: buildSystemPrompt(challenge),
      messages,
      maxTokens: MAX_OUTPUT_TOKENS,
      isOfficialOpenAiPreset: target.kind === 'preset' && target.presetId === 'openai',
    })

    res.status(200).json({
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
    })
  } catch (err: unknown) {
    const { status, code } = statusForCode(errorCodeOf(err))
    jsonError(res, status, code)
  }
}
