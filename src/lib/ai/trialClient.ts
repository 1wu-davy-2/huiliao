/**
 * 浏览器侧同源 API 客户端。
 *
 * 凭据只经 X-Huiliao-Api-Key 头传递一次，永不进入 JSON 请求体、URL、
 * localStorage、IndexedDB、导出文件或 console。
 *
 * 平台级非 JSON 响应（Vercel 413 / 超时 HTML）一律映射为通用本地错误码，
 * 不渲染响应正文。
 */

import type {
  ApiProtocol,
  TrialDifficulty,
  TrialEvaluation,
  TrialMode,
  TrialSessionRecord,
} from '@/types'

/** 敏感头名称：与服务端 contracts.HEADER_API_KEY 对应。 */
export const API_KEY_HEADER = 'X-Huiliao-Api-Key'

export interface TurnRequest {
  mode: TrialMode
  difficulty: TrialDifficulty
  challengeId: string
  protocol: ApiProtocol
  target: { kind: 'preset'; presetId: string } | { kind: 'custom'; baseUrl: string }
  model: string
  roundLimit: number
  roundsUsed: number
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface TurnResponse {
  text: string
  finishReason: 'stop' | 'length' | 'blocked' | 'unknown'
  usage: { inputTokens: number | null; outputTokens: number | null }
}

/**
 * /api/ai/evaluate 的响应信封。
 *
 * hardCheckResults 与 hardScore 由服务端按已审校题目重新计算，具有权威性；
 * 浏览器不得用自己算出的分数替代它们。evaluation 为模型自评，可能为 null。
 */
export interface EvaluationResponse {
  hardCheckResults: TrialSessionRecord['hardCheckResults']
  hardScore: number
  evaluation: TrialEvaluation | null
}

export type TrialErrorCode =
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
  | 'ABORTED'
  | 'NETWORK'
  | 'SERVER_ERROR'

export class TrialRequestError extends Error {
  readonly code: TrialErrorCode
  constructor(code: TrialErrorCode) {
    // message 只放错误码，绝不放上游正文、URL 或凭据
    super(code)
    this.name = 'TrialRequestError'
    this.code = code
  }
}

const ERROR_MESSAGES: Record<TrialErrorCode, string> = {
  INVALID_REQUEST: '请求内容不合法，请检查配置。',
  UNSUPPORTED_PROTOCOL: '不支持的协议。',
  INVALID_UPSTREAM_URL: '地址不可用。',
  UNKNOWN_CHALLENGE: '题目未通过审校或不存在。',
  UPSTREAM_AUTH: '认证失败，请检查 API Key。',
  UPSTREAM_RATE_LIMIT: '上游限流，请稍后再试。',
  UPSTREAM_TIMEOUT: '超时。',
  UPSTREAM_BAD_RESPONSE: '响应格式不兼容。',
  UPSTREAM_SECRET_ECHO: '上游响应包含凭据，已丢弃。',
  UPSTREAM_UNAVAILABLE: '上游服务不可用。',
  ABORTED: '已取消。',
  NETWORK: '网络错误。',
  SERVER_ERROR: '服务器错误。',
}

export function messageForCode(code: TrialErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.SERVER_ERROR
}

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_MESSAGES))

/**
 * 统一 POST。
 * 只有 error 字段命中已知错误码时才采用；其余（含平台 HTML 响应）映射为通用码。
 */
async function postJson(
  path: string,
  apiKey: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [API_KEY_HEADER]: apiKey,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if ((err as { name?: string } | null)?.name === 'AbortError') {
      throw new TrialRequestError('ABORTED')
    }
    throw new TrialRequestError('NETWORK')
  }

  if (!res.ok) {
    let code: string | undefined
    try {
      const parsed = (await res.json()) as { error?: unknown } | null
      if (parsed && typeof parsed.error === 'string') code = parsed.error
    } catch {
      // 平台返回 HTML（413 / 超时页）等非 JSON：不读取正文，走通用码
    }
    throw new TrialRequestError(
      code && KNOWN_CODES.has(code) ? (code as TrialErrorCode) : 'SERVER_ERROR',
    )
  }

  try {
    return await res.json()
  } catch {
    throw new TrialRequestError('UPSTREAM_BAD_RESPONSE')
  }
}

export async function sendTurn(
  apiKey: string,
  request: TurnRequest,
  signal?: AbortSignal,
): Promise<TurnResponse> {
  const json = (await postJson('/api/ai/turn', apiKey, request, signal)) as TurnResponse | null
  if (!json || typeof json.text !== 'string') {
    throw new TrialRequestError('UPSTREAM_BAD_RESPONSE')
  }
  return json
}

/**
 * 请求服务端复算硬规则并让同一模型自评。
 *
 * 服务端响应是信封 { hardCheckResults, hardScore, evaluation }。
 * 早期实现错误地在信封上检查 json.score，导致该函数恒返回 null——
 * 自评永不可用，且服务端权威硬规则结果被丢弃。此处按信封解包。
 */
export async function requestEvaluation(
  apiKey: string,
  request: TurnRequest,
  signal?: AbortSignal,
): Promise<EvaluationResponse | null> {
  const json = (await postJson(
    '/api/ai/evaluate',
    apiKey,
    {
      mode: request.mode,
      difficulty: request.difficulty,
      challengeId: request.challengeId,
      protocol: request.protocol,
      target: request.target,
      model: request.model,
      roundLimit: request.roundLimit,
      roundsUsed: request.roundsUsed,
      messages: request.messages,
    },
    signal,
  )) as Partial<EvaluationResponse> | null

  if (!json || typeof json.hardScore !== 'number' || !Array.isArray(json.hardCheckResults)) {
    return null
  }

  // 自评分数越界或缺失一律降级为 null，绝不夹取进合法区间
  const raw = json.evaluation
  const evaluation =
    raw &&
    typeof raw.score === 'number' &&
    Number.isInteger(raw.score) &&
    raw.score >= 0 &&
    raw.score <= 100
      ? raw
      : null

  return {
    hardCheckResults: json.hardCheckResults,
    hardScore: json.hardScore,
    evaluation,
  }
}

/**
 * 连接测试。
 *
 * 必须携带真实的已审校 challengeId：服务端题目审核门会拒绝任何未审校 id，
 * 因此不能用占位串。调用方需先选题，并已勾选同意。
 */
export async function testConnection(
  apiKey: string,
  request: Pick<
    TurnRequest,
    'mode' | 'difficulty' | 'challengeId' | 'protocol' | 'target' | 'model'
  >,
): Promise<{ ok: boolean; message: string }> {
  try {
    const json = await sendTurn(apiKey, {
      ...request,
      roundLimit: 5,
      roundsUsed: 0,
      messages: [{ role: 'user', content: '你好，这是一次连接测试。' }],
    })
    return json.text
      ? { ok: true, message: '连接成功' }
      : { ok: false, message: messageForCode('UPSTREAM_BAD_RESPONSE') }
  } catch (err) {
    const code = err instanceof TrialRequestError ? err.code : 'SERVER_ERROR'
    return { ok: false, message: messageForCode(code) }
  }
}
