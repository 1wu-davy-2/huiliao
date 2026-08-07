import type { NormalizedResponse } from '../contracts'
import { upstreamRequest } from '../upstream'

export async function callAnthropic(
  origin: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens: number,
): Promise<NormalizedResponse> {
  const requestBody = JSON.stringify({
    model,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: maxTokens,
  })

  const result = await upstreamRequest(origin, '/messages', {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }, requestBody)

  if (!result.ok) return mapError(result)

  try {
    const json = JSON.parse(result.body)
    const text = json.content?.find?.((b: { type: string }) => b.type === 'text')?.text
    if (typeof text !== 'string' || !text.trim()) {
      return { text: '', finishReason: 'unknown', usage: { inputTokens: null, outputTokens: null } }
    }
    return {
      text,
      finishReason: mapStopReason(json.stop_reason),
      usage: {
        inputTokens: json.usage?.input_tokens ?? null,
        outputTokens: json.usage?.output_tokens ?? null,
      },
    }
  } catch {
    return { text: '', finishReason: 'unknown', usage: { inputTokens: null, outputTokens: null } }
  }
}

function mapStopReason(raw: string | undefined): NormalizedResponse['finishReason'] {
  switch (raw) {
    case 'end_turn': return 'stop'
    case 'max_tokens': return 'length'
    case 'stop_sequence': return 'stop'
    default: return 'unknown'
  }
}

function mapError(result: { errorCode: string }): NormalizedResponse {
  throw Object.assign(new Error(result.errorCode), { code: result.errorCode })
}
