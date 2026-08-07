/**
 * Gemini generateContent 适配器。
 * 线格式参考：https://ai.google.dev/api/generate-content
 *
 * 凭据只走 x-goog-api-key 头，绝不放进查询字符串。
 */

import { z } from 'zod'
import type { NormalizedResponse } from '../contracts'
import { upstreamRequest } from '../upstream'
import { assertText, fail, parseJsonOnce } from '../errors'
import type { ProviderCall } from './types'

const MODEL_ID_RE = /^[A-Za-z0-9._:/-]{1,128}$/
const usageInt = z.number().int().nonnegative().nullish()

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({ parts: z.array(z.object({ text: z.string().nullish() })).nullish() })
          .nullish(),
        finishReason: z.string().nullish(),
      }),
    )
    .nullish(),
  promptFeedback: z.object({ blockReason: z.string().nullish() }).nullish(),
  usageMetadata: z
    .object({ promptTokenCount: usageInt, candidatesTokenCount: usageInt })
    .nullish(),
})

export function geminiPath(model: string): string {
  return `/models/${encodeURIComponent(model)}:generateContent`
}

export async function callGemini(call: ProviderCall): Promise<NormalizedResponse> {
  if (!MODEL_ID_RE.test(call.model)) fail('INVALID_REQUEST')

  const result = await upstreamRequest(
    call.target,
    geminiPath(call.model),
    { 'x-goog-api-key': call.apiKey },
    JSON.stringify({
      contents: call.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: { parts: [{ text: call.systemPrompt }] },
      generationConfig: { maxOutputTokens: call.maxTokens },
    }),
  )

  if (!result.ok) fail(result.errorCode as never)

  const parsed = responseSchema.safeParse(parseJsonOnce(result.body))
  if (!parsed.success) return fail('UPSTREAM_BAD_RESPONSE')

  const usage = {
    inputTokens: parsed.data.usageMetadata?.promptTokenCount ?? null,
    outputTokens: parsed.data.usageMetadata?.candidatesTokenCount ?? null,
  }

  // 提示词本身被安全策略拦截时不会返回 candidates
  const candidate = parsed.data.candidates?.[0]
  if (!candidate) {
    if (parsed.data.promptFeedback?.blockReason) {
      return { text: '', finishReason: 'blocked', usage }
    }
    return fail('UPSTREAM_BAD_RESPONSE')
  }

  const finishReason = mapFinishReason(candidate.finishReason)
  if (finishReason === 'blocked') {
    return { text: '', finishReason, usage }
  }

  return {
    text: assertText(candidate.content?.parts?.[0]?.text),
    finishReason,
    usage,
  }
}

function mapFinishReason(raw: string | null | undefined): NormalizedResponse['finishReason'] {
  switch (raw) {
    case 'STOP':
      return 'stop'
    case 'MAX_TOKENS':
      return 'length'
    case 'SAFETY':
    case 'BLOCKLIST':
    case 'PROHIBITED_CONTENT':
    case 'SPII':
      return 'blocked'
    default:
      return 'unknown'
  }
}
