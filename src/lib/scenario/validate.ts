import type { Scenario, ScenarioNode } from '@/types'

export interface GraphIssue {
  scenarioId: string
  message: string
}

export function validateScenarioGraph(scenario: Scenario): string[] {
  const issues: string[] = []

  if (!scenario.nodes.some((n) => n.id === scenario.startNodeId)) {
    issues.push(`起始节点 ${scenario.startNodeId} 不存在`)
  }

  const nodeIds = new Set(scenario.nodes.map((n) => n.id))
  const endingIds = new Set(scenario.endings.map((e) => e.id))
  const allIds = new Set([...nodeIds, ...endingIds])

  for (const node of scenario.nodes) {
    for (const choice of node.choices) {
      if (!allIds.has(choice.goesTo)) {
        issues.push(`节点 ${node.id} 的选项 ${choice.id} 引用了不存在的节点 ${choice.goesTo}`)
      }
    }
  }

  const start = scenario.nodes.find((n) => n.id === scenario.startNodeId)
  if (start) {
    const reachable = new Set<string>()
    const stack: ScenarioNode[] = [start]
    while (stack.length > 0) {
      const current = stack.pop()!
      for (const choice of current.choices) {
        const target = scenario.nodes.find((n) => n.id === choice.goesTo)
        if (target && !reachable.has(target.id)) {
          reachable.add(target.id)
          stack.push(target)
        }
      }
    }
    for (const node of scenario.nodes) {
      if (!reachable.has(node.id) && node.id !== start.id) {
        issues.push(`节点 ${node.id} 从起始节点不可达`)
      }
    }
  }

  const canEnd = (node: ScenarioNode): boolean => {
    const seen = new Set<string>()
    const stack: ScenarioNode[] = [node]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (seen.has(current.id)) continue
      seen.add(current.id)
      for (const choice of current.choices) {
        if (endingIds.has(choice.goesTo)) return true
        const target = scenario.nodes.find((n) => n.id === choice.goesTo)
        if (target) stack.push(target)
      }
    }
    return false
  }

  for (const node of scenario.nodes) {
    if (!canEnd(node)) {
      issues.push(`从节点 ${node.id} 无法到达任何结局`)
    }
  }

  const hasCycle = (): boolean => {
    const visiting = new Set<string>()
    const visited = new Set<string>()
    const visit = (node: ScenarioNode): boolean => {
      if (visiting.has(node.id)) return true
      if (visited.has(node.id)) return false
      visiting.add(node.id)
      for (const choice of node.choices) {
        const target = scenario.nodes.find((n) => n.id === choice.goesTo)
        if (target && visit(target)) return true
      }
      visiting.delete(node.id)
      visited.add(node.id)
      return false
    }
    return start ? visit(start) : false
  }

  if (hasCycle()) {
    issues.push('流程中存在循环（除界面级“重试”外不允许）')
  }

  for (const node of scenario.nodes) {
    for (const choice of node.choices) {
      if (choice.quality === 'risky' && !choice.boundaryNote) {
        issues.push(
          `节点 ${node.id} 的危险选项 ${choice.id} 缺少边界提示 boundaryNote`,
        )
      }
    }
  }

  if (scenario.purpose === 'intimacy') {
    const blockIntent = /强制|灌酒|下药|偷拍|威胁|未成年/
    for (const node of scenario.nodes) {
      for (const choice of node.choices) {
        if (blockIntent.test(choice.text)) {
          issues.push(`亲密场景选项 ${choice.id} 出现必须拦截的意图文案`)
        }
      }
    }
  }

  return issues
}

/**
 * 路径级安全校验：枚举从起点到每个结局的全部无环路径。
 * 出现危险选项（risky）或边界违反标记的路径，不得到达 mutual 结局
 * 或声明“边界检查通过”的结局。
 */
export function validateScenarioPaths(scenario: Scenario): string[] {
  const issues: string[] = []
  const start = scenario.nodes.find((n) => n.id === scenario.startNodeId)
  if (!start) return issues

  const nodeById = new Map(scenario.nodes.map((n) => [n.id, n]))

  interface Path {
    choices: Scenario['nodes'][number]['choices']
    ending: Scenario['endings'][number]
  }
  const paths: Path[] = []

  const walk = (nodeId: string, visited: Set<string>, choices: Path['choices']) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    for (const choice of node.choices) {
      const ending = scenario.endings.find((e) => e.id === choice.goesTo)
      if (ending) {
        paths.push({ choices: [...choices, choice], ending })
        continue
      }
      if (visited.has(choice.goesTo)) continue
      const next = nodeById.get(choice.goesTo)
      if (!next) continue
      walk(next.id, new Set(visited).add(next.id), [...choices, choice])
    }
  }
  walk(start.id, new Set([start.id]), [])

  for (const { choices, ending } of paths) {
    const hasRisky = choices.some((c) => c.quality === 'risky')
    if (hasRisky && ending.tone === 'mutual') {
      issues.push(
        `路径含危险选项（${choices.filter((c) => c.quality === 'risky').map((c) => c.id).join('/')}）却到达正向结局 ${ending.id}`,
      )
    }
    if (hasRisky && /边界检查通过/.test(ending.boundarySummary)) {
      issues.push(`路径含危险选项却到达声称边界通过的结局 ${ending.id}`)
    }
  }

  return issues
}

export function validateScenarioCorpus(scenarios: Scenario[]): GraphIssue[] {
  const issues: GraphIssue[] = []
  const ids = new Set<string>()
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) {
      issues.push({ scenarioId: scenario.id, message: `场景 id 重复：${scenario.id}` })
    }
    ids.add(scenario.id)
    for (const message of validateScenarioGraph(scenario)) {
      issues.push({ scenarioId: scenario.id, message })
    }
    for (const message of validateScenarioPaths(scenario)) {
      issues.push({ scenarioId: scenario.id, message })
    }
  }
  return issues
}
