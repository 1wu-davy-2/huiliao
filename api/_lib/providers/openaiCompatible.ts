import type { NormalizedResponse } from '../contracts'
import { upstreamRequest } from '../upstream'

interface OpenAiMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callOpenAiCompatible(
  origin: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens: number,
): Promise<NormalizedResponse> {
  const body: Array<OpenAiMessage | { role: 'system'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const requestBody = JSON.stringify({
    model,
    messages: body,
    max_completion_tokens: maxTokens,
    temperature: 0.7,
  })

  const result = await upstreamRequest(origin, '/chat/completions', {
    'Authorization': `Bearer ${apiKey}`,
  }, requestBody)

  if (!result.ok) return mapError(result)

  try {
    const json = JSON.parse(result.body)
    const choice = json.choices?.[0]
    const text = choice?.message?.content
    if (typeof text !== 'string' || !text.trim()) {
      return { text: '', finishReason: 'unknown', usage: { inputTokens: null, outputTokens: null } }
    }
    return {
      text,
      finishReason: mapFinishReason(choice?.finish_reason),
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? null,
        outputTokens: json.usage?.completion_tokens ?? null,
      },
    }
  } catch {
    return { text: '', finishReason: 'unknown', usage: { inputTokens: null, outputTokens: null } }
  }
}

function mapFinishReason(raw: string | undefined): NormalizedResponse['finishReason'] {
  switch (raw) {
    case 'stop': return 'stop'
    case 'length': return 'length'
    case 'content_filter': return 'blocked'
    default: return 'unknown'
  }
}

function mapError(result: { errorCode: string }): NormalizedResponse {
  throw Object.assign(new Error(result.errorCode), { code: result.errorCode })
}
