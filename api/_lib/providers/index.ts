import type { ApiProtocol } from '../../../src/types'
import type { NormalizedResponse } from '../contracts'
import { fail } from '../errors'
import { callAnthropic } from './anthropic'
import { callGemini } from './gemini'
import { callOpenAiCompatible } from './openaiCompatible'
import type { ProviderCall } from './types'

export type { ProviderCall }

export interface DispatchCall extends ProviderCall {
  protocol: ApiProtocol
}

/**
 * 协议分发 + 凭据回显防护。
 *
 * 上游若把请求中的完整凭据回显进正文，一律丢弃该响应，不返回给浏览器。
 */
export async function dispatchProvider(call: DispatchCall): Promise<NormalizedResponse> {
  const result = await invoke(call)

  if (call.apiKey && result.text.includes(call.apiKey)) {
    fail('UPSTREAM_SECRET_ECHO')
  }

  return result
}

function invoke(call: DispatchCall): Promise<NormalizedResponse> {
  switch (call.protocol) {
    case 'openai-compatible':
      return callOpenAiCompatible(call)
    case 'anthropic':
      return callAnthropic(call)
    case 'gemini':
      return callGemini(call)
    default:
      return fail('UNSUPPORTED_PROTOCOL')
  }
}

export { callAnthropic, callGemini, callOpenAiCompatible }
