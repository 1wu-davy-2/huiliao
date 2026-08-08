// @vitest-environment node
/**
 * /api/ai/turn 与 /api/ai/evaluate 的 handler 测试。
 *
 * 网络与 DNS 一律禁用：
 *  - urlPolicy.resolveAndPin 被 mock 为返回一个预置 PinnedTarget
 *  - providers.dispatchProvider 被 mock，测试可控制其返回值/抛错
 *  - challenges 模块被 mock，可切换是否存在已审校题目
 *
 * 关键不变量（结构断言，非仅 mock）：ai-trials.ts 的 AI_TRIALS_REVIEWED 必须为空。
 * 一旦人工审校通过并引入首个 reviewed 题目，请扩展本文件：
 *  - 用有效 id 断言 provider 被调用
 *  - 断言 mode/difficulty 与题目不一致时被拒（UNKNOWN_CHALLENGE）
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AI_TRIALS_REVIEWED } from '../../src/content/ai-trials'
import { AI_TRIALS_DRAFT } from '../../src/content/ai-trials-draft'
import type { TrialChallenge } from '../../src/types'

// ─── 模块 mock ──────────────────────────────────────────────

vi.mock('../../api/_lib/urlPolicy', async () => {
  const actual = await vi.importActual<typeof import('../../api/_lib/urlPolicy')>(
    '../../api/_lib/urlPolicy',
  )
  return {
    ...actual,
    resolveAndPin: vi.fn(async () => ({
      ok: true as const,
      hostname: 'api.openai.com',
      port: 443,
      pathPrefix: '/v1',
      pinnedAddress: '1.2.3.4',
      family: 4 as const,
      isIpLiteral: false,
    })),
  }
})

const dispatchMock = vi.fn(async () => ({
  text: 'model reply',
  finishReason: 'stop' as const,
  usage: { inputTokens: 10, outputTokens: 5 },
}))

vi.mock('../../api/_lib/providers', () => ({
  dispatchProvider: dispatchMock,
}))

const challengesState: {
  hasPool: boolean
  challenges: Map<string, TrialChallenge>
} = { hasPool: false, challenges: new Map() }

vi.mock('../../api/_lib/challenges', async () => {
  const actual = await vi.importActual<typeof import('../../api/_lib/challenges')>(
    '../../api/_lib/challenges',
  )
  return {
    ...actual,
    hasReviewedPool: () => challengesState.hasPool,
    getReviewedChallenge: (id: string) => challengesState.challenges.get(id),
  }
})

// 必须在 mock 声明之后再引入 handler，让 handler 内部拿到的是 mock 版本
const turnHandler = (await import('../../api/ai/turn')).default
const evaluateHandler = (await import('../../api/ai/evaluate')).default

// ─── 假 Request/Response ────────────────────────────────────

interface CapturedRes {
  statusCode: number
  headers: Record<string, string>
  body: unknown
  res: VercelResponse
}

function makeRes(): CapturedRes {
  const state: CapturedRes = {
    statusCode: 0,
    headers: {},
    body: undefined,
    res: {} as VercelResponse,
  }
  const res = {
    setHeader(name: string, value: string | number) {
      state.headers[name.toLowerCase()] = String(value)
      return res
    },
    getHeader(name: string) {
      return state.headers[name.toLowerCase()]
    },
    status(code: number) {
      state.statusCode = code
      return res
    },
    json(payload: unknown) {
      state.body = payload
      return res
    },
    end() {
      return res
    },
  }
  state.res = res as unknown as VercelResponse
  return state
}

function makeReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  const headers: Record<string, string | string[] | undefined> = {
    origin: 'http://localhost:5173',
    host: 'localhost:5173',
    ...(overrides.headers ?? {}),
  }
  return {
    method: 'POST',
    body: {},
    ...overrides,
    headers,
  } as unknown as VercelRequest
}

// ─── 有效请求生成器 ─────────────────────────────────────────

function baseTurnBody(over: Record<string, unknown> = {}): Record<string, unknown> {
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
    ...over,
  }
}

// ─── 生命周期 ──────────────────────────────────────────────

beforeEach(() => {
  dispatchMock.mockClear()
  challengesState.hasPool = false
  challengesState.challenges = new Map()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─── 测试 ──────────────────────────────────────────────────

describe('结构不变量：审核门', () => {
  it('AI_TRIALS_REVIEWED 必须为空（人工审校发布门）', () => {
    expect(AI_TRIALS_REVIEWED).toEqual([])
  })
})

describe.each([
  ['turn', turnHandler],
  ['evaluate', evaluateHandler],
])('%s handler — 方法、Origin、响应头', (_name, handler) => {
  it.each(['GET', 'PUT', 'DELETE'])('%s 返回 JSON 405 且 Allow: POST', async (method) => {
    const req = makeReq({ method })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(405)
    expect(cap.headers['allow']).toBe('POST')
    expect(cap.headers['content-type']).toMatch(/application\/json/)
    expect(cap.body).toEqual({ error: 'METHOD_NOT_ALLOWED' })
  })

  it('方法校验先于 Origin：坏 Origin 的 GET 仍返回 JSON 405', async () => {
    const req = makeReq({ method: 'GET', headers: { origin: 'https://evil.example.com' } })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(405)
    expect(cap.body).toEqual({ error: 'METHOD_NOT_ALLOWED' })
  })

  it.each([
    ['缺失 origin', undefined],
    ['null origin', 'null'],
    ['兄弟域', 'https://sibling.example.com'],
    ['子域', 'http://sub.localhost:5173'],
    // 前缀混淆：precise-match 白名单必须拒绝以合法 Origin 为前缀的攻击域
    ['前缀混淆', 'http://localhost:5173.evil.com'],
  ])('%s 被拒 (403)', async (_label, origin) => {
    // 显式 origin: undefined 覆盖 makeReq 默认，令 req.headers.origin 为 undefined
    const req = makeReq({
      headers: { origin, host: 'localhost:5173' },
      body: baseTurnBody(),
    })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(403)
    expect(cap.body).toEqual({ error: 'FORBIDDEN_ORIGIN' })
  })

  it('从不设置 Access-Control-Allow-Origin', async () => {
    const req = makeReq({ body: baseTurnBody() })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.headers['access-control-allow-origin']).toBeUndefined()
    expect(cap.headers['access-control-allow-credentials']).toBeUndefined()
    expect(cap.headers['access-control-allow-methods']).toBeUndefined()
  })

  it('每个响应都设置 Content-Type / Cache-Control / Vary', async () => {
    const req = makeReq({ method: 'GET' })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.headers['content-type']).toMatch(/application\/json/)
    expect(cap.headers['cache-control']).toBe('no-store')
    expect(cap.headers['vary']).toBe('Origin')
  })
})

describe.each([
  ['turn', turnHandler],
  ['evaluate', evaluateHandler],
])('%s handler — 凭据头', (_name, handler) => {
  it('缺失 → 401 UPSTREAM_AUTH', async () => {
    const req = makeReq({ body: baseTurnBody() })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(401)
    expect(cap.body).toEqual({ error: 'UPSTREAM_AUTH' })
  })

  it('数组（重复出现）→ 400 INVALID_REQUEST', async () => {
    const req = makeReq({
      body: baseTurnBody(),
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': ['sk-1', 'sk-2'],
      },
    })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })

  it.each([
    ['LF', 'sk-abc\ndef'],
    ['NUL', 'sk-\x00def'],
    ['CR', 'sk-\rdef'],
  ])('控制字符 %s → 400 INVALID_REQUEST', async (_label, key) => {
    const req = makeReq({
      body: baseTurnBody(),
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': key,
      },
    })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })

  it('>4 KB → 400 INVALID_REQUEST', async () => {
    const req = makeReq({
      body: baseTurnBody(),
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': 'a'.repeat(4097),
      },
    })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })
})

describe.each([
  ['turn', turnHandler],
  ['evaluate', evaluateHandler],
])('%s handler — Schema 边界', (_name, handler) => {
  const withKey = (body: unknown): VercelRequest =>
    makeReq({
      body,
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': 'sk-test',
      },
    })

  it('roundLimit 4 被拒', async () => {
    const cap = makeRes()
    await handler(withKey(baseTurnBody({ roundLimit: 4 })), cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })

  it('roundLimit 31 被拒', async () => {
    const cap = makeRes()
    await handler(withKey(baseTurnBody({ roundLimit: 31 })), cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })

  it('roundsUsed > roundLimit 被拒', async () => {
    const cap = makeRes()
    await handler(withKey(baseTurnBody({ roundLimit: 5, roundsUsed: 6 })), cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })

  it('总字符数 >120000 被拒', async () => {
    const long = 'x'.repeat(7500)
    const msgs = Array.from({ length: 17 }, () => ({ role: 'user' as const, content: long }))
    const cap = makeRes()
    await handler(
      withKey(baseTurnBody({ roundLimit: 30, roundsUsed: 0, messages: msgs })),
      cap.res,
    )
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })

  it('单条消息 >8000 字符被拒', async () => {
    const cap = makeRes()
    await handler(
      withKey(baseTurnBody({ messages: [{ role: 'user', content: 'y'.repeat(8001) }] })),
      cap.res,
    )
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })

  it('Content-Length > 256 KB → 413 INVALID_REQUEST', async () => {
    const req = makeReq({
      body: baseTurnBody(),
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': 'sk-test',
        'content-length': '300000',
      },
    })
    const cap = makeRes()
    await handler(req, cap.res)
    expect(cap.statusCode).toBe(413)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
  })
})

describe.each([
  ['turn', turnHandler],
  ['evaluate', evaluateHandler],
])('%s handler — 协议/预设绑定（跨厂商密钥泄漏防护）', (_name, handler) => {
  const withKey = (body: unknown): VercelRequest =>
    makeReq({
      body,
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': 'sk-test',
      },
    })

  const mismatches: Array<[string, string]> = [
    ['anthropic', 'openai'],
    ['anthropic', 'gemini'],
    ['openai-compatible', 'anthropic'],
    ['openai-compatible', 'gemini'],
    ['gemini', 'openai'],
    ['gemini', 'anthropic'],
  ]

  it.each(mismatches)('拒绝 protocol=%s + presetId=%s', async (protocol, presetId) => {
    const body = baseTurnBody({
      protocol,
      target: { kind: 'preset', presetId },
    })
    const cap = makeRes()
    await handler(withKey(body), cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'INVALID_REQUEST' })
    expect(dispatchMock).not.toHaveBeenCalled()
  })
})

describe.each([
  ['turn', turnHandler],
  ['evaluate', evaluateHandler],
])('%s handler — 挑战门（人工审校发布门）', (_name, handler) => {
  const withKey = (body: unknown): VercelRequest =>
    makeReq({
      body,
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': 'sk-test',
      },
    })

  it('审核池为空时任何 challengeId 都被拒且从不调用 provider', async () => {
    challengesState.hasPool = false
    const cap = makeRes()
    await handler(withKey(baseTurnBody({ challengeId: 'anything-goes' })), cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'UNKNOWN_CHALLENGE' })
    expect(dispatchMock).not.toHaveBeenCalled()
  })

  it('草稿 id 即便池非空也被拒（未 reviewed）', async () => {
    challengesState.hasPool = true
    // 保持 map 为空，模拟"该 id 不在已审校池"
    const draftId = AI_TRIALS_DRAFT[0]?.id ?? 'communication-simple-01'
    const cap = makeRes()
    await handler(withKey(baseTurnBody({ challengeId: draftId })), cap.res)
    expect(cap.statusCode).toBe(400)
    expect(cap.body).toEqual({ error: 'UNKNOWN_CHALLENGE' })
    expect(dispatchMock).not.toHaveBeenCalled()
  })

  // TODO(review-gate): 当首个 reviewed 题目引入后，扩展本节：
  //   1. 用真实 reviewed id 断言 provider 被调用一次
  //   2. mode/difficulty 与题目不匹配时断言返回 UNKNOWN_CHALLENGE
})

// ─── evaluate 专属：自评 JSON 处理 ─────────────────────────

describe('evaluate handler — 自评 JSON 处理', () => {
  const reviewedChallenge: TrialChallenge = {
    id: 'test-reviewed-01',
    reviewStatus: 'reviewed',
    mode: 'communication',
    difficulty: 'simple',
    title: '测试题',
    brief: '简',
    objective: '目标',
    initialPrompt: '开始',
    acceptanceCriteria: ['A'],
    hardChecks: [{ type: 'nonEmpty' }],
  }

  const withReviewed = () => {
    challengesState.hasPool = true
    challengesState.challenges = new Map([[reviewedChallenge.id, reviewedChallenge]])
  }

  const withKey = (body: unknown): VercelRequest =>
    makeReq({
      body,
      headers: {
        origin: 'http://localhost:5173',
        host: 'localhost:5173',
        'x-huiliao-api-key': 'sk-test',
      },
    })

  const body = baseTurnBody({
    challengeId: reviewedChallenge.id,
    messages: [{ role: 'user', content: '嗨' }],
  })

  it('非法 JSON → evaluation: null（不夹取）', async () => {
    withReviewed()
    dispatchMock.mockResolvedValueOnce({
      text: 'not-json-at-all',
      finishReason: 'stop',
      usage: { inputTokens: 1, outputTokens: 1 },
    })
    const cap = makeRes()
    await evaluateHandler(withKey(body), cap.res)
    expect(cap.statusCode).toBe(200)
    expect((cap.body as { evaluation: unknown }).evaluation).toBeNull()
  })

  it('缺字段 → evaluation: null', async () => {
    withReviewed()
    dispatchMock.mockResolvedValueOnce({
      text: JSON.stringify({ score: 80, strengths: ['a'] }), // 缺 weaknesses/nextAction
      finishReason: 'stop',
      usage: { inputTokens: 1, outputTokens: 1 },
    })
    const cap = makeRes()
    await evaluateHandler(withKey(body), cap.res)
    expect((cap.body as { evaluation: unknown }).evaluation).toBeNull()
  })

  it.each([-1, 101, 200, -50])('score 越界 %s → evaluation: null（不夹取到 0/100）', async (score) => {
    withReviewed()
    dispatchMock.mockResolvedValueOnce({
      text: JSON.stringify({
        score,
        strengths: ['s'],
        weaknesses: ['w'],
        nextAction: 'n',
      }),
      finishReason: 'stop',
      usage: { inputTokens: 1, outputTokens: 1 },
    })
    const cap = makeRes()
    await evaluateHandler(withKey(body), cap.res)
    const payload = cap.body as { evaluation: unknown }
    expect(payload.evaluation).toBeNull()
  })

  it('解释字段被截至 500 字符', async () => {
    withReviewed()
    const long = 'x'.repeat(2000)
    dispatchMock.mockResolvedValueOnce({
      text: JSON.stringify({
        score: 70,
        strengths: [long],
        weaknesses: [long],
        nextAction: long,
      }),
      finishReason: 'stop',
      usage: { inputTokens: 1, outputTokens: 1 },
    })
    const cap = makeRes()
    await evaluateHandler(withKey(body), cap.res)
    const evaluation = (cap.body as {
      evaluation: {
        strengths: string[]
        weaknesses: string[]
        nextAction: string
      } | null
    }).evaluation
    expect(evaluation).not.toBeNull()
    if (evaluation) {
      expect(evaluation.strengths[0].length).toBe(500)
      expect(evaluation.weaknesses[0].length).toBe(500)
      expect(evaluation.nextAction.length).toBe(500)
    }
  })
})

// ─── 响应体不泄漏敏感数据 ──────────────────────────────────

describe('错误响应不泄漏 URL/凭据/上游正文', () => {
  it('所有错误响应体只包含 error code', async () => {
    const cap = makeRes()
    await turnHandler(
      makeReq({
        body: baseTurnBody(),
        headers: {
          origin: 'http://localhost:5173',
          host: 'localhost:5173',
          'x-huiliao-api-key': 'sk-secret-value-xyz',
        },
      }),
      cap.res,
    )
    const serialized = JSON.stringify(cap.body)
    expect(serialized).not.toMatch(/sk-secret-value-xyz/)
    expect(serialized).not.toMatch(/api\.openai\.com/)
    expect(serialized).not.toMatch(/1\.2\.3\.4/)
    // 响应体形如 {"error": "CODE"}
    expect(cap.body).toEqual({ error: expect.any(String) })
  })
})
