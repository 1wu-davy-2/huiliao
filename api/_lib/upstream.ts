/**
 * 有界 HTTPS 请求辅助函数。
 *
 * - 25 秒截止时间（DNS + TCP + TLS + 上载 + 响应）
 * - 请求/响应 1 MB 限制
 * - 禁止重定向
 * - 禁止重用 socket
 * - 超时/异常返回标准化错误
 */

import https from 'node:https'
import type { RequestOptions } from 'node:https'

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
  origin: string,
  path: string,
  headers: Record<string, string>,
  body: string,
): Promise<UpstreamResult | UpstreamError> {
  const url = new URL(path, origin)
  const isHttps = url.protocol === 'https:'

  const options: RequestOptions = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    },
    agent: false,
    timeout: DEADLINE_MS,
  }

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []
      let total = 0

      res.on('data', (chunk: Buffer) => {
        total += chunk.length
        if (total > MAX_BYTES) {
          req.destroy()
          resolve({ ok: false, errorCode: 'UPSTREAM_BAD_RESPONSE', status: res.statusCode ?? 0 })
          return
        }
        chunks.push(chunk)
      })

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        // 3xx 重定向拒绝
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          resolve({ ok: false, errorCode: 'INVALID_UPSTREAM_URL', status: res.statusCode })
          return
        }
        if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({ ok: false, errorCode: 'UPSTREAM_AUTH', status: res.statusCode })
          return
        }
        if (res.statusCode === 429) {
          resolve({ ok: false, errorCode: 'UPSTREAM_RATE_LIMIT', status: res.statusCode })
          return
        }
        if (!res.statusCode || res.statusCode >= 500) {
          resolve({ ok: false, errorCode: 'UPSTREAM_UNAVAILABLE', status: res.statusCode ?? 0 })
          return
        }
        if (res.statusCode && res.statusCode >= 400) {
          resolve({ ok: false, errorCode: 'UPSTREAM_BAD_RESPONSE', status: res.statusCode })
          return
        }
        resolve({ ok: true, status: res.statusCode ?? 200, body })
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, errorCode: 'UPSTREAM_TIMEOUT' })
    })

    req.on('error', () => {
      resolve({ ok: false, errorCode: 'UPSTREAM_UNAVAILABLE' })
    })

    req.write(body)
    req.end()
  })
}
