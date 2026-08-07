import type { NormalizedResponse, ApiErrorCode } from '../contracts'
import { callAnthropic } from './anthropic'
import { callGemini } from './gemini'
import { callOpenAiCompatible } from './openaiCompatible'

export interface ProviderRequest {
  protocol: 'openai-compatible' | 'anthropic' | 'gemini'
  origin: string
  apiKey: string
  model: string
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens: number
}

export async function dispatchProvider(req: ProviderRequest): Promise<NormalizedResponse> {
  switch (req.protocol) {
    case 'openai-compatible':
      return callOpenAiCompatible(req.origin, req.apiKey, req.model, req.systemPrompt, req.messages, req.maxTokens)
    case 'anthropic':
      return callAnthropic(req.origin, req.apiKey, req.model, req.systemPrompt, req.messages, req.maxTokens)
    case 'gemini':
      return callGemini(req.origin, req.apiKey, req.model, req.systemPrompt, req.messages, req.maxTokens)
    default:
      throw Object.assign(new Error('不支持的协议'), { code: 'UNSUPPORTED_PROTOCOL' as ApiErrorCode })
  }
}

export { callAnthropic, callGemini, callOpenAiCompatible }
