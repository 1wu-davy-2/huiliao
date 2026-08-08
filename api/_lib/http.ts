/**
 * 函数层请求控制：方法、Origin、正文大小、统一 JSON 响应头。
 *
 * 同源检查是浏览器侧控制，不是身份认证。公网滥用必须依赖 Vercel WAF / 速率限制。
 * 检查顺序固定为「方法 → Origin → 正文大小」，使诊断用 GET 仍能拿到 JSON 405。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MAX_BODY_BYTES, PRESET_BASE_URLS, type ApiErrorCode } from './contracts'
import { resolveAndPin, type PinnedOk, type UrlPolicyError } from './urlPolicy'

export function setJsonHeaders(res: VercelResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  // 响应随 Origin 变化，但不发放任何 CORS 授权
  res.setHeader('Vary', 'Origin')
}

export function jsonError(
  res: VercelResponse,
  status: number,
  code: ApiErrorCode | 'METHOD_NOT_ALLOWED' | 'FORBIDDEN_ORIGIN',
): void {
  res.status(status).json({ error: code })
}

function stripScheme(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
}

/** 本部署自身的主机名集合，供 URL 策略拒绝自递归调用。 */
export function selfHosts(req: VercelRequest): Array<string | undefined> {
  const host = typeof req.headers.host === 'string' ? req.headers.host : undefined
  return [
    host,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
  ]
}

/** 精确匹配的 Origin 白名单：本地开发端口 + 本部署的各个已知域名。 */
export function allowedOrigins(req: VercelRequest): string[] {
  const origins = new Set<string>([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ])
  for (const value of selfHosts(req)) {
    if (value) origins.add(`https://${stripScheme(value)}`)
  }
  return [...origins]
}

/**
 * 浏览器 POST 必须带精确匹配的 Origin。
 * 缺失、null、兄弟域、子域与前缀混淆一律拒绝（Set 精确比较，不做 startsWith）。
 */
export function originAllowed(req: VercelRequest): boolean {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || !origin) return false
  return allowedOrigins(req).includes(origin)
}

/** 支持 Fetch Metadata 的浏览器额外要求 same-origin；不支持的浏览器不因此被拒。 */
export function fetchSiteAllowed(req: VercelRequest): boolean {
  const site = req.headers['sec-fetch-site']
  if (typeof site !== 'string' || !site) return true
  return site === 'same-origin'
}

export function bodyTooLarge(req: VercelRequest): boolean {
  const declared = Number(req.headers['content-length'])
  return Number.isFinite(declared) && declared > MAX_BODY_BYTES
}

/**
 * 解析上游目标：预设读服务端常量，自定义地址走完整 URL 策略。
 * 两条路径都会 DNS 解析并钉定公网地址。
 */
export function resolveTarget(
  target: { kind: 'preset'; presetId: keyof typeof PRESET_BASE_URLS } | { kind: 'custom'; baseUrl: string },
  req: VercelRequest,
): Promise<PinnedOk | UrlPolicyError> {
  const raw = target.kind === 'preset' ? PRESET_BASE_URLS[target.presetId] : target.baseUrl
  return resolveAndPin(raw, { selfHosts: selfHosts(req) })
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNSUPPORTED_PROTOCOL: 400,
  UNKNOWN_CHALLENGE: 400,
  INVALID_UPSTREAM_URL: 400,
  UPSTREAM_AUTH: 502,
  UPSTREAM_RATE_LIMIT: 502,
  UPSTREAM_TIMEOUT: 504,
  UPSTREAM_BAD_RESPONSE: 502,
  UPSTREAM_SECRET_ECHO: 502,
  UPSTREAM_UNAVAILABLE: 502,
}

export function statusForCode(code: ApiErrorCode | null): { status: number; code: ApiErrorCode } {
  if (code && code in STATUS_BY_CODE) return { status: STATUS_BY_CODE[code], code }
  return { status: 502, code: 'UPSTREAM_UNAVAILABLE' }
}
