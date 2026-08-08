/**
 * 有界 HTTPS 请求辅助函数。
 *
 * - 连接到 urlPolicy 钉定的 IP，不再重新查 DNS（防 DNS rebinding）
 * - TLS SNI / 证书校验仍使用原始主机名
 * - 单一 25 秒截止时间覆盖 DNS 之后的 TCP + TLS + 上载 + 响应
 * - 请求与响应各限 1 MB
 * - 不跟随重定向、不重试、不复用 socket
 * - 仅请求 identity 编码，遇到其他 Content-Encoding 直接拒绝
 * - 不记录 URL、头、正文、API Key、提示词或响应文本
 */

import https from 'node:https'
import type { RequestOptions } from 'node:https'
import { joinPath, type PinnedTarget } from './urlPolicy'

export interface UpstreamResult {
  ok: true
  status: number
  body: string
}

export interface UpstreamError {
  ok: false
  errorCode: string
  status?: number
}

const DEADLINE_MS = 25_000
const MAX_BYTES = 1_048_576 // 1 MB

export function upstreamRequest(
  target: PinnedTarget,
  adapterPath: string,
  headers: Record<string, string>,
  body: string,
): Promise<UpstreamResult | UpstreamError> {
  const payload = Buffer.from(body, 'utf8')
  if (payload.byteLength > MAX_BYTES) {
    return Promise.resolve({ ok: false, errorCode: 'INVALID_REQUEST' })
  }

  const options: RequestOptions = {
    host: target.hostname,
    port: target.port,
    path: joinPath(target.pathPrefix, adapterPath),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'identity',
      'Content-Length': String(payload.byteLength),
      ...headers,
    },
    agent: false,
    // 连接钉定到已校验的公网地址；忽略 Node 自己的 DNS
    lookup: (_hostname, opts, callback) => {
      const family = target.family
      if (typeof opts === 'function') {
        return (opts as (e: null, a: string, f: number) => void)(null, target.pinnedAddress, family)
      }
      if (opts && (opts as { all?: boolean }).all) {
        return (callback as unknown as (
          e: null,
          a: Array<{ address: string; family: number }>,
        ) => void)(null, [{ address: target.pinnedAddress, family }])
      }
      return callback(null, target.pinnedAddress, family)
    },
    // IP 字面量不能作为 SNI，仅对域名设置
    servername: target.isIpLiteral ? undefined : target.hostname,
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (result: UpstreamResult | UpstreamError) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      req.destroy()
      resolve(result)
    }

    const req = https.request(options, (res) => {
      const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase()
      if (encoding && encoding !== 'identity') {
        return finish({ ok: false, errorCode: 'UPSTREAM_BAD_RESPONSE', status: res.statusCode ?? 0 })
      }

      const declared = Number(res.headers['content-length'])
      if (Number.isFinite(declared) && declared > MAX_BYTES) {
        return finish({ ok: false, errorCode: 'UPSTREAM_BAD_RESPONSE', status: res.statusCode ?? 0 })
      }

      const chunks: Buffer[] = []
      let total = 0

      res.on('data', (chunk: Buffer) => {
        total += chunk.length
        if (total > MAX_BYTES) {
          return finish({
            ok: false,
            errorCode: 'UPSTREAM_BAD_RESPONSE',
            status: res.statusCode ?? 0,
          })
        }
        chunks.push(chunk)
      })

      res.on('end', () => {
        const status = res.statusCode ?? 0
        // 不跟随 Location，任何 3xx 视为目标地址不可用
        if (status >= 300 && status < 400) {
          return finish({ ok: false, errorCode: 'INVALID_UPSTREAM_URL', status })
        }
        if (status === 401 || status === 403) {
          return finish({ ok: false, errorCode: 'UPSTREAM_AUTH', status })
        }
        if (status === 429) {
          return finish({ ok: false, errorCode: 'UPSTREAM_RATE_LIMIT', status })
        }
        if (!status || status >= 500) {
          return finish({ ok: false, errorCode: 'UPSTREAM_UNAVAILABLE', status })
        }
        if (status >= 400) {
          return finish({ ok: false, errorCode: 'UPSTREAM_BAD_RESPONSE', status })
        }
        return finish({ ok: true, status, body: Buffer.concat(chunks).toString('utf8') })
      })

      res.on('error', () => finish({ ok: false, errorCode: 'UPSTREAM_UNAVAILABLE' }))
    })

    const deadline = setTimeout(() => {
      finish({ ok: false, errorCode: 'UPSTREAM_TIMEOUT' })
    }, DEADLINE_MS)

    req.on('timeout', () => finish({ ok: false, errorCode: 'UPSTREAM_TIMEOUT' }))
    req.on('error', () => finish({ ok: false, errorCode: 'UPSTREAM_UNAVAILABLE' }))

    req.setTimeout(DEADLINE_MS)
    req.end(payload)
  })
}
