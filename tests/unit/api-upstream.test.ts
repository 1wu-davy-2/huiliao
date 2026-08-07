// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'

/**
 * upstream.ts 传输层限制测试。
 *
 * 这些约束（25s 截止时间、1 MB 请求/响应上限、拒绝重定向、拒绝非 identity
 * 编码、地址钉定）此前完全没有覆盖：provider 测试把 upstreamRequest 整体
 * mock 掉了，urlPolicy 测试只覆盖策略层。
 *
 * 这里 mock node:https 而不是开真实 socket：既不需要自签证书，也能确定性地
 * 驱动 timeout 与超量响应。
 */

const requestMock = vi.fn()

vi.mock('node:https', () => ({
  default: { request: (...args: unknown[]) => requestMock(...args) },
  request: (...args: unknown[]) => requestMock(...args),
}))

const { upstreamRequest } = await import('../../api/_lib/upstream')
type PinnedTarget = Parameters<typeof upstreamRequest>[0]

const TARGET: PinnedTarget = {
  hostname: 'api.example.com',
  port: 443,
  pathPrefix: '/v1',
  pinnedAddress: '93.184.216.34',
  family: 4,
  isIpLiteral: false,
}

/** 伪造 ClientRequest：可驱动 error/timeout，并记录写入的 body。 */
class FakeRequest extends EventEmitter {
  destroyed = false
  written: Buffer[] = []
  destroy() {
    this.destroyed = true
  }
  setTimeout() {
    return this
  }
  write(chunk: Buffer) {
    this.written.push(Buffer.from(chunk))
    return true
  }
  end(chunk?: Buffer) {
    if (chunk) this.written.push(Buffer.from(chunk))
    return this
  }
}

/** 伪造 IncomingMessage。 */
class FakeResponse extends EventEmitter {
  constructor(
    public statusCode: number,
    public headers: Record<string, string> = {},
  ) {
    super()
  }
}

interface Harness {
  req: FakeRequest
  promise: Promise<unknown>
  respond: (res: FakeResponse) => void
}

/** 发起一次请求，拿到 fake req 与响应回调。 */
function start(
  body = '{"a":1}',
  target: PinnedTarget = TARGET,
  path = '/chat/completions',
  headers: Record<string, string> = {},
): Harness {
  const req = new FakeRequest()
  let responseCallback: ((res: FakeResponse) => void) | undefined
  requestMock.mockImplementation((_opts: unknown, cb: (res: FakeResponse) => void) => {
    responseCallback = cb
    return req
  })
  const promise = upstreamRequest(target, path, headers, body)
  return {
    req,
    promise,
    respond: (res) => {
      if (!responseCallback) throw new Error('响应回调未注册')
      responseCallback(res)
    },
  }
}

/** 读取最近一次 https.request 的 options（从 mock 调用记录，避免共享状态竞态）。 */
function lastOptions(): Record<string, unknown> {
  const calls = requestMock.mock.calls
  return calls[calls.length - 1][0] as Record<string, unknown>
}

/** 正常成功一次，返回 body。 */
async function succeed(harness: Harness, payload: string, headers: Record<string, string> = {}) {
  const res = new FakeResponse(200, headers)
  harness.respond(res)
  res.emit('data', Buffer.from(payload, 'utf8'))
  res.emit('end')
  return harness.promise
}

beforeEach(() => {
  requestMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('upstreamRequest · 地址钉定', () => {
  it('连接使用钉定 IP，而非重新解析主机名', async () => {
    const h = start()
    await succeed(h, '{"ok":true}')

    const opts = lastOptions()
    const lookup = opts.lookup as (
      host: string,
      o: unknown,
      cb: (e: null, a: string, f: number) => void,
    ) => void
    expect(typeof lookup).toBe('function')

    const seen: Array<{ address: string; family: number }> = []
    lookup('api.example.com', {}, (_e, address, family) => {
      seen.push({ address, family })
    })
    expect(seen).toEqual([{ address: '93.184.216.34', family: 4 }])
  })

  it('lookup 支持 all:true 形式并仍只返回钉定地址', async () => {
    const h = start()
    await succeed(h, '{"ok":true}')

    const opts = lastOptions()
    const lookup = opts.lookup as (
      host: string,
      o: unknown,
      cb: (e: null, a: Array<{ address: string; family: number }>) => void,
    ) => void

    let result: Array<{ address: string; family: number }> = []
    lookup('api.example.com', { all: true }, (_e, addrs) => {
      result = addrs
    })
    expect(result).toEqual([{ address: '93.184.216.34', family: 4 }])
  })

  it('TLS SNI 使用原始域名（证书校验不被钉定破坏）', async () => {
    const h = start()
    await succeed(h, '{"ok":true}')
    expect(lastOptions().servername).toBe('api.example.com')
    expect(lastOptions().host).toBe('api.example.com')
  })

  it('IP 字面量目标不设置 servername（SNI 不允许 IP）', async () => {
    const h = start('{"a":1}', { ...TARGET, isIpLiteral: true, hostname: '93.184.216.34' })
    await succeed(h, '{"ok":true}')
    expect(lastOptions().servername).toBeUndefined()
  })

  it('不复用 socket（agent:false），避免跨请求连接复用绕过钉定', async () => {
    const h = start()
    await succeed(h, '{"ok":true}')
    expect(lastOptions().agent).toBe(false)
  })
})

describe('upstreamRequest · 路径与请求头', () => {
  it('保留 Base URL 路径前缀（/v1 不被丢弃）', async () => {
    const h = start('{"a":1}', TARGET, '/chat/completions')
    await succeed(h, '{"ok":true}')
    expect(lastOptions().path).toBe('/v1/chat/completions')
  })

  it('空前缀时路径不带多余斜杠', async () => {
    const h = start('{"a":1}', { ...TARGET, pathPrefix: '' }, '/messages')
    await succeed(h, '{"ok":true}')
    expect(lastOptions().path).toBe('/messages')
  })

  it('显式请求 identity 编码', async () => {
    const h = start()
    await succeed(h, '{"ok":true}')
    const headers = lastOptions().headers as Record<string, string>
    expect(headers['Accept-Encoding']).toBe('identity')
  })

  it('Content-Length 按字节数而非字符数计算（多字节安全）', async () => {
    const body = '{"t":"中文"}'
    const h = start(body)
    await succeed(h, '{"ok":true}')
    const headers = lastOptions().headers as Record<string, string>
    expect(headers['Content-Length']).toBe(String(Buffer.byteLength(body, 'utf8')))
    expect(Number(headers['Content-Length'])).toBeGreaterThan(body.length)
  })

  it('方法固定为 POST', async () => {
    const h = start()
    await succeed(h, '{"ok":true}')
    expect(lastOptions().method).toBe('POST')
  })

  it('调用方请求头被透传（凭据头）', async () => {
    const h = start('{"a":1}', TARGET, '/messages', { 'x-api-key': 'secret-key' })
    await succeed(h, '{"ok":true}')
    const headers = lastOptions().headers as Record<string, string>
    expect(headers['x-api-key']).toBe('secret-key')
  })
})

describe('upstreamRequest · 请求体上限', () => {
  it('请求体超过 1 MB 直接拒绝且不发起连接', async () => {
    const huge = JSON.stringify({ p: 'x'.repeat(1_100_000) })
    const result = (await upstreamRequest(TARGET, '/chat/completions', {}, huge)) as {
      ok: boolean
      errorCode: string
    }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('INVALID_REQUEST')
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('恰好在上限内的请求体正常发出', async () => {
    const body = JSON.stringify({ p: 'x'.repeat(1000) })
    const h = start(body)
    const result = (await succeed(h, '{"ok":true}')) as { ok: boolean }
    expect(result.ok).toBe(true)
    expect(requestMock).toHaveBeenCalledTimes(1)
  })
})

describe('upstreamRequest · 响应上限', () => {
  it('声明的 Content-Length 超过 1 MB 立即拒绝', async () => {
    const h = start()
    const res = new FakeResponse(200, { 'content-length': String(2_000_000) })
    h.respond(res)
    const result = (await h.promise) as { ok: boolean; errorCode: string }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('UPSTREAM_BAD_RESPONSE')
  })

  it('分块累计超过 1 MB 时中断并拒绝', async () => {
    const h = start()
    const res = new FakeResponse(200)
    h.respond(res)
    const chunk = Buffer.alloc(300_000, 0x61)
    for (let i = 0; i < 5; i += 1) res.emit('data', chunk)
    const result = (await h.promise) as { ok: boolean; errorCode: string }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('UPSTREAM_BAD_RESPONSE')
    expect(h.req.destroyed).toBe(true)
  })

  it('超量响应不把已读分块作为成功结果返回', async () => {
    const h = start()
    const res = new FakeResponse(200)
    h.respond(res)
    res.emit('data', Buffer.alloc(600_000, 0x61))
    res.emit('data', Buffer.alloc(600_000, 0x62))
    res.emit('end')
    const result = (await h.promise) as { ok: boolean; body?: string }
    expect(result.ok).toBe(false)
    expect(result.body).toBeUndefined()
  })
})

describe('upstreamRequest · 内容编码', () => {
  for (const encoding of ['gzip', 'br', 'deflate', 'zstd']) {
    it(`拒绝 Content-Encoding: ${encoding}`, async () => {
      const h = start()
      const res = new FakeResponse(200, { 'content-encoding': encoding })
      h.respond(res)
      const result = (await h.promise) as { ok: boolean; errorCode: string }
      expect(result.ok).toBe(false)
      expect(result.errorCode).toBe('UPSTREAM_BAD_RESPONSE')
    })
  }

  it('接受 Content-Encoding: identity', async () => {
    const h = start()
    const result = (await succeed(h, '{"ok":true}', { 'content-encoding': 'identity' })) as {
      ok: boolean
    }
    expect(result.ok).toBe(true)
  })

  it('缺省 Content-Encoding 视为 identity', async () => {
    const h = start()
    const result = (await succeed(h, '{"ok":true}')) as { ok: boolean }
    expect(result.ok).toBe(true)
  })
})

describe('upstreamRequest · 截止时间', () => {
  it('25 秒截止时间触发 UPSTREAM_TIMEOUT 并销毁请求', async () => {
    vi.useFakeTimers()
    const h = start()
    // 上游从不响应
    await vi.advanceTimersByTimeAsync(25_000)
    const result = (await h.promise) as { ok: boolean; errorCode: string }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('UPSTREAM_TIMEOUT')
    expect(h.req.destroyed).toBe(true)
  })

  it('截止时间之前不误触发超时', async () => {
    vi.useFakeTimers()
    const h = start()
    await vi.advanceTimersByTimeAsync(24_000)
    const res = new FakeResponse(200)
    h.respond(res)
    res.emit('data', Buffer.from('{"ok":true}', 'utf8'))
    res.emit('end')
    const result = (await h.promise) as { ok: boolean }
    expect(result.ok).toBe(true)
  })

  it('socket timeout 事件同样映射为 UPSTREAM_TIMEOUT', async () => {
    const h = start()
    h.req.emit('timeout')
    const result = (await h.promise) as { ok: boolean; errorCode: string }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('UPSTREAM_TIMEOUT')
  })

  it('成功后再触发超时不改变已结算结果', async () => {
    vi.useFakeTimers()
    const h = start()
    const res = new FakeResponse(200)
    h.respond(res)
    res.emit('data', Buffer.from('{"ok":true}', 'utf8'))
    res.emit('end')
    const first = (await h.promise) as { ok: boolean; body: string }
    await vi.advanceTimersByTimeAsync(30_000)
    const second = (await h.promise) as { ok: boolean; body: string }
    expect(first).toEqual(second)
    expect(second.ok).toBe(true)
  })
})

describe('upstreamRequest · 不跟随重定向', () => {
  for (const status of [301, 302, 303, 307, 308]) {
    it(`${status} 不跟随 Location，映射为 INVALID_UPSTREAM_URL`, async () => {
      const h = start()
      const res = new FakeResponse(status, { location: 'https://evil.example.com/steal' })
      h.respond(res)
      res.emit('end')
      const result = (await h.promise) as { ok: boolean; errorCode: string }
      expect(result.ok).toBe(false)
      expect(result.errorCode).toBe('INVALID_UPSTREAM_URL')
      // 只发起过一次连接，没有二次请求
      expect(requestMock).toHaveBeenCalledTimes(1)
    })
  }

  it('重定向不把 Location 或响应正文回传', async () => {
    const h = start()
    const res = new FakeResponse(302, { location: 'https://evil.example.com/steal' })
    h.respond(res)
    res.emit('data', Buffer.from('secret-body', 'utf8'))
    res.emit('end')
    const result = (await h.promise) as { ok: boolean; body?: string }
    expect(result.body).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain('evil.example.com')
    expect(JSON.stringify(result)).not.toContain('secret-body')
  })
})

describe('upstreamRequest · 状态码映射', () => {
  const cases: Array<[number, string]> = [
    [401, 'UPSTREAM_AUTH'],
    [403, 'UPSTREAM_AUTH'],
    [429, 'UPSTREAM_RATE_LIMIT'],
    [400, 'UPSTREAM_BAD_RESPONSE'],
    [404, 'UPSTREAM_BAD_RESPONSE'],
    [422, 'UPSTREAM_BAD_RESPONSE'],
    [500, 'UPSTREAM_UNAVAILABLE'],
    [502, 'UPSTREAM_UNAVAILABLE'],
    [503, 'UPSTREAM_UNAVAILABLE'],
  ]

  for (const [status, code] of cases) {
    it(`${status} → ${code}`, async () => {
      const h = start()
      const res = new FakeResponse(status)
      h.respond(res)
      res.emit('end')
      const result = (await h.promise) as { ok: boolean; errorCode: string }
      expect(result.ok).toBe(false)
      expect(result.errorCode).toBe(code)
    })
  }

  it('缺失 statusCode 视为不可用', async () => {
    const h = start()
    const res = new FakeResponse(0)
    h.respond(res)
    res.emit('end')
    const result = (await h.promise) as { ok: boolean; errorCode: string }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('UPSTREAM_UNAVAILABLE')
  })

  it('200 返回正文原样', async () => {
    const h = start()
    const result = (await succeed(h, '{"text":"你好"}')) as {
      ok: boolean
      status: number
      body: string
    }
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.body).toBe('{"text":"你好"}')
  })
})

describe('upstreamRequest · 网络错误', () => {
  it('请求 error 映射为 UPSTREAM_UNAVAILABLE', async () => {
    const h = start()
    h.req.emit('error', new Error('ECONNREFUSED 93.184.216.34:443'))
    const result = (await h.promise) as { ok: boolean; errorCode: string }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('UPSTREAM_UNAVAILABLE')
  })

  it('响应流 error 映射为 UPSTREAM_UNAVAILABLE', async () => {
    const h = start()
    const res = new FakeResponse(200)
    h.respond(res)
    res.emit('error', new Error('stream reset'))
    const result = (await h.promise) as { ok: boolean; errorCode: string }
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('UPSTREAM_UNAVAILABLE')
  })

  it('错误结果不泄漏 IP、主机名或底层错误信息', async () => {
    const h = start('{"a":1}', TARGET, '/messages', { 'x-api-key': 'secret-key' })
    h.req.emit('error', new Error('ECONNREFUSED 93.184.216.34:443'))
    const result = await h.promise
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('93.184.216.34')
    expect(serialized).not.toContain('api.example.com')
    expect(serialized).not.toContain('secret-key')
    expect(serialized).not.toContain('ECONNREFUSED')
  })

  it('不重试：一次失败只发起过一次连接', async () => {
    const h = start()
    h.req.emit('error', new Error('boom'))
    await h.promise
    expect(requestMock).toHaveBeenCalledTimes(1)
  })
})
