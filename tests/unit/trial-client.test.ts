import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_KEY_HEADER,
  TrialRequestError,
  messageForCode,
  requestEvaluation,
  sendTurn,
  testConnection,
  type TurnRequest,
} from '@/lib/ai/trialClient'

const SENTINEL_KEY = 'sk-sentinel-DO-NOT-LEAK-0123456789'

function baseRequest(overrides: Partial<TurnRequest> = {}): TurnRequest {
  return {
    mode: 'communication',
    difficulty: 'simple',
    challengeId: 'communication-simple-01',
    protocol: 'openai-compatible',
    target: { kind: 'preset', presetId: 'openai' },
    model: 'gpt-4o-mini',
    roundLimit: 10,
    roundsUsed: 0,
    messages: [{ role: 'user', content: '你好' }],
    ...overrides,
  }
}

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response
}

/** 平台级非 JSON 响应（Vercel 413 / 超时 HTML）。json() 抛错。 */
function htmlResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON')
    },
  } as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lastCall() {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) throw new Error('fetch 未被调用')
  const [url, init] = call as [string, RequestInit]
  return {
    url,
    init,
    headers: (init.headers ?? {}) as Record<string, string>,
    rawBody: String(init.body ?? ''),
    body: JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>,
  }
}

describe('trialClient 凭据边界', () => {
  it('API Key 只出现在专用敏感头中，不进 JSON 请求体', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { text: '回复', finishReason: 'stop', usage: { inputTokens: 1, outputTokens: 2 } }),
    )
    await sendTurn(SENTINEL_KEY, baseRequest())

    const { headers, rawBody, body } = lastCall()
    expect(headers[API_KEY_HEADER]).toBe(SENTINEL_KEY)
    expect(rawBody).not.toContain(SENTINEL_KEY)
    expect(body).not.toHaveProperty('apiKey')
  })

  it('不复用 Authorization 头（可能被 Vercel Preview Protection 占用）', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { text: 'x', finishReason: 'stop', usage: {} }))
    await sendTurn(SENTINEL_KEY, baseRequest())

    const { headers } = lastCall()
    expect(headers.Authorization).toBeUndefined()
    expect(headers.authorization).toBeUndefined()
  })

  it('凭据不出现在 URL 中', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { text: 'x', finishReason: 'stop', usage: {} }))
    await sendTurn(SENTINEL_KEY, baseRequest())

    const { url } = lastCall()
    expect(url).toBe('/api/ai/turn')
    expect(url).not.toContain(SENTINEL_KEY)
  })

  it('公共字段完整透传，且请求为同源相对路径 POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { text: 'x', finishReason: 'stop', usage: {} }))
    await sendTurn(SENTINEL_KEY, baseRequest({ roundLimit: 30, roundsUsed: 7 }))

    const { url, init, body } = lastCall()
    expect(url.startsWith('/api/')).toBe(true)
    expect(init.method).toBe('POST')
    expect(body.mode).toBe('communication')
    expect(body.difficulty).toBe('simple')
    expect(body.challengeId).toBe('communication-simple-01')
    expect(body.protocol).toBe('openai-compatible')
    expect(body.target).toEqual({ kind: 'preset', presetId: 'openai' })
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.roundLimit).toBe(30)
    expect(body.roundsUsed).toBe(7)
  })

  it('自定义 Base URL 以 target.custom 形式传递', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { text: 'x', finishReason: 'stop', usage: {} }))
    await sendTurn(
      SENTINEL_KEY,
      baseRequest({ target: { kind: 'custom', baseUrl: 'https://gw.example.com/v1' } }),
    )

    expect(lastCall().body.target).toEqual({
      kind: 'custom',
      baseUrl: 'https://gw.example.com/v1',
    })
  })
})

describe('trialClient 错误码映射', () => {
  it('JSON 错误响应中的已知 error 字段被采用', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, { error: 'UPSTREAM_AUTH' }))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'UPSTREAM_AUTH',
    })
  })

  it('未知 error 字符串不被信任，降级为 SERVER_ERROR', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'SOMETHING_MADE_UP' }))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    })
  })

  it('平台 413 非 JSON 响应映射为通用错误码，不渲染正文', async () => {
    fetchMock.mockResolvedValue(htmlResponse(413))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    })
  })

  it('平台 504 非 JSON 响应同样映射为通用错误码', async () => {
    fetchMock.mockResolvedValue(htmlResponse(504))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    })
  })

  it('成功响应但正文不可解析 → UPSTREAM_BAD_RESPONSE', async () => {
    fetchMock.mockResolvedValue(htmlResponse(200))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'UPSTREAM_BAD_RESPONSE',
    })
  })

  it('成功响应缺少 text 字段 → UPSTREAM_BAD_RESPONSE', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { finishReason: 'stop', usage: {} }))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'UPSTREAM_BAD_RESPONSE',
    })
  })

  it('请求被取消映射为 ABORTED', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'ABORTED',
    })
  })

  it('网络异常映射为 NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(sendTurn(SENTINEL_KEY, baseRequest())).rejects.toMatchObject({
      code: 'NETWORK',
    })
  })

  it('抛出的错误不泄漏凭据或上游正文', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(502, { error: 'UPSTREAM_AUTH', upstreamBody: `raw ${SENTINEL_KEY} leak` }),
    )
    let caught: unknown
    try {
      await sendTurn(SENTINEL_KEY, baseRequest())
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(TrialRequestError)
    const serialized = `${(caught as Error).message}${(caught as Error).stack ?? ''}`
    expect(serialized).not.toContain(SENTINEL_KEY)
    expect(serialized).not.toContain('raw ')
  })

  it('AbortSignal 透传给 fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { text: 'x', finishReason: 'stop', usage: {} }))
    const controller = new AbortController()
    await sendTurn(SENTINEL_KEY, baseRequest(), controller.signal)
    expect(lastCall().init.signal).toBe(controller.signal)
  })

  it('messageForCode 为每个已知码提供中文文案且不含码本身以外的技术细节', () => {
    expect(messageForCode('UPSTREAM_AUTH')).toContain('认证失败')
    expect(messageForCode('UPSTREAM_TIMEOUT')).toContain('超时')
    expect(messageForCode('UNKNOWN_CHALLENGE')).toContain('审校')
  })
})

describe('requestEvaluation 信封解包（回归守卫）', () => {
  const envelope = {
    hardCheckResults: [{ type: 'nonEmpty', passed: true, explanation: '输出非空' }],
    hardScore: 80,
    evaluation: {
      score: 75,
      strengths: ['清楚'],
      weaknesses: ['略急'],
      nextAction: '慢一点',
      disclaimer: 'model-self-evaluation',
    },
  }

  it('解包 { hardCheckResults, hardScore, evaluation }，不在信封上找 score', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, envelope))
    const result = await requestEvaluation(SENTINEL_KEY, baseRequest())

    // 旧实现在信封上检查 json.score（undefined），导致恒返回 null：
    // 自评永不可用，且服务端权威硬规则结果被丢弃。
    expect(result).not.toBeNull()
    expect(result!.hardScore).toBe(80)
    expect(result!.hardCheckResults).toHaveLength(1)
    expect(result!.evaluation!.score).toBe(75)
  })

  it('服务端硬规则结果被原样返回，供调用方覆盖本地计算', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        ...envelope,
        hardScore: 40,
        hardCheckResults: [
          { type: 'nonEmpty', passed: true, explanation: '非空' },
          { type: 'jsonObject', passed: false, explanation: '不是 JSON 对象' },
        ],
      }),
    )
    const result = await requestEvaluation(SENTINEL_KEY, baseRequest())
    expect(result!.hardScore).toBe(40)
    expect(result!.hardCheckResults[1].passed).toBe(false)
  })

  it('自评分数越界一律降级为 null，绝不夹取进合法区间', async () => {
    for (const bad of [101, -1, 150, 3.5]) {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { ...envelope, evaluation: { ...envelope.evaluation, score: bad } }),
      )
      const result = await requestEvaluation(SENTINEL_KEY, baseRequest())
      expect(result).not.toBeNull()
      expect(result!.evaluation, `score=${bad}`).toBeNull()
      // 硬规则仍然保留
      expect(result!.hardScore).toBe(80)
    }
  })

  it('自评为 null 时仍返回权威硬规则结果', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ...envelope, evaluation: null }))
    const result = await requestEvaluation(SENTINEL_KEY, baseRequest())
    expect(result!.evaluation).toBeNull()
    expect(result!.hardScore).toBe(80)
  })

  it('信封缺少 hardScore 或 hardCheckResults 时返回 null', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { evaluation: envelope.evaluation }))
    expect(await requestEvaluation(SENTINEL_KEY, baseRequest())).toBeNull()

    fetchMock.mockResolvedValue(jsonResponse(200, { hardScore: 50 }))
    expect(await requestEvaluation(SENTINEL_KEY, baseRequest())).toBeNull()
  })

  it('凭据只在敏感头中，不进自评请求体', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, envelope))
    await requestEvaluation(SENTINEL_KEY, baseRequest())

    const { url, headers, rawBody } = lastCall()
    expect(url).toBe('/api/ai/evaluate')
    expect(headers[API_KEY_HEADER]).toBe(SENTINEL_KEY)
    expect(rawBody).not.toContain(SENTINEL_KEY)
  })
})

describe('testConnection', () => {
  it('携带真实 challengeId，不使用会被审核门拒绝的占位串', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { text: '好', finishReason: 'stop', usage: {} }))
    const result = await testConnection(SENTINEL_KEY, {
      mode: 'communication',
      difficulty: 'simple',
      challengeId: 'communication-simple-01',
      protocol: 'openai-compatible',
      target: { kind: 'preset', presetId: 'openai' },
      model: 'gpt-4o-mini',
    })

    expect(result.ok).toBe(true)
    const { body } = lastCall()
    expect(body.challengeId).toBe('communication-simple-01')
    expect(body.challengeId).not.toBe('__connection_test__')
  })

  it('认证失败返回可读文案，不抛出，也不泄漏凭据', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'UPSTREAM_AUTH' }))
    const result = await testConnection(SENTINEL_KEY, {
      mode: 'communication',
      difficulty: 'simple',
      challengeId: 'communication-simple-01',
      protocol: 'openai-compatible',
      target: { kind: 'preset', presetId: 'openai' },
      model: 'gpt-4o-mini',
    })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('认证失败')
    expect(result.message).not.toContain(SENTINEL_KEY)
  })

  it('题目未审校时返回审核门文案', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'UNKNOWN_CHALLENGE' }))
    const result = await testConnection(SENTINEL_KEY, {
      mode: 'communication',
      difficulty: 'simple',
      challengeId: 'draft-id',
      protocol: 'openai-compatible',
      target: { kind: 'preset', presetId: 'openai' },
      model: 'gpt-4o-mini',
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('审校')
  })

  it('网络异常不抛出，返回本地文案', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await testConnection(SENTINEL_KEY, {
      mode: 'communication',
      difficulty: 'simple',
      challengeId: 'communication-simple-01',
      protocol: 'openai-compatible',
      target: { kind: 'custom', baseUrl: 'https://gw.example.com/v1' },
      model: 'm',
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('网络')
  })
})
