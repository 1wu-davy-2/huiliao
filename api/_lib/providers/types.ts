import type { PinnedTarget } from '../urlPolicy'

export interface ProviderCall {
  /** 已通过 URL 策略校验并钉定公网地址的目标。 */
  target: PinnedTarget
  apiKey: string
  model: string
  /** 服务端拥有的系统提示词，调用方不可传入。 */
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens: number
  /** 官方 OpenAI 预设使用 max_completion_tokens，其余兼容网关使用 max_tokens。 */
  isOfficialOpenAiPreset?: boolean
}
