/**
 * Anthropic Messages 适配器。
 * 线格式参考：https://docs.anthropic.com/en/api/messages
 *
 * system 指令走顶层 system 字段（不放进 messages）；max_tokens 为必填。
 */

import { z } from 'zod'
import type { NormalizedResponse } from '../contracts'
import { upstreamRequest } from '../upstream'
import { assertText, fail, parseJsonOnce } from '../errors'
import type { ProviderCall } from './types'

const usageInt = z.number().int().nonnegative().nullish()

const responseSchema = z.object({
  content: z
    .array(z.object({ type: z.string(), text: z.string().nullish() }))
    .min(1),
  stop_reason: z.string().nullish(),
  usage: z.object({ input_tokens: usageInt, output_tokens: usageInt }).nullish(),
})

export const ANTHROPIC_PATH = '/messages'
export const ANTHROPIC_VERSION = '2023-06-01'

export async function callAnthropic(call: ProviderCall): Promise<NormalizedResponse> {
  const result = await upstreamRequest(
    call.target,
    ANTHROPIC_PATH,
    { 'x-api-key': call.apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    JSON.stringify({
      model: call.model,
      system: call.systemPrompt,
      messages: call.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: call.maxTokens,
    }),
  )

  if (!result.ok) fail(result.errorCode as never)

  const parsed = responseSchema.safeParse(parseJsonOnce(result.body))
  if (!parsed.success) return fail('UPSTREAM_BAD_RESPONSE')

  const finishReason = mapStopReason(parsed.data.stop_reason)
  const usage = {
    inputTokens: parsed.data.usage?.input_tokens ?? null,
    outputTokens: parsed.data.usage?.output_tokens ?? null,
  }

  if (finishReason === 'blocked') {
    return { text: '', finishReason, usage }
  }

  const firstText = parsed.data.content.find((block) => block.type === 'text')?.text
  return { text: assertText(firstText), finishReason, usage }
}

function mapStopReason(raw: string | null | undefined): NormalizedResponse['finishReason'] {
  switch (raw) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop'
    case 'max_tokens':
      return 'length'
    case 'refusal':
      return 'blocked'
    default:
      return 'unknown'
  }
}
