/**
 * 公网 HTTPS URL 策略。
 *
 * 不实现通用 HTTP 代理。仅允许：
 * - HTTPS scheme
 * - 无 URL credentials / query / fragment
 * - 主机名或公网 IP
 * - 拒绝私有/环回/链路本地/多播/保留地址段
 */

const BLOCKED_HOSTNAME = /^(localhost|.*\.local)$/i
const ALLOWED_SCHEME = 'https:'

/** RFC 6890 / RFC 1918 / RFC 6598 / RFC 4291 / RFC 3849 — 拒绝的 IP 范围 */
const PRIVATE_RANGES = [
  /^127\./,                    // loopback
  /^10\./,                     // private A
  /^172\.(1[6-9]|2\d|3[01])\./,// private B
  /^192\.168\./,               // private C
  /^169\.254\./,               // link-local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  /^0\./,                      // unspecified/current network
  /^2(2[4-9]|3\d)\./,         // multicast
  /^2(4[0-9]|5[0-5])\./,      // reserved / documentation
  /^fc00:/i, /^fd00:/i,        // unique local
  /^fe80:/i,                   // link-local v6
  /^ff00:/i,                   // multicast v6
  /^::1$/i,                    // loopback v6
  /^::$/i,                     // unspecified v6
  /^2001:db8:/i,               // documentation v6
  /^2002:/i,                   // 6to4
  /^2001:0:/i,                 // Teredo
  /^64:ff9b:/i,                // NAT64 well-known prefix
]

export interface UrlPolicyResult {
  ok: true
  hostname: string
  origin: string
}

export interface UrlPolicyError {
  ok: false
  error: string
}

export function validateBaseUrl(raw: string): UrlPolicyResult | UrlPolicyError {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, error: '无效的 URL 格式' }
  }

  if (url.protocol !== ALLOWED_SCHEME) {
    return { ok: false, error: '仅支持 HTTPS' }
  }
  if (url.username || url.password) {
    return { ok: false, error: 'URL 中不允许包含凭证' }
  }
  if (url.search || url.hash) {
    return { ok: false, error: 'URL 中不允许包含查询参数或片段' }
  }

  const hostname = url.hostname.toLowerCase()

  if (BLOCKED_HOSTNAME.test(hostname)) {
    return { ok: false, error: '不允许的主机名' }
  }

  // 非逐标签主机名
  if (!hostname.includes('.') && hostname !== 'localhost') {
    return { ok: false, error: '不允许单标签主机名' }
  }

  // IP 地址范围检查
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) {
    // IPv4 或 IPv6 字面量
    for (const pattern of PRIVATE_RANGES) {
      if (pattern.test(hostname)) {
        return { ok: false, error: '不允许的 IP 地址范围' }
      }
    }
  }

  const origin = `${url.protocol}//${hostname}${url.port ? ':' + url.port : ''}`
  const pathPrefix = url.pathname.replace(/\/+$/, '')

  return {
    ok: true,
    hostname: url.hostname.toLowerCase(),
    origin: pathPrefix ? `${origin}${pathPrefix}` : origin,
  }
}
