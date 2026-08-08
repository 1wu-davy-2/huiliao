/**
 * OpenAI Chat Completions 适配器。
 * 线格式参考：https://developers.openai.com/api/reference/resources/chat
 *
 * 不启用 tools、streaming、response 持久化或任意透传字段。
 */

import { z } from 'zod'
import type { NormalizedResponse } from '../contracts'
import { upstreamRequest } from '../upstream'
import { assertText, fail, parseJsonOnce } from '../errors'
import type { ProviderCall } from './types'

const usageInt = z.number().int().nonnegative().nullish()

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullish() }),
        finish_reason: z.string().nullish(),
      }),
    )
    .min(1),
  usage: z
    .object({ prompt_tokens: usageInt, completion_tokens: usageInt })
    .nullish(),
})

export const OPENAI_PATH = '/chat/completions'

export async function callOpenAiCompatible(call: ProviderCall): Promise<NormalizedResponse> {
  const messages = [
    { role: 'system' as const, content: call.systemPrompt },
    ...call.messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  // 官方 OpenAI 预设要求 max_completion_tokens；兼容网关普遍只认 max_tokens。
  const budget = call.isOfficialOpenAiPreset
    ? { max_completion_tokens: call.maxTokens }
    : { max_tokens: call.maxTokens }

  const result = await upstreamRequest(
    call.target,
    OPENAI_PATH,
    { Authorization: `Bearer ${call.apiKey}` },
    JSON.stringify({ model: call.model, messages, ...budget }),
  )

  if (!result.ok) fail(result.errorCode as never)

  const parsed = responseSchema.safeParse(parseJsonOnce(result.body))
  if (!parsed.success) return fail('UPSTREAM_BAD_RESPONSE')

  const choice = parsed.data.choices[0]
  const finishReason = mapFinishReason(choice.finish_reason)

  if (finishReason === 'blocked') {
    return { text: '', finishReason, usage: readUsage(parsed.data.usage) }
  }

  return {
    text: assertText(choice.message.content),
    finishReason,
    usage: readUsage(parsed.data.usage),
  }
}

function readUsage(
  usage: { prompt_tokens?: number | null; completion_tokens?: number | null } | null | undefined,
): NormalizedResponse['usage'] {
  return {
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
  }
}

function mapFinishReason(raw: string | null | undefined): NormalizedResponse['finishReason'] {
  switch (raw) {
    case 'stop':
      return 'stop'
    case 'length':
      return 'length'
    case 'content_filter':
      return 'blocked'
    default:
      return 'unknown'
  }
}
