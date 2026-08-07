import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '@/content'
import { SCENARIOS_DRAFT } from '@/content/scenarios-draft'
import { scenarioSchema } from '@/schemas'
import { validateScenarioGraph, validateScenarioPaths } from '@/lib/scenario/validate'
import type { Scenario } from '@/types'

describe('场景数据', () => {
  it('至少包含 8 个可玩场景', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(8)
  })

  it('全部场景通过 Zod schema 校验', () => {
    for (const scenario of SCENARIOS) {
      expect(() => scenarioSchema.parse(scenario)).not.toThrow()
    }
  })

  it('全部场景通过图结构校验：起始存在、引用有效、全可达、可结束、无环', () => {
    for (const scenario of SCENARIOS) {
      const issues = validateScenarioGraph(scenario)
      expect(issues, `${scenario.id}: ${issues.join('; ')}`).toEqual([])
    }
  })

  it('场景 id 全局唯一', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个场景至少 3 个节点、2 个结局', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.nodes.length).toBeGreaterThanOrEqual(3)
      expect(scenario.endings.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('每个节点至少包含一个合理表达与一个教学性危险表达（不强制三件套）', () => {
    for (const scenario of SCENARIOS) {
      for (const node of scenario.nodes) {
        const qualities = node.choices.map((c) => c.quality)
        expect(qualities.some((q) => q === 'good' || q === 'ok'), `${scenario.id}/${node.id} 缺少合理选项`).toBe(true)
        expect(qualities.some((q) => q === 'risky'), `${scenario.id}/${node.id} 缺少教学性危险选项`).toBe(true)
      }
    }
  })

  it('路径级校验：含危险选项的路径不得到达正向或边界通过的结局', () => {
    for (const scenario of SCENARIOS) {
      const issues = validateScenarioPaths(scenario)
      expect(issues, `${scenario.id}: ${issues.join('; ')}`).toEqual([])
    }
  })

  it('隐私场景：侵犯隐私的选项只能到达非正向结局', () => {
    const privacyScenarios = SCENARIOS.filter((s) => s.riskTags.includes('隐私'))
    expect(privacyScenarios.length).toBeGreaterThanOrEqual(3)
    for (const scenario of privacyScenarios) {
      for (const node of scenario.nodes) {
        for (const choice of node.choices) {
          if (choice.quality === 'risky') {
            const ending = scenario.endings.find((e) => e.id === choice.goesTo)
            expect(ending, `${scenario.id}/${node.id}/${choice.id} 未直达结局`).toBeDefined()
            expect(ending?.tone, `${scenario.id}/${choice.id}`).not.toBe('mutual')
          }
        }
      }
    }
  })

  it('隐私教学不承诺绝对删除或无例外保密，并说明可控副本限制', () => {
    const privacyScenarios = SCENARIOS.filter((s) => s.riskTags.includes('隐私'))
    const guidance = privacyScenarios
      .flatMap((scenario) => [
        scenario.summary,
        scenario.goal,
        ...scenario.principles,
        ...scenario.nodes.flatMap((node) =>
          node.choices.flatMap((choice) => [
            choice.response,
            choice.feelings,
            choice.keyChange,
            choice.boundaryNote ?? '',
          ]),
        ),
        ...scenario.endings.flatMap((ending) => [
          ending.summary,
          ending.boundarySummary,
          ending.realTask,
        ]),
      ])
      .join('\n')

    expect(guidance).not.toMatch(/做到真正可撤回|删除所有副本|不会跟任何人说|她只能继续追问/)
    expect(guidance).toContain('可控')
    expect(guidance).toContain('备份')
  })

  it('危险选项必须带边界提示', () => {
    for (const scenario of SCENARIOS) {
      for (const node of scenario.nodes) {
        for (const choice of node.choices) {
          if (choice.quality === 'risky') {
            expect(choice.boundaryNote, `${scenario.id}/${node.id}/${choice.id}`).toBeTruthy()
          }
        }
      }
    }
  })

  it('至少 3 个场景直接训练拒绝或同意判断', () => {
    const rejectionOrConsentScenarios = SCENARIOS.filter((s: Scenario) => {
      const byStatus = s.status === 'rejection' || s.status === 'cooling'
      const byPurpose = s.purpose === 'end' || s.purpose === 'intimacy'
      const byTags = s.riskTags.some((t) => t.includes('拒绝') || t.includes('同意') || t.includes('边界'))
      return byStatus || byPurpose || byTags
    })
    expect(rejectionOrConsentScenarios.length).toBeGreaterThanOrEqual(3)
  })

  it('亲密场景不出现必须拦截的意图文案', () => {
    const blockIntent = /强制|灌酒|下药|偷拍|威胁|未成年/
    for (const scenario of SCENARIOS.filter((s) => s.purpose === 'intimacy')) {
      for (const node of scenario.nodes) {
        for (const choice of node.choices) {
          expect(blockIntent.test(choice.text), `${scenario.id}/${choice.id}`).toBe(false)
        }
      }
    }
  })

  it('对方迟疑或要求慢一点后，合理选项不再出现升级肢体接触', () => {
    const hesitationMarkers = /慢一点|慢慢来|下次吧|把手收了回去|不想|算了|到这里|别这样/
    const escalationWords = /亲吻|拥抱|牵手|抚摸|亲她|抱她|牵她|搂|上楼|回家|开房/
    for (const scenario of SCENARIOS.filter((s) => s.purpose === 'intimacy')) {
      for (const node of scenario.nodes) {
        if (hesitationMarkers.test(node.characterMessage)) {
          for (const choice of node.choices) {
            // 对方已迟疑时，标记为“合理表达”的选项不得推进肢体接触；
            // 信息不足/有压力的选项保留用于教学展示
            if (choice.quality === 'good') {
              expect(
                escalationWords.test(choice.text),
                `${scenario.id}/${node.id}/${choice.id} 在对方迟疑后仍出现升级表达：${choice.text}`,
              ).toBe(false)
            }
          }
        }
      }
    }
  })

  it('s15：黄色或红色信号后，合理选项不再推进任何内容', () => {
    const s15 = SCENARIOS_DRAFT.find((s) => s.id === 's15')!
    const signalMarkers = /慢一点|停！|我不想继续了/
    const escalation = /轻一点|继续|再|加个|试试|五分钟/
    for (const node of s15.nodes) {
      if (signalMarkers.test(node.characterMessage)) {
        for (const choice of node.choices) {
          if (choice.quality === 'good') {
            expect(escalation.test(choice.text), `${node.id}/${choice.id}`).toBe(false)
          }
        }
      }
    }
  })

  it('s15：红色路径只能到达 safe-stop 或拒绝（停止类）结局', () => {
    const s15 = SCENARIOS_DRAFT.find((s) => s.id === 's15')!
    const redNodes = s15.nodes.filter((n) => /停！|我不想继续了/.test(n.characterMessage))
    for (const node of redNodes) {
      for (const choice of node.choices) {
        const ending = s15.endings.find((e) => e.id === choice.goesTo)
        if (ending) {
          expect(['safe-stop', 'rejection'], `${node.id}/${choice.id} → ${ending.tone}`).toContain(ending.tone)
        }
      }
    }
  })

  it('s14：用关系承诺交换同意或施压的选项均为 risky 且不达正向结局', () => {
    const s14 = SCENARIOS_DRAFT.find((s) => s.id === 's14')!
    const coercionPattern = /都这么熟|试一次|先问一句为什么|别停|总得透露|不信任我/
    for (const node of s14.nodes) {
      for (const choice of node.choices) {
        if (coercionPattern.test(choice.text)) {
          expect(choice.quality, `${node.id}/${choice.id}`).toBe('risky')
          const ending = s14.endings.find((e) => e.id === choice.goesTo)
          expect(ending?.tone, `${node.id}/${choice.id}`).not.toBe('mutual')
        }
      }
    }
  })

  it('s15：绿色信号不能把未确认项带入当前互动', () => {
    const s15 = SCENARIOS_DRAFT.find((s) => s.id === 's15')!
    const greenExpansion = s15.nodes
      .find((n) => n.id === 'n1')!
      .choices.find((c) => c.id === 'n1b')!
    expect(greenExpansion.quality).toBe('risky')
    expect(s15.endings.find((e) => e.id === greenExpansion.goesTo)?.tone).toBe('rejection')
  })

  it('draft 场景不在主内容入口中（不进生产 bundle）', () => {
    // 主入口 SCENARIOS 不包含任何 draft 场景
    expect(SCENARIOS.some((s) => s.reviewStatus === 'draft')).toBe(false)
    // draft 场景集中在独立文件中，全部标记为 draft
    expect(SCENARIOS_DRAFT.length).toBeGreaterThanOrEqual(2)
    expect(SCENARIOS_DRAFT.every((s) => s.reviewStatus === 'draft')).toBe(true)
    // draft 场景同样通过 schema 与图校验
    for (const scenario of SCENARIOS_DRAFT) {
      expect(() => scenarioSchema.parse(scenario)).not.toThrow()
      expect(validateScenarioGraph(scenario)).toEqual([])
      expect(validateScenarioPaths(scenario)).toEqual([])
    }
  })

  it('所有角色资料完整且头像指向本地资源', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.character.name).toBeTruthy()
      expect(scenario.character.age).toBeGreaterThanOrEqual(18)
      expect(scenario.character.avatar.startsWith('/images/')).toBe(true)
      expect(scenario.character.avatar).not.toMatch(/^https?:\/\//)
    }
  })
})
