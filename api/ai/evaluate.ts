/**
 * POST /api/ai/evaluate — 模型自评（额外一次计费请求）。
 *
 * 服务端重新加载已审校题目的验收条件并重算确定性检查；
 * 绝不信任调用方传入的 rubric、系统提示词或分数。
 *
 * 自评 JSON 非法、字段缺失或分数越界一律返回 evaluation: null，不做区间夹取。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { evaluateRequestSchema, readApiKey, HEADER_API_KEY } from '../_lib/contracts'
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
  buildEvaluationPrompt,
  challengeMatches,
  EVALUATION_SYSTEM_PROMPT,
  getReviewedChallenge,
  hasReviewedPool,
} from '../_lib/challenges'
import { dispatchProvider } from '../_lib/providers'
import { errorCodeOf } from '../_lib/errors'
import { calculateHardScore, runAllChecks } from '../../src/lib/ai/trialChecks'

/** 自评输出预算低于对话轮（计划要求 ≤800）。 */
const MAX_EVAL_TOKENS = 800
const MAX_EXPLANATION = 500
const MAX_LIST_ITEMS = 5

/** 严格自评形状：分数必须是 0–100 整数，越界即整体作废。 */
const selfEvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().min(1)).min(1),
  weaknesses: z.array(z.string().min(1)),
  nextAction: z.string().min(1),
})

function parseSelfEvaluation(raw: string): z.infer<typeof selfEvaluationSchema> | null {
  const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
  let json: unknown
  try {
    json = JSON.parse(cleaned)
  } catch {
    return null
  }
  const parsed = selfEvaluationSchema.safeParse(json)
  return parsed.success ? parsed.data : null
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setJsonHeaders(res)

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

  const parsed = evaluateRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return jsonError(res, 400, 'INVALID_REQUEST')
  }
  const { mode, difficulty, challengeId, protocol, target, model, messages } = parsed.data

  const key = readApiKey(req.headers[HEADER_API_KEY])
  if (!key.ok) {
    return jsonError(res, key.code === 'UPSTREAM_AUTH' ? 401 : 400, key.code)
  }

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

  // 服务端复算硬规则：
  //  - promptcraft 检查模型最后一次输出是否符合题目格式要求
  //  - communication 检查用户自己的表达（safeCommunication 等）
  const checkTarget =
    challenge.mode === 'promptcraft'
      ? [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''
      : messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n')

  const hardCheckResults = runAllChecks(challenge.hardChecks, checkTarget)
  const hardScore = calculateHardScore(hardCheckResults)

  const transcript = messages
    .map((m) => `${m.role === 'user' ? '用户' : '对方/模型'}: ${m.content}`)
    .join('\n\n')

  try {
    const result = await dispatchProvider({
      protocol,
      target: pinned,
      apiKey: key.apiKey,
      model,
      systemPrompt: EVALUATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildEvaluationPrompt(challenge, transcript) }],
      maxTokens: MAX_EVAL_TOKENS,
      isOfficialOpenAiPreset: target.kind === 'preset' && target.presetId === 'openai',
    })

    const selfEval = parseSelfEvaluation(result.text)

    res.status(200).json({
      hardCheckResults: hardCheckResults.map((r) => ({
        type: r.type,
        passed: r.passed,
        explanation: r.explanation.slice(0, MAX_EXPLANATION),
      })),
      hardScore,
      evaluation: selfEval
        ? {
            score: selfEval.score,
            strengths: selfEval.strengths.slice(0, MAX_LIST_ITEMS).map((s) => s.slice(0, MAX_EXPLANATION)),
            weaknesses: selfEval.weaknesses.slice(0, MAX_LIST_ITEMS).map((s) => s.slice(0, MAX_EXPLANATION)),
            nextAction: selfEval.nextAction.slice(0, MAX_EXPLANATION),
            disclaimer: 'model-self-evaluation' as const,
          }
        : null,
    })
  } catch (err: unknown) {
    const { status, code } = statusForCode(errorCodeOf(err))
    jsonError(res, status, code)
  }
}
