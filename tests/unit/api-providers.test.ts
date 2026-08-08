// @vitest-environment node
import { vi } from 'vitest'

vi.mock('../../api/_lib/upstream', () => ({
  upstreamRequest: vi.fn(),
}))

import { beforeEach, describe, expect, it } from 'vitest'
import { upstreamRequest } from '../../api/_lib/upstream'
import type { PinnedTarget } from '../../api/_lib/urlPolicy'
import {
  callOpenAiCompatible,
  callAnthropic,
  callGemini,
  dispatchProvider,
} from '../../api/_lib/providers'
import type { ProviderCall } from '../../api/_lib/providers/types'
import type { ApiProtocol } from '../../src/types'

const mockedUpstream = vi.mocked(upstreamRequest)

const target = (pathPrefix: string): PinnedTarget => ({
  hostname: 'api.example.com',
  port: 443,
  pathPrefix,
  pinnedAddress: '1.1.1.1',
  family: 4,
  isIpLiteral: false,
})

const baseCall = (overrides: Partial<ProviderCall> = {}): ProviderCall => ({
  target: target('/v1'),
  apiKey: 'sk-test-key-abc-123',
  model: 'gpt-4o-mini',
  systemPrompt: 'SYSTEM',
  messages: [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
    { role: 'user', content: 'more' },
  ],
  maxTokens: 1200,
  ...overrides,
})

const upstreamOk = (body: unknown) => ({ ok: true as const, status: 200, body: JSON.stringify(body) })

beforeEach(() => {
  mockedUpstream.mockReset()
})

// ─── OpenAI-compatible ─────────────────────────────────────────

describe('callOpenAiCompatible', () => {
  const okBody = {
    choices: [{ message: { content: '答复' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 12, completion_tokens: 5 },
  }

  it('保留 /v1 前缀并使用 /chat/completions 适配器路径', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callOpenAiCompatible(baseCall())
    const [passedTarget, path] = mockedUpstream.mock.calls[0]
    expect(path).toBe('/chat/completions')
    expect(passedTarget.pathPrefix).toBe('/v1')
  })

  it('自定义目标 pathPrefix 原样透传（如 /custom-gateway）', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callOpenAiCompatible(baseCall({ target: target('/custom-gateway') }))
    expect(mockedUpstream.mock.calls[0][0].pathPrefix).toBe('/custom-gateway')
  })

  it('Authorization: Bearer <key>', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callOpenAiCompatible(baseCall())
    const [, , headers] = mockedUpstream.mock.calls[0]
    expect(headers).toEqual({ Authorization: 'Bearer sk-test-key-abc-123' })
  })

  it('system prompt 走前置 role:system 消息', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callOpenAiCompatible(baseCall())
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYSTEM' })
    expect(body.messages.slice(1).map((m: { role: string }) => m.role)).toEqual([
      'user',
      'assistant',
      'user',
    ])
  })

  it('官方 OpenAI 预设使用 max_completion_tokens', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callOpenAiCompatible(baseCall({ isOfficialOpenAiPreset: true }))
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.max_completion_tokens).toBe(1200)
    expect(body.max_tokens).toBeUndefined()
  })

  it('自定义兼容目标使用 max_tokens', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callOpenAiCompatible(baseCall({ isOfficialOpenAiPreset: false }))
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.max_tokens).toBe(1200)
    expect(body.max_completion_tokens).toBeUndefined()
  })

  it('请求体不含 tools/stream/response 持久化字段', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callOpenAiCompatible(baseCall())
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.tools).toBeUndefined()
    expect(body.tool_choice).toBeUndefined()
    expect(body.stream).toBeUndefined()
    expect(body.store).toBeUndefined()
    expect(body.response_format).toBeUndefined()
    expect(Object.keys(body).sort()).toEqual(['max_tokens', 'messages', 'model'].sort())
  })

  it('normalized 成功响应含 usage 数字', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    const r = await callOpenAiCompatible(baseCall())
    expect(r).toEqual({
      text: '答复',
      finishReason: 'stop',
      usage: { inputTokens: 12, outputTokens: 5 },
    })
  })

  it.each([
    ['stop', 'stop'],
    ['length', 'length'],
    ['content_filter', 'blocked'],
    ['tool_calls', 'unknown'],
    [null, 'unknown'],
  ])('finish_reason %s → %s', async (raw, expected) => {
    const body =
      expected === 'blocked'
        ? { choices: [{ message: { content: null }, finish_reason: raw }] }
        : { choices: [{ message: { content: 'x' }, finish_reason: raw }] }
    mockedUpstream.mockResolvedValue(upstreamOk(body))
    const r = await callOpenAiCompatible(baseCall())
    expect(r.finishReason).toBe(expected)
  })

  it.each<[string, unknown]>([
    ['non-JSON', 'not json'],
    ['missing choices', {}],
    ['non-string content', { choices: [{ message: { content: 42 }, finish_reason: 'stop' }] }],
    ['empty text', { choices: [{ message: { content: '' }, finish_reason: 'stop' }] }],
    ['whitespace text', { choices: [{ message: { content: '   ' }, finish_reason: 'stop' }] }],
    [
      'over-max text',
      {
        choices: [{ message: { content: 'x'.repeat(8001) }, finish_reason: 'stop' }],
      },
    ],
    [
      'negative usage',
      {
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: -1, completion_tokens: 2 },
      },
    ],
  ])('malformed → UPSTREAM_BAD_RESPONSE: %s', async (_label, body) => {
    const raw = typeof body === 'string' ? body : JSON.stringify(body)
    mockedUpstream.mockResolvedValue({ ok: true, status: 200, body: raw })
    await expect(callOpenAiCompatible(baseCall())).rejects.toMatchObject({
      code: 'UPSTREAM_BAD_RESPONSE',
    })
  })

  it.each(['UPSTREAM_AUTH', 'UPSTREAM_RATE_LIMIT', 'UPSTREAM_TIMEOUT', 'UPSTREAM_UNAVAILABLE'])(
    '上游错误 %s 原样抛出',
    async (code) => {
      mockedUpstream.mockResolvedValue({ ok: false, errorCode: code })
      await expect(callOpenAiCompatible(baseCall())).rejects.toMatchObject({ code })
    },
  )
})

// ─── Anthropic ─────────────────────────────────────────────────

describe('callAnthropic', () => {
  const okBody = {
    content: [{ type: 'text', text: '回复' }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 3 },
  }

  it('使用 /messages 并保留 pathPrefix', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callAnthropic(baseCall({ target: target('/v1') }))
    const [passedTarget, path] = mockedUpstream.mock.calls[0]
    expect(path).toBe('/messages')
    expect(passedTarget.pathPrefix).toBe('/v1')
  })

  it('x-api-key + anthropic-version 头', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callAnthropic(baseCall({ apiKey: 'sk-ant-key-999' }))
    expect(mockedUpstream.mock.calls[0][2]).toEqual({
      'x-api-key': 'sk-ant-key-999',
      'anthropic-version': '2023-06-01',
    })
  })

  it('system 走顶层 system 字段而非 messages', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callAnthropic(baseCall())
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.system).toBe('SYSTEM')
    expect(body.messages.every((m: { role: string }) => m.role !== 'system')).toBe(true)
  })

  it('max_tokens 必传', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callAnthropic(baseCall())
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.max_tokens).toBe(1200)
  })

  it('请求体只含允许字段', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callAnthropic(baseCall())
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.tools).toBeUndefined()
    expect(body.stream).toBeUndefined()
    expect(Object.keys(body).sort()).toEqual(['max_tokens', 'messages', 'model', 'system'].sort())
  })

  it('normalized 成功响应', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    const r = await callAnthropic(baseCall())
    expect(r).toEqual({
      text: '回复',
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 3 },
    })
  })

  it.each([
    ['end_turn', 'stop'],
    ['stop_sequence', 'stop'],
    ['max_tokens', 'length'],
    ['refusal', 'blocked'],
    ['tool_use', 'unknown'],
  ])('stop_reason %s → %s', async (raw, expected) => {
    const body = {
      content: [{ type: 'text', text: 'x' }],
      stop_reason: raw,
    }
    mockedUpstream.mockResolvedValue(upstreamOk(body))
    const r = await callAnthropic(baseCall())
    expect(r.finishReason).toBe(expected)
  })

  it.each<[string, unknown]>([
    ['non-JSON', 'nope'],
    ['missing content', { stop_reason: 'end_turn' }],
    [
      'non-string text',
      { content: [{ type: 'text', text: 5 }], stop_reason: 'end_turn' },
    ],
    ['empty text', { content: [{ type: 'text', text: '' }], stop_reason: 'end_turn' }],
    [
      'whitespace text',
      { content: [{ type: 'text', text: '   ' }], stop_reason: 'end_turn' },
    ],
    [
      'over-max text',
      { content: [{ type: 'text', text: 'x'.repeat(8001) }], stop_reason: 'end_turn' },
    ],
    [
      'negative usage',
      {
        content: [{ type: 'text', text: 'ok' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: -1, output_tokens: 0 },
      },
    ],
  ])('malformed → UPSTREAM_BAD_RESPONSE: %s', async (_label, body) => {
    const raw = typeof body === 'string' ? body : JSON.stringify(body)
    mockedUpstream.mockResolvedValue({ ok: true, status: 200, body: raw })
    await expect(callAnthropic(baseCall())).rejects.toMatchObject({
      code: 'UPSTREAM_BAD_RESPONSE',
    })
  })

  it.each(['UPSTREAM_AUTH', 'UPSTREAM_RATE_LIMIT', 'UPSTREAM_TIMEOUT', 'UPSTREAM_UNAVAILABLE'])(
    '上游错误 %s 原样抛出',
    async (code) => {
      mockedUpstream.mockResolvedValue({ ok: false, errorCode: code })
      await expect(callAnthropic(baseCall())).rejects.toMatchObject({ code })
    },
  )
})

// ─── Gemini ────────────────────────────────────────────────────

describe('callGemini', () => {
  const okBody = {
    candidates: [
      {
        content: { parts: [{ text: '嗨' }] },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 2 },
  }

  it('使用 /models/{model}:generateContent 且保留 pathPrefix', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callGemini(baseCall({ model: 'gemini-1.5-pro', target: target('/v1beta') }))
    const [passedTarget, path] = mockedUpstream.mock.calls[0]
    expect(path).toBe('/models/gemini-1.5-pro:generateContent')
    expect(passedTarget.pathPrefix).toBe('/v1beta')
  })

  it('x-goog-api-key 头，key 绝不出现在路径或查询串', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callGemini(baseCall({ apiKey: 'AIzaSyDeadBeefSecret', model: 'gemini-1.5-flash' }))
    const [, path, headers, body] = mockedUpstream.mock.calls[0]
    expect(headers).toEqual({ 'x-goog-api-key': 'AIzaSyDeadBeefSecret' })
    expect(path).not.toContain('AIzaSyDeadBeefSecret')
    expect(path).not.toContain('?')
    expect(path).not.toContain('key=')
    // body 请求内容里也不应出现 key（我们没往 body 塞 key）
    expect(body).not.toContain('AIzaSyDeadBeefSecret')
  })

  it('assistant → model 角色映射；systemInstruction 顶层', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callGemini(baseCall({ model: 'gemini-1.5-flash' }))
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(['user', 'model', 'user'])
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'SYSTEM' }] })
  })

  it('generationConfig.maxOutputTokens', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callGemini(baseCall({ model: 'gemini-1.5-flash' }))
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.generationConfig).toEqual({ maxOutputTokens: 1200 })
  })

  it('请求体只含 contents/systemInstruction/generationConfig', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    await callGemini(baseCall({ model: 'gemini-1.5-flash' }))
    const body = JSON.parse(mockedUpstream.mock.calls[0][3])
    expect(body.tools).toBeUndefined()
    expect(body.safetySettings).toBeUndefined()
    expect(Object.keys(body).sort()).toEqual(
      ['contents', 'generationConfig', 'systemInstruction'].sort(),
    )
  })

  it('normalized 成功响应含 usage', async () => {
    mockedUpstream.mockResolvedValue(upstreamOk(okBody))
    const r = await callGemini(baseCall({ model: 'gemini-1.5-flash' }))
    expect(r).toEqual({
      text: '嗨',
      finishReason: 'stop',
      usage: { inputTokens: 7, outputTokens: 2 },
    })
  })

  it.each([
    ['STOP', 'stop'],
    ['MAX_TOKENS', 'length'],
    ['SAFETY', 'blocked'],
    ['BLOCKLIST', 'blocked'],
    ['PROHIBITED_CONTENT', 'blocked'],
    ['SPII', 'blocked'],
    ['OTHER', 'unknown'],
  ])('finishReason %s → %s', async (raw, expected) => {
    const body =
      expected === 'blocked'
        ? { candidates: [{ content: { parts: [{ text: '' }] }, finishReason: raw }] }
        : { candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: raw }] }
    mockedUpstream.mockResolvedValue(upstreamOk(body))
    const r = await callGemini(baseCall({ model: 'gemini-1.5-flash' }))
    expect(r.finishReason).toBe(expected)
  })

  it('promptFeedback.blockReason 无 candidates → blocked', async () => {
    mockedUpstream.mockResolvedValue(
      upstreamOk({ promptFeedback: { blockReason: 'SAFETY' } }),
    )
    const r = await callGemini(baseCall({ model: 'gemini-1.5-flash' }))
    expect(r.finishReason).toBe('blocked')
    expect(r.text).toBe('')
  })

  it('无效 model id → INVALID_REQUEST', async () => {
    await expect(callGemini(baseCall({ model: 'bad model!' }))).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    })
  })

  it.each<[string, unknown]>([
    ['non-JSON', 'nope'],
    ['no candidates no promptFeedback', {}],
    [
      'non-string text',
      { candidates: [{ content: { parts: [{ text: 9 }] }, finishReason: 'STOP' }] },
    ],
    [
      'empty text',
      { candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'STOP' }] },
    ],
    [
      'whitespace text',
      { candidates: [{ content: { parts: [{ text: '   ' }] }, finishReason: 'STOP' }] },
    ],
    [
      'over-max text',
      {
        candidates: [
          { content: { parts: [{ text: 'x'.repeat(8001) }] }, finishReason: 'STOP' },
        ],
      },
    ],
    [
      'negative usage',
      {
        candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: -1, candidatesTokenCount: 0 },
      },
    ],
  ])('malformed → UPSTREAM_BAD_RESPONSE: %s', async (_label, body) => {
    const raw = typeof body === 'string' ? body : JSON.stringify(body)
    mockedUpstream.mockResolvedValue({ ok: true, status: 200, body: raw })
    await expect(callGemini(baseCall({ model: 'gemini-1.5-flash' }))).rejects.toMatchObject({
      code: 'UPSTREAM_BAD_RESPONSE',
    })
  })

  it.each(['UPSTREAM_AUTH', 'UPSTREAM_RATE_LIMIT', 'UPSTREAM_TIMEOUT', 'UPSTREAM_UNAVAILABLE'])(
    '上游错误 %s 原样抛出',
    async (code) => {
      mockedUpstream.mockResolvedValue({ ok: false, errorCode: code })
      await expect(callGemini(baseCall({ model: 'gemini-1.5-flash' }))).rejects.toMatchObject({
        code,
      })
    },
  )
})

// ─── dispatchProvider ──────────────────────────────────────────

describe('dispatchProvider', () => {
  it('未知协议 → UNSUPPORTED_PROTOCOL', async () => {
    await expect(
      dispatchProvider({
        ...baseCall(),
        protocol: 'ftp-fake' as unknown as ApiProtocol,
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROTOCOL' })
    expect(mockedUpstream).not.toHaveBeenCalled()
  })

  it('上游回显完整 API key → UPSTREAM_SECRET_ECHO；不返回文本', async () => {
    const key = 'sk-super-secret-xyz-42'
    mockedUpstream.mockResolvedValue(
      upstreamOk({
        choices: [
          {
            message: { content: `here is your key ${key} enjoy` },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    )
    await expect(
      dispatchProvider({
        ...baseCall({ apiKey: key }),
        protocol: 'openai-compatible',
      }),
    ).rejects.toMatchObject({ code: 'UPSTREAM_SECRET_ECHO' })
  })

  it('抛出错误的 message 不泄漏 key/URL/上游 body', async () => {
    const key = 'sk-leak-check-777'
    mockedUpstream.mockResolvedValue({ ok: false, errorCode: 'UPSTREAM_AUTH' })
    try {
      await dispatchProvider({
        ...baseCall({ apiKey: key }),
        protocol: 'openai-compatible',
      })
      throw new Error('should have thrown')
    } catch (err) {
      const msg = (err as Error).message
      expect(msg).not.toContain(key)
      expect(msg).not.toContain('api.example.com')
      expect(msg).not.toContain('/v1')
      expect(msg).not.toContain('1.1.1.1')
    }
  })
})
