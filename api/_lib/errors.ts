import type { ApiErrorCode } from './contracts'

/**
 * 上游/校验失败统一以带 code 的 Error 抛出。
 * 绝不把上游原始响应体、请求头、URL 或凭据放进 message。
 */
export function fail(code: ApiErrorCode): never {
  throw Object.assign(new Error(code), { code })
}

export function errorCodeOf(err: unknown): ApiErrorCode | null {
  const code = (err as { code?: unknown } | null)?.code
  return typeof code === 'string' ? (code as ApiErrorCode) : null
}

/** 响应文本上限：与 trialMessageSchema 的 8000 字符持久化上限一致。 */
export const MAX_RESPONSE_TEXT = 8000

/**
 * 严格 UTF-8 校验的近似：Buffer.toString('utf8') 会把非法序列替换为 U+FFFD，
 * 出现替换字符即视为解码失败。
 */
export function assertDecodable(body: string): void {
  if (body.includes('�')) fail('UPSTREAM_BAD_RESPONSE')
}

export function parseJsonOnce(body: string): unknown {
  assertDecodable(body)
  try {
    return JSON.parse(body)
  } catch {
    return fail('UPSTREAM_BAD_RESPONSE')
  }
}

/** 文本校验：非空（blocked 除外，由调用方处理）且不超过持久化上限。 */
export function assertText(text: unknown): string {
  if (typeof text !== 'string') return fail('UPSTREAM_BAD_RESPONSE')
  const trimmed = text.trim()
  if (!trimmed) return fail('UPSTREAM_BAD_RESPONSE')
  if (trimmed.length > MAX_RESPONSE_TEXT) return fail('UPSTREAM_BAD_RESPONSE')
  return trimmed
}
