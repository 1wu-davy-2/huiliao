/**
 * 公网 HTTPS URL 策略。
 *
 * 这不是通用 HTTP 代理。三段式校验：
 *  1. validateBaseUrlSyntax — 纯语法：HTTPS、无凭证/查询/片段、主机名形态、路径安全
 *  2. classifyAddress       — 地址分类：仅允许公网 unicast，IPv4-mapped IPv6 先归一
 *  3. resolveAndPin         — DNS 解析全部 A/AAAA，任一非公网即整体拒绝，并钉定一个地址
 *
 * upstream.ts 使用钉定地址建立连接，解析与连接之间不再查 DNS（防 DNS rebinding）。
 * 自递归（指向本部署自身）单独拒绝，作为 IP 分类之外的补充。
 *
 * 显式放开的端口：允许用户自管代理指定 HTTPS 端口。这会带来有限的公网端口探测面，
 * 因此生产环境必须为 /api/ai/* 配置 Vercel WAF / 速率限制。
 */

import dns from 'node:dns'
import ipaddr from 'ipaddr.js'

const ALLOWED_SCHEME = 'https:'
const MAX_URL_LENGTH = 2048
const MAX_DNS_RESULTS = 8

/** localhost 与 mDNS/内网名称，即使解析结果公网也拒绝。 */
const BLOCKED_HOSTNAME = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/i

/** 路径中不允许的编码/穿越形态。控制字符另由 hasControlOrWhitespace 检查。 */
const UNSAFE_PATH = /(%2f|%5c|%00|%09|%0a|%0d|\\|(^|\/)\.\.(\/|$))/i

/**
 * 控制字符与空白检测。
 * 用字符码判断而非正则字面量，避免在源码中嵌入不可见控制字符。
 */
function hasControlOrWhitespace(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    // C0 控制字符、空格、DEL、C1 控制字符
    if (code <= 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) return true
  }
  return false
}

export interface UrlSyntaxOk {
  ok: true
  hostname: string
  port: number
  pathPrefix: string
  isIpLiteral: boolean
}

export interface UrlPolicyError {
  ok: false
  error: string
}

export interface PinnedTarget {
  hostname: string
  port: number
  pathPrefix: string
  pinnedAddress: string
  family: 4 | 6
  isIpLiteral: boolean
}

export interface PinnedOk extends PinnedTarget {
  ok: true
}

/** 注入式 DNS，便于测试；默认使用系统解析器。测试不允许访问真实网络。 */
export type LookupAll = (hostname: string) => Promise<Array<{ address: string; family: number }>>

export interface ResolveDeps {
  lookup?: LookupAll
  /** 本部署自身的主机名集合，用于拒绝自递归调用。 */
  selfHosts?: Array<string | undefined>
}

const defaultLookup: LookupAll = async (hostname) =>
  dns.promises.lookup(hostname, { all: true, verbatim: true })

// ─── 1. 语法 ────────────────────────────────────────────────

export function validateBaseUrlSyntax(raw: string): UrlSyntaxOk | UrlPolicyError {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, error: '缺少 Base URL' }
  }
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, error: 'URL 过长' }
  }
  // 在 URL 解析前先看原始串，避免解析器把控制字符静默剥掉
  if (hasControlOrWhitespace(raw)) {
    return { ok: false, error: 'URL 含空白或控制字符' }
  }

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
  if (UNSAFE_PATH.test(url.pathname) || UNSAFE_PATH.test(raw)) {
    return { ok: false, error: '路径包含不安全的编码或穿越序列' }
  }

  // IPv6 字面量在 WHATWG URL 中带方括号
  const bracketed = url.hostname.startsWith('[') && url.hostname.endsWith(']')
  const hostname = (bracketed ? url.hostname.slice(1, -1) : url.hostname).toLowerCase()

  if (!hostname) {
    return { ok: false, error: '缺少主机名' }
  }
  // IPv6 zone id（fe80::1%eth0）
  if (hostname.includes('%')) {
    return { ok: false, error: '主机名不允许包含 zone id' }
  }
  if (hostname.endsWith('.')) {
    return { ok: false, error: '主机名不允许尾随点' }
  }
  if (BLOCKED_HOSTNAME.test(hostname)) {
    return { ok: false, error: '不允许的主机名' }
  }

  const isIpLiteral = bracketed || ipaddr.isValid(hostname)

  // 非 IP 时要求至少两段标签，拒绝单标签内网名
  if (!isIpLiteral && !hostname.includes('.')) {
    return { ok: false, error: '不允许单标签主机名' }
  }

  const port = url.port ? Number(url.port) : 443
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, error: '无效端口' }
  }

  // 保留路径前缀，使 https://proxy.example.com/v1 这类网关可用
  const pathPrefix = url.pathname.replace(/\/+$/, '')

  return { ok: true, hostname, port, pathPrefix, isIpLiteral }
}

// ─── 2. 地址分类 ────────────────────────────────────────────

export interface AddressOk {
  ok: true
  normalized: string
  family: 4 | 6
}

/**
 * 仅接受公网 unicast。
 * ipaddr.js 的 range() 已覆盖 loopback / private / linkLocal（含 169.254.169.254 元数据）/
 * multicast / unspecified / carrierGradeNat / reserved（含 2001:db8::/32、240/4）/
 * uniqueLocal / rfc6052（NAT64 64:ff9b::/96）/ 6to4 / teredo / rfc6145。
 */
export function classifyAddress(raw: string): AddressOk | UrlPolicyError {
  if (!ipaddr.isValid(raw)) {
    return { ok: false, error: '无效的 IP 地址' }
  }
  let addr = ipaddr.parse(raw)

  // IPv4-mapped IPv6（::ffff:127.0.0.1）先归一，否则会被当成 ipv4Mapped 而非 loopback
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address()
    }
  }

  const range = addr.range()
  if (range !== 'unicast') {
    return { ok: false, error: `不允许的地址范围：${range}` }
  }

  return {
    ok: true,
    normalized: addr.toString(),
    family: addr.kind() === 'ipv4' ? 4 : 6,
  }
}

// ─── 3. 解析并钉定 ──────────────────────────────────────────

function normalizeSelfHost(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  const withScheme = trimmed.includes('://') ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '')
  } catch {
    return trimmed.replace(/\.$/, '')
  }
}

export async function resolveAndPin(
  raw: string,
  deps: ResolveDeps = {},
): Promise<PinnedOk | UrlPolicyError> {
  const syntax = validateBaseUrlSyntax(raw)
  if (!syntax.ok) return syntax

  // 自递归：拒绝指向本部署自身，避免递归调用自己的公开 API
  const selfHosts = (deps.selfHosts ?? []).map(normalizeSelfHost).filter((h): h is string => !!h)
  if (selfHosts.includes(syntax.hostname)) {
    return { ok: false, error: '不允许指向本服务自身' }
  }

  // IP 字面量：直接分类，无需 DNS
  if (syntax.isIpLiteral) {
    const classified = classifyAddress(syntax.hostname)
    if (!classified.ok) return classified
    return {
      ok: true,
      hostname: syntax.hostname,
      port: syntax.port,
      pathPrefix: syntax.pathPrefix,
      pinnedAddress: classified.normalized,
      family: classified.family,
      isIpLiteral: true,
    }
  }

  let records: Array<{ address: string; family: number }>
  try {
    records = await (deps.lookup ?? defaultLookup)(syntax.hostname)
  } catch {
    return { ok: false, error: '主机名无法解析' }
  }

  if (!Array.isArray(records) || records.length === 0) {
    return { ok: false, error: '主机名无法解析' }
  }

  const unique = [...new Set(records.map((r) => r.address))]
  if (unique.length > MAX_DNS_RESULTS) {
    return { ok: false, error: '解析结果过多' }
  }

  // 整组校验：任一地址非公网 unicast，整个主机拒绝
  const classified: AddressOk[] = []
  for (const address of unique) {
    const result = classifyAddress(address)
    if (!result.ok) return result
    classified.push(result)
  }

  const chosen = classified[0]
  return {
    ok: true,
    hostname: syntax.hostname,
    port: syntax.port,
    pathPrefix: syntax.pathPrefix,
    pinnedAddress: chosen.normalized,
    family: chosen.family,
    isIpLiteral: false,
  }
}

// ─── 路径拼接 ───────────────────────────────────────────────

/**
 * 把 Base URL 的路径前缀与适配器路径拼接。
 * new URL('/chat/completions', 'https://host/v1') 会丢掉 /v1，因此必须显式拼接。
 */
export function joinPath(pathPrefix: string, adapterPath: string): string {
  const prefix = pathPrefix.replace(/\/+$/, '')
  const suffix = adapterPath.startsWith('/') ? adapterPath : `/${adapterPath}`
  return `${prefix}${suffix}`.replace(/\/{2,}/g, '/')
}
