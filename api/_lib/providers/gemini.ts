import type { NormalizedResponse } from '../contracts'
import { upstreamRequest } from '../upstream'

const MODEL_ID_RE = /^[A-Za-z0-9._:/-]{1,128}$/

export async function callGemini(
  origin: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens: number,
): Promise<NormalizedResponse> {
  if (!MODEL_ID_RE.test(model)) {
    throw Object.assign(new Error('INVALID_REQUEST'), { code: 'INVALID_REQUEST' })
  }

  const encodedModel = encodeURIComponent(model)
  const path = `/models/${encodedModel}:generateContent`

  // Gemini: 将 system prompt 作为第一个 user message 的补充
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const requestBody = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  })

  const result = await upstreamRequest(origin, path, {
    'x-goog-api-key': apiKey,
  }, requestBody)

  if (!result.ok) return mapError(result)

  try {
    const json = JSON.parse(result.body)
    const candidate = json.candidates?.[0]
    const text = candidate?.content?.parts?.[0]?.text
    if (typeof text !== 'string' || !text.trim()) {
      return { text: '', finishReason: 'unknown', usage: { inputTokens: null, outputTokens: null } }
    }
    return {
      text,
      finishReason: mapFinishReason(candidate?.finishReason),
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount ?? null,
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? null,
      },
    }
  } catch {
    return { text: '', finishReason: 'unknown', usage: { inputTokens: null, outputTokens: null } }
  }
}

function mapFinishReason(raw: string | undefined): NormalizedResponse['finishReason'] {
  switch (raw) {
    case 'STOP': return 'stop'
    case 'MAX_TOKENS': return 'length'
    case 'SAFETY': return 'blocked'
    default: return 'unknown'
  }
}

function mapError(result: { errorCode: string }): NormalizedResponse {
  throw Object.assign(new Error(result.errorCode), { code: result.errorCode })
}
