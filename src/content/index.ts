import type { Scenario } from '@/types'
import { SCENARIOS_A } from './scenarios-a'
import { SCENARIOS_B } from './scenarios-b'
import { SCENARIOS_C } from './scenarios-c'
import { SCENARIOS_D } from './scenarios-d'
import { validateScenarioCorpus } from '@/lib/scenario/validate'

export const SCENARIOS: Scenario[] = [
  ...SCENARIOS_A,
  ...SCENARIOS_B,
  ...SCENARIOS_C,
  ...SCENARIOS_D,
]

/** 生产内容入口：只返回 reviewStatus 为 reviewed（或未标注，视为 reviewed）的场景 */
export function getPublishedScenarios(): Scenario[] {
  return SCENARIOS.filter((s) => s.reviewStatus !== 'draft')
}

const corpusIssues = validateScenarioCorpus(SCENARIOS)
if (corpusIssues.length > 0) {
  const detail = corpusIssues.map((i) => `${i.scenarioId}: ${i.message}`).join('\n')
  throw new Error(`场景数据校验失败：\n${detail}`)
}

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
