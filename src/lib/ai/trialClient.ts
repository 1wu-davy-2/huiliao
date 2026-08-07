import type { ApiProtocol, TrialDifficulty, TrialMode, TrialEvaluation } from '@/types'

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

export type TrialClientError =
  | { code: 'NETWORK'; message: string }
  | { code: 'UPSTREAM_AUTH'; message: string }
  | { code: 'UPSTREAM_TIMEOUT'; message: string }
  | { code: 'SERVER_ERROR'; message: string }

export async function sendTurn(
  apiKey: string,
  request: TurnRequest,
  signal?: AbortSignal,
): Promise<TurnResponse> {
  const res = await fetch('/api/ai/turn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Huiliao-Api-Key': apiKey,
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const code = body?.error
    if (code === 'UPSTREAM_AUTH') throw { code: 'UPSTREAM_AUTH', message: '认证失败，请检查 API Key' }
    if (code === 'UPSTREAM_TIMEOUT') throw { code: 'UPSTREAM_TIMEOUT', message: '上游超时' }
    throw { code: 'SERVER_ERROR', message: `服务器错误 (${res.status})` }
  }

  const json: TurnResponse = await res.json()
  return json
}

export async function requestEvaluation(
  apiKey: string,
  request: TurnRequest,
): Promise<TrialEvaluation | null> {
  const res = await fetch('/api/ai/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Huiliao-Api-Key': apiKey,
    },
    body: JSON.stringify({
      challengeId: request.challengeId,
      protocol: request.protocol,
      target: request.target,
      model: request.model,
      roundLimit: request.roundLimit,
      roundsUsed: request.roundsUsed,
      messages: request.messages,
    }),
  })

  if (!res.ok) return null
  const json = await res.json()
  if (!json || typeof json.score !== 'number') return null
  return json
}

export async function testConnection(
  apiKey: string,
  protocol: ApiProtocol,
  target: TurnRequest['target'],
  model: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/ai/turn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Huiliao-Api-Key': apiKey,
      },
      body: JSON.stringify({
        mode: 'communication',
        difficulty: 'simple',
        challengeId: '__connection_test__',
        protocol,
        target,
        model,
        roundLimit: 5,
        roundsUsed: 0,
        messages: [{ role: 'user', content: '你好，这是一个连接测试，请回复"连接成功"。' }],
      }),
    })

    if (res.status === 401) return { ok: false, message: '认证失败' }
    if (!res.ok) return { ok: false, message: `地址不可用 (${res.status})` }

    const json = await res.json()
    if (json.text) return { ok: true, message: '连接成功' }
    return { ok: false, message: '响应格式不兼容' }
  } catch {
    return { ok: false, message: '连接超时或网络错误' }
  }
}
