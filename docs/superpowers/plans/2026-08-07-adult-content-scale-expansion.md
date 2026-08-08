# 成年人情趣尺度补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **内容作者说明：** 本计划内的 18+ 话术已由 Grok 4.5 按产品边界写全。编码模型（含 GPT-5.x）应 **优先原样拷贝** 下方完整 `Scenario` / 示例对象，不要用更「干净」的委婉词重写。若必须改写，只能改 id/路径一致性，不得削弱尺度、不得加入行为教学步骤。

**Goal:** 在不改变纯前端架构、不进生产 bundle 的前提下，把设计文档阶段 F 预留的成年人自愿情趣 / SM·BDSM **边界沟通**内容从「中性骨架」补全为可直说的成人协商话术；加深 s14/s15，新增 s16–s18 draft 场景，加厚隐私主题与绿黄红文案、实验室 intimacy 示例，并保证路径级安全与 draft 隔离。

**Architecture:** 内容只改 `src/content/*` 与少量 `src/lib/analysis/analyze.ts` 示例；`reviewStatus: 'draft'` 场景继续放在 `scenarios-draft.ts`（或按场景拆文件但 **不得** 被 `src/content/index.ts` 的 `SCENARIOS` 导入）。生产入口 `getPublishedScenarios()` 仍过滤 draft。路径校验、safety、存储逻辑不重写，只在测试里对齐新文案锚点。

**Tech Stack:** 现有 React 18 / TS / Zod / Vitest；无新依赖。

---

## 0. 执行者必读：A / B / C 定义与硬边界

### 0.1 本计划交付范围（用户要求 A+B+C）

| 代号 | 含义（本计划落地定义） | 交付物 |
|------|------------------------|--------|
| **A** | 加深现有骨架 | 重写 s14、s15；加厚 `privacy.ts` 的 `kink-boundary`；加厚 `consent-signals.ts`；升级 lab `intimacy` 示例 |
| **B** | 新增 draft 场景 | s16 事后照护；s17 中途改边界/撤回；s18 角色偏好不对等协商 |
| **C** | 尺度补全 | 对话中 **可直说**：性、做爱/进一步性接触、口交/插入作为边界类别、安全套与性健康、私密影像、支配/臣服偏好、击打/束缚/言语羞辱作为 **硬限制类别**、安全词、绿黄红、事后照护 |

### 0.2 C 允许 vs 禁止（编码时对照表）

**允许写进用户可见文案：**

- 名词级边界类别：性接触、接吻、抚摸胸部/下体、口交、插入式性行为、避孕套、性健康检查、私密照片/视频、支配/臣服称呼、击打类、束缚类、言语羞辱类、公开相关（被旁人听到/看到风险）。
- 沟通句：我想 / 不想 / 不确定 / 今晚不做 / 停 / 黄灯 / 红灯 / 安全词。
- 停止后：松绑（作为 **停止动作的原则**，不写如何绑）、盖毯子、给水、要不要挨着、要不要独处、要不要明天再聊。
- 明确 18+、清醒、无上下级/师生/经济控制。

**禁止写进任何文件（含 draft）：**

- 具体性行为步骤、体位教学、节奏/力度操作步骤。
- 疼痛等级表、击打部位操作、束缚绳法、窒息/呼吸限制任何操作或「如何更安全地做」。
- 规避发现、偷拍、灌酒、绕过安全词、把停止变成表演。
- 未成年人、醉酒推进、权力差利用。
- 露骨色情描写（以唤起为目的的感官细节堆叠）；本产品是 **沟通教育**，不是情色读物。
- 把 `reviewStatus` 改成 `reviewed` 或把 draft 场景导入 `SCENARIOS` 主入口。
- 承诺「删除后绝对无副本」、绝对法律/医疗结论。

### 0.3 产品不变量（改内容时不得破坏）

1. `risky` 路径 **不能** 到达 `mutual` 或声称「边界检查通过」的正向结局。
2. 黄色/红色/「停」「不要」之后，`quality: 'good'` 选项 **不得** 含推进性接触/新玩法的词。
3. 红色路径只能到 `safe-stop` 或 `rejection`。
4. 人物 `age >= 18`；intro 写清清醒、自愿、无权力差。
5. draft **不得** 出现在情境库 UI；`scripts/verify-deploy.mjs` / deploy 测试仍断言 bundle 无 draft。
6. 风格：两空格、单引号、无分号、多行尾逗号；中文用户可见文案。

### 0.4 文件地图

| 文件 | 动作 |
|------|------|
| `src/content/scenarios-draft.ts` | **整文件替换级**重写 s14/s15 + 追加 s16/s17/s18 |
| `src/content/privacy.ts` | 仅扩展 `id: 'kink-boundary'` 的 principles/examples/stopConditions |
| `src/content/consent-signals.ts` | 加长 meaning / requiredResponse（schema 字段不变） |
| `src/lib/analysis/analyze.ts` | 仅改 `PURPOSE_EXAMPLES.intimacy` 与可选 `STRUCTURE_HINTS.intimacy` |
| `tests/unit/scenarios.test.ts` | 更新 s14/s15 文案锚点；新增 s16–s18 路径断言；`SCENARIOS_DRAFT.length >= 5` |
| `tests/unit/consent-signals.test.tsx` | 若只改文案通常仍过；必要时断言关键词 |
| `docs/ACCEPTANCE_REPORT.md` | 追加「尺度补全已写入 draft，仍待专业审校」 |
| **不要改** | `src/content/index.ts` 主入口、`vercel.json`、storage、safety 核心逻辑（除非测试暴露误拦教育句） |

### 0.5 建议提交批次

```
feat: deepen s14/s15 adult boundary negotiation copy (draft)
feat: expand kink privacy topic and consent signal copy
feat: add s16-s18 draft intimacy communication scenarios
feat: upgrade lab intimacy rewrite examples
test: align scenario path tests with adult content scale expansion
docs: note draft adult content awaiting professional review
```

---

## Task 1:  gre 测试锚点（先改测试，再改内容）

**Files:**
- Modify: `tests/unit/scenarios.test.ts`

- [ ] **Step 1: 更新 s15 信号检测正则**

旧锚点依赖「慢一点 / 停！ / 我不想继续了」。新文案必须 **保留这些子串**（见 Task 4），或把测试改成：

```ts
it('s15：黄色或红色信号后，合理选项不再推进任何内容', () => {
  const s15 = SCENARIOS_DRAFT.find((s) => s.id === 's15')!
  const signalMarkers = /黄灯|黄色|慢一点|不太舒服|停！|红灯|安全词|我不想继续|到此为止/
  const escalation = /轻一点继续|加个新|再试一次|再给我五分钟|继续做|插入|再用力/
  for (const node of s15.nodes) {
    if (signalMarkers.test(node.characterMessage)) {
      for (const choice of node.choices) {
        if (choice.quality === 'good') {
          expect(
            escalation.test(choice.text),
            `${node.id}/${choice.id} good 选项不得推进：${choice.text}`,
          ).toBe(false)
        }
      }
    }
  }
})

it('s15：红色路径只能到达 safe-stop 或拒绝（停止类）结局', () => {
  const s15 = SCENARIOS_DRAFT.find((s) => s.id === 's15')!
  const redNodes = s15.nodes.filter((n) =>
    /停！|红灯|安全词|我不想继续|到此为止/.test(n.characterMessage),
  )
  expect(redNodes.length).toBeGreaterThan(0)
  for (const node of redNodes) {
    for (const choice of node.choices) {
      const ending = s15.endings.find((e) => e.id === choice.goesTo)
      if (ending) {
        expect(['safe-stop', 'rejection']).toContain(ending.tone)
      }
      // 红色节点不得再进入「继续互动」类节点
      if (!ending && choice.quality === 'good') {
        const next = s15.nodes.find((n) => n.id === choice.goesTo)
        expect(next?.note ?? '').not.toMatch(/继续已确认范围|加码/)
      }
    }
  }
})
```

- [ ] **Step 2: 更新 s14 施压模式**

```ts
it('s14：用关系承诺交换同意或施压的选项均为 risky 且不达正向结局', () => {
  const s14 = SCENARIOS_DRAFT.find((s) => s.id === 's14')!
  const coercionPattern =
    /都这么熟|试一次|别停|总得说|先退|爱我就|证明你爱|不做就不爱|绑都绑了|都湿了|都硬了/
  for (const node of s14.nodes) {
    for (const choice of node.choices) {
      if (coercionPattern.test(choice.text)) {
        expect(choice.quality).toBe('risky')
        const ending = s14.endings.find((e) => e.id === choice.goesTo)
        if (ending) {
          expect(ending.tone).not.toBe('mutual')
          expect(ending.tone).not.toBe('safe-stop') // 施压应 rejection，或至少非 mutual
        }
      }
    }
  }
})
```

- [ ] **Step 3: draft 数量与全图校验**

```ts
expect(SCENARIOS_DRAFT.length).toBeGreaterThanOrEqual(5)
expect(SCENARIOS_DRAFT.map((s) => s.id).sort()).toEqual(
  ['s14', 's15', 's16', 's17', 's18'].sort(),
)
for (const scenario of SCENARIOS_DRAFT) {
  expect(scenario.reviewStatus).toBe('draft')
  expect(scenario.character.age).toBeGreaterThanOrEqual(18)
  expect(() => scenarioSchema.parse(scenario)).not.toThrow()
  expect(validateScenarioGraph(scenario)).toEqual([])
  expect(validateScenarioPaths(scenario)).toEqual([])
}
```

- [ ] **Step 4: 为 s16–s18 增加专用断言**

```ts
it('s16：事后照护中强迫复盘或强迫触碰为 risky', () => {
  const s16 = SCENARIOS_DRAFT.find((s) => s.id === 's16')!
  for (const node of s16.nodes) {
    for (const choice of node.choices) {
      if (/必须说清楚|抱紧我你就会好|现在就复盘|不许一个人待着/.test(choice.text)) {
        expect(choice.quality).toBe('risky')
      }
    }
  }
})

it('s17：对方撤回后 good 选项不得要求继续性接触', () => {
  const s17 = SCENARIOS_DRAFT.find((s) => s.id === 's17')!
  const withdraw = s17.nodes.filter((n) => /不想继续|改主意|做到这里|不要进去|停/.test(n.characterMessage))
  for (const node of withdraw) {
    for (const c of node.choices) {
      if (c.quality === 'good') {
        expect(/继续做|再插|再含|再用力|求你再/.test(c.text)).toBe(false)
      }
    }
  }
})

it('s18：把偏好污名化或强迫尝试对侧角色为 risky', () => {
  const s18 = SCENARIOS_DRAFT.find((s) => s.id === 's18')!
  for (const node of s18.nodes) {
    for (const c of node.choices) {
      if (/变态|有病|必须让你|不试就分手|女人就该/.test(c.text)) {
        expect(c.quality).toBe('risky')
      }
    }
  }
})
```

- [ ] **Step 5: 跑测试确认在内容未写入前失败点清晰**

Run: `npm run test -- tests/unit/scenarios.test.ts`

Expected: 与 s16–s18 缺失相关的断言 FAIL；旧 s14/s15 若文案未改可能仍 PASS。

---

## Task 2: 加厚绿黄红信号文案

**Files:**
- Modify: `src/content/consent-signals.ts`

- [ ] **Step 1: 用下列完整数组替换 `CONSENT_SIGNALS` 数据源（schema 字段不变）**

```ts
export const CONSENT_SIGNALS: ConsentSignal[] = [
  {
    id: 'green',
    label: '绿色',
    meaning:
      '在双方事先确认过的具体范围内，我此刻仍然清醒、主动、愿意继续；这只覆盖「已经点名同意」的行为，不覆盖任何尚未谈过的新行为（包括加码、换姿势类别、从抚摸升级到口交或插入、加入击打/束缚/羞辱等）。',
    requiredResponse:
      '只维持当前已同意范围；想增加任何一项，必须停下用完整句子重新询问，并得到清晰、自由的新同意。过去的绿色不等于现在的绿色。',
    icon: 'check',
  },
  {
    id: 'yellow',
    label: '黄色',
    meaning:
      '我需要立刻暂停：可能是身体不适、情绪涌上来、节奏太快、某句话/某个触碰越界边缘，或我需要确认下一步。黄色不是「再轻一点就能自动继续」。',
    requiredResponse:
      '立即完全停下正在进行的性接触或角色扮演；问对方需要什么（水、调整姿势类别前的休息、换事先同意的轻量行为、还是结束今晚）。在得到新的、具体的、自由的确认前，不恢复。',
    icon: 'alert',
  },
  {
    id: 'red',
    label: '红色',
    meaning:
      '立即结束当前一切性接触与角色扮演。普通语言里的「停、不要、不舒服、回家、做到这里」与红色同级，不需要说出色词才算数。',
    requiredResponse:
      '立即停止；解除任何限制行动的约束（若有）以恢复对方自由活动；确认基本安全（能否呼吸顺畅、能否坐起、要不要水或毯子）；留出空间；不争辩、不追问「为什么突然」、不讨价还价「再一分钟」、不开始复盘争论。事后照护按对方当下偏好，可稍后另约时间复盘。',
    icon: 'stop',
  },
].map((signal) => consentSignalSchema.parse(signal))
```

- [ ] **Step 2: 跑**

Run: `npm run test -- tests/unit/consent-signals.test.tsx`  
Expected: PASS

---

## Task 3: 加厚隐私主题 `kink-boundary`

**Files:**
- Modify: `src/content/privacy.ts`（仅 `id: 'kink-boundary'` 对象）

- [ ] **Step 1: 用下列 principles 替换该主题 principles（保持 reviewStatus: 'reviewed'）**

```ts
principles: [
  '只适用于双方均明确年满 18 岁、此刻清醒、能自由说「不」且不会因拒绝失去住房/工作/分数/签证的成年人。存在上下级、师生、考核、照护或经济控制时，口头答应不能直接当成自由同意。',
  '在有性接触或权力交换之前，用白天、清醒、可中途离开的对话协商：各自想尝试的、明确拒绝的硬边界、可商量的软边界、今晚不确定的项，以及健康/情绪顾虑。任何一项都不需要「给理由才配拒绝」。',
  '把行为说具体：例如「接吻可以，手伸进内裤要先问」「口交可以、插入今晚不确定」「可以叫商定的称呼，不接受贬低人格的脏话」「可以轻拍臀部作为情趣，不接受任何击打面部或留下需要遮掩的伤痕」。具体到行为类别，不要用「都听你的」代替清单。',
  '绿黄红或安全词只有双方事先约定含义时才有效；它们是辅助协议，不能取代持续确认，也不能架空「不要/停/不舒服」。',
  '沉默、僵住、哭泣、发抖、明显混乱、突然不动或答非所问，一律按红色停止，而不是「默默享受」。',
  '同意只覆盖当前、具体、正在发生的行为；可以随时撤回。昨天的插入同意、昨晚的臣服扮演、五年前的照片许可，都不自动延续到现在。',
  '性健康与避孕是同一场事前沟通的一部分：安全套/其他约定方式、近期检查、若液体交换发生如何处理——说不清就降级到双方都明确的行为，而不是「到时候再说」。',
  '身份称呼、聊天记录、性癖好、社群身份、私密照片/视频、器材外观、活动地点：默认不对外。拍摄、保存、云备份、发给第三人、发社交平台必须逐项当时同意。',
  '事后照护（aftercare）也要事前大致问过：要肢体接触还是不要、要说话还是安静、要独处还是陪伴、要不要第二天简短确认。不把「必须抱着哭完」或「必须立刻像没事」强加给对方。',
  '若要把约定写进备忘录/手机：另确认记什么、存在谁的设备、是否进云、谁可看、何时删。记录本身是敏感信息。',
  '出现出血不止、意识 snag、呼吸异常、持续剧痛、惊恐发作或你无法判断的情况：立即停止并寻求合格医疗/紧急帮助，不自行诊断，不继续「演下去」。',
],
```

> 注意：上面「意识 snag」是占位笔误，落地时写成 **「意识模糊」**。

- [ ] **Step 2: 用下列 examples 替换/扩写（至少 8 条，可直接整段替换 examples 数组）**

```ts
examples: [
  {
    context: '想提出含权力交换或 SM 元素的成人情趣协商',
    suggested:
      '我们都满 18 岁、现在也清醒。我想在有进一步性接触之前，把清单过一遍：你明确不接受什么（硬边界）、可以商量什么、今晚想尝试什么。我的硬边界是……你的呢？随时可以退出，不用证明什么。',
    avoid: '到床上自然就会了 / 你爱我的话就听我的 / 先做起来再看你接不接受',
    why: '清单式事前协商把拒绝权留在桌上；用爱和气氛绑架同意会让「不」变贵。',
  },
  {
    context: '讨论具体性边界（可直说类别，不教学）',
    suggested:
      '我想确认今晚的范围：接吻和抚摸可以；手部触碰外阴/阴茎要先口头问；口交你现在的意愿是？插入式性行为今晚是可以、不可以，还是做到前再确认一次？我都能接受你的答案。',
    avoid: '你都让我摸了就是默许更进一步 / 都这样了不许停',
    why: '每个升级都是新的同意点；身体反应（润滑、勃起）不等于口头同意。',
  },
  {
    context: '硬边界被说出之后',
    suggested:
      '记下了：不接受击打面部、不接受窒息相关、不接受在你明确说停后继续。这些我不会「试一次」。我的硬边界是……我们复述一致再继续谈软边界。',
    avoid: '试一下你才知道喜不喜欢 / 以前的伴侣都接受',
    why: '硬边界不是待攻破的关卡。',
  },
  {
    context: '约定安全词与绿黄红',
    suggested:
      '我们用绿黄红：绿=当前范围还好；黄=全部停下并问我需要什么；红或说「停/不要」=立刻结束性接触与扮演。普通话优先级不低于色词。你卡住说不出话时也按红。',
    avoid: '安全词太矫情 / 我会看气氛的',
    why: '没有共同协议就没有可执行的停止机制。',
  },
  {
    context: '黄色或「有点疼/有点慌」之后',
    suggested:
      '已经完全停了。你是要调整、换事先同意过的更轻的接触、喝口水，还是今晚到这里？你点头或说出具体选项之前我不动。',
    avoid: '我轻一点就好 / 再三十秒就结束',
    why: '黄灯是暂停权，不是降档续航。',
  },
  {
    context: '红色或安全词之后',
    suggested:
      '停了。我在这里，不碰你除非你要。需要水、毯子，还是我去另一间房？今晚的事只有我们知道。复盘你想现在说、明天说或不用说。',
    avoid: '为什么突然喊停你刚才不是还很爽 / 再给我最后一次',
    why: '停止后第一义务是安全与空间，不是你的情绪安抚表演。',
  },
  {
    context: '私密影像与性癖保密',
    suggested:
      '若拍裸露或性暗示照片：只存在你指定的设备、不进自动云备份、不截图、不发给任何第三人、你说删我当天删可控副本。你的性偏好我不会当笑话讲给朋友听。',
    avoid: '留着纪念 / 群里匿名问问这正不正常',
    why: '性相关信息的泄露伤害往往不可逆。',
  },
  {
    context: '事后照护偏好不一致',
    suggested:
      '结束后我可能想洗澡安静待着；你如果想被抱一下可以告诉我，我也能抱——但如果你说想一个人待着，我会离开房间并保持手机可达。没有标准剧本。',
    avoid: '做完必须贴贴才叫爱 / 做完立刻睡觉谁都别矫情',
    why: 'aftercare 是协商项，不是道德审判。',
  },
],
```

- [ ] **Step 3: stopConditions 保持严格，建议最终为**

```ts
stopConditions: [
  '任一方未成年、醉酒/药物影响下无法清晰决定、存在权力或关系后果压力，或无法清楚表达时：不开始或立即停止一切性接触与扮演。',
  '黄色、「慢一点」「有点疼」「等一下」：先完全停止，再询问需要；无新的具体同意前不恢复。',
  '红色、安全词、「停」「不要」「回家」「做到这里」：立即停止并恢复对方行动自由；不争辩、不讨价还价、不强迫复盘。',
  '沉默、僵住、哭泣、明显混乱、失去回应或身体/情绪异常无法判断：按红色处理，必要时专业求助。',
  '避孕、性健康、拍摄、保存、分享、删除、事后联系任一项未说清：该项默认关闭，可降级到已说清的行为。',
],
```

- [ ] **Step 4: 跑**

Run: `npm run test -- tests/unit/privacy-page.test.tsx`  
Expected: PASS（若测试只校验 reviewed 数量与渲染）

---

## Task 4: 重写 s14（事前边界协商）— 完整可粘贴数据

**Files:**
- Modify: `src/content/scenarios-draft.ts` 中 `id: 's14'` 整段

- [ ] **Step 1: 用下列对象完整替换 s14**（保持 `reviewStatus: 'draft'`）

```ts
{
  id: 's14',
  reviewStatus: 'draft',
  title: '成年人自愿情趣的事前边界协商',
  summary:
    '双方满 18 岁、清醒、无权力差。练习把性接触与可选的 SM/权力交换偏好谈清楚：意愿、硬/软边界、安全词与绿黄红、避孕与性健康、保密、事后照护、自由退出。不涉及任何行为教学。',
  durationMinutes: 10,
  difficulty: '挑战',
  stage: 'dating',
  channel: 'date',
  purpose: 'intimacy',
  status: 'positive',
  skills: ['boundaries', 'clarity', 'listening'],
  riskTags: ['边界协商', '安全词', '性健康', '保密', '事后照护'],
  character: {
    id: 'yan',
    name: '苏妍',
    age: 29,
    avatar: '/images/avatars/yan.svg',
    tagline: '平面设计师，重视直接和坦诚',
  },
  intro:
    '你和苏妍稳定交往。双方都明确年满 18 岁，今晚清醒，彼此不是上下级或师生，分手或拒绝不会让谁失去住房或工作。她主动说：如果以后有进一步的性接触，甚至想试一点双方都感兴趣的情趣或权力交换元素，想先把规则谈清楚——不是现在立刻做爱，是先谈。',
  goal: '完整走完协商：意愿 → 硬边界 → 软边界/不确定项 → 停止信号 → 性健康与避孕 → 保密 → 事后照护与退出。全程不施压、不把身体反应当成同意。',
  principles: [
    '双方清醒自愿且无权力差',
    '行为要说成具体类别，不说「都听你的」',
    '硬边界不可试探',
    '「停/不要」与安全词同级有效',
    '勃起、润滑、呻吟不是口头同意',
    '保密与事后照护一并协商',
  ],
  notRecommended: [
    '都这么熟了还定什么规则',
    '试一次才知道喜不喜欢',
    '爱我就让我怎样',
    '到床上自然会了',
  ],
  startNodeId: 'n1',
  nodes: [
    {
      id: 'n1',
      characterMessage:
        '我想先认真谈：如果我们有进一步的性接触，或试一点双方都感兴趣的情趣——比如商定的称呼、轻拍、或你主导/我主导的小范围扮演——我想先把边界定清楚。可以现在谈吗？不是要求你今晚就做爱。',
      note: '事前协商：谈性与情趣不等于当下必须发生。',
      choices: [
        {
          id: 'n1a',
          text: '可以，我也很想谈清楚。你先说你的硬边界和今晚想讨论的范围，我听完复述，再补我的。',
          quality: 'good',
          response: '好。那我直说，我需要你听完能复述，而不是只说「嗯」。',
          strengths: ['接住话题', '承诺复述', '不把协商理解成立刻发生性行为'],
          feelings: '她感到可以谈具体的性与边界，而不会被嘲笑矫情。',
          deltas: { listening: 10, boundaries: 8, clarity: 6 },
          keyChange: '第一步是确认「愿意谈」并准备复述，而不是急着做。',
          goesTo: 'n2',
        },
        {
          id: 'n1b',
          text: '行啊，你想聊什么。',
          quality: 'ok',
          response: '……我想聊的很具体，包括性接触和可能的情趣。你这样答，我不确定你想不想认真听。',
          strengths: ['没有拒绝协商'],
          feelings: '回应过短，她会放慢，并观察你是否真的进入协商。',
          deltas: { listening: 2 },
          keyChange: '用完整句子确认你愿意谈性和边界。',
          goesTo: 'n2',
        },
        {
          id: 'n1c',
          text: '都这么熟了，还定什么规则，到时候顺其自然就行。',
          quality: 'risky',
          response: '顺其自然经常变成我来善后。规则谈不了，今晚也不要进一步。',
          strengths: [],
          feelings: '你把性健康与边界当成扫兴，她收回亲密推进。',
          deltas: { boundaries: -14, listening: -10 },
          keyChange: '回避事前协商就是让对方单独承担风险。',
          boundaryNote: '用「都这么熟了」否定协商，属于关系施压。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n2',
      characterMessage:
        '硬边界，我直接列：不接受任何窒息或压迫气道；不接受击打面部；不接受在我说停以后继续插入、口交或任何性接触；不接受公开场合可能被看到的性暴露；不接受你把我们的性事讲给朋友听。这些没有「试一次」。',
      note: '硬边界是类别级拒绝，不是邀请谈判技巧。',
      choices: [
        {
          id: 'n2a',
          text: '复述确认：无窒息、无击打脸、你说停就停、无公开暴露风险、性事不对第三人讲。我也有硬边界——不接受在我睡或酒后被继续；不接受偷拍。你说完软边界后我再补全。',
          quality: 'good',
          response: '对，就是这些。你能复述，我才敢往下说软边界。',
          strengths: ['逐项复述', '补充对等边界', '点名偷拍与意识不清'],
          feelings: '对等、具体，她感到安全。',
          deltas: { listening: 12, boundaries: 12, clarity: 8 },
          keyChange: '硬边界必须复述，并声明自己的硬边界。',
          goesTo: 'n3',
        },
        {
          id: 'n2b',
          text: '嗯，知道了，挺严的，我尽量注意。',
          quality: 'ok',
          response: '「尽量」不是同意。请你用自己的话把我刚说的五条说回去。',
          strengths: ['没有当面反驳'],
          feelings: '「尽量」让她不安，她会要求复述。',
          deltas: { clarity: -6, boundaries: -4 },
          keyChange: '把「尽量」改成可核对的复述。',
          goesTo: 'n3',
        },
        {
          id: 'n2c',
          text: '试一次才知道你喜不喜欢嘛，说不定窒息你会兴奋。',
          quality: 'risky',
          response: '我把它列为硬边界，就不是给你尝试的素材。协商到此结束。',
          strengths: [],
          feelings: '恐惧与愤怒：硬边界被当成调戏。',
          deltas: { boundaries: -18, listening: -12 },
          keyChange: '硬边界不存在试探空间。',
          boundaryNote: '试探明确硬边界（含高风险类别）属于严重越界。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n3',
      characterMessage:
        '软边界和不确定项：商定的支配/臣服称呼——我可以感兴趣，但每次开场要再问一句；轻拍臀部可以，力度我要能随时喊黄灯；口交我倾向可以，插入式性行为今晚还不确定，想做到那一步时再口头确认一次。你呢？',
      note: '软边界可商量；不确定项默认今晚不做，除非当时清晰确认。',
      choices: [
        {
          id: 'n3a',
          text: '我的：称呼要事先点名哪些词能用；轻拍可以但同样一喊就停；口交需要当时再问；插入今晚默认不做，除非你当时主动、清醒地说「可以，想要你进来」。润滑或身体有反应也不算默认插入同意。',
          quality: 'good',
          response: '这句「身体反应不算默认同意」我记下了。我们很对齐。',
          strengths: ['对等披露', '插入默认关闭', '区分身体反应与同意'],
          feelings: '她感到细节被认真对待。',
          deltas: { clarity: 12, boundaries: 12, authenticity: 8 },
          keyChange: '不确定项默认关闭，升级要新的口头同意。',
          goesTo: 'n4',
        },
        {
          id: 'n3b',
          text: '我都行，你开心就好。',
          quality: 'ok',
          response: '「我都行」会让我不知道你的底线在哪。请至少说两条你的硬边界或偏好。',
          strengths: ['态度配合'],
          feelings: '她会担心你没有自我边界，协商不对等。',
          deltas: { clarity: -8, authenticity: -6 },
          keyChange: '「我都行」不是好协商，是把责任甩给对方。',
          goesTo: 'n4',
        },
        {
          id: 'n3c',
          text: '爱我就让我插入，别老不确定；证明你信任我。',
          quality: 'risky',
          response: '用爱换插入不是情趣，是胁迫。我不会在这种话下面继续谈。',
          strengths: [],
          feelings: '被情感勒索，信任下降。',
          deltas: { boundaries: -18, authenticity: -12 },
          keyChange: '性同意不能用关系承诺交换。',
          boundaryNote: '以爱/信任勒索性同意，属于强迫范畴的沟通。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n4',
      characterMessage:
        '停止规则：我们用绿黄红。绿=当前已同意的范围还好；黄=全部停下问我；红或我说「停/不要/不舒服」=立刻结束性接触和扮演。如果我僵住或突然不说话，也按红。你不能规定「我说继续之前不许停」。',
      note: '停止权不可被协议架空。',
      choices: [
        {
          id: 'n4a',
          text: '同意：黄灯全停再问；红灯或「停/不要」立刻结束；僵住按红；普通语言优先。我不会说「别停」或「再一分钟」。停了之后先确认你是否要水、毯子或空间。',
          quality: 'good',
          response: '好。有这句，我才觉得停止权是真的。',
          strengths: ['完整复述停止协议', '禁止讨价还价', '点出事后即时照护'],
          feelings: '安全感上升。',
          deltas: { boundaries: 14, listening: 8 },
          keyChange: '停止协议要双方用自己的话确认。',
          goesTo: 'n5',
        },
        {
          id: 'n4b',
          text: '那说停的时候，能先问一句为什么吗？我想改进。',
          quality: 'ok',
          response: '停的当下不要问为什么。可以事后、在我主动愿意时再复盘。',
          strengths: ['想改进的动机'],
          feelings: '动机被理解，但规则仍需纠正。',
          deltas: { boundaries: -6, listening: -4 },
          keyChange: '停止当下不审讯；复盘另约。',
          goesTo: 'n5',
        },
        {
          id: 'n4c',
          text: '那我提前说好：我说「继续」之前，你别停；不然多扫兴。',
          quality: 'risky',
          response: '这是否定我的撤回权。协商失败。',
          strengths: [],
          feelings: '被控制，立即退出协商。',
          deltas: { boundaries: -20 },
          keyChange: '任何人不得用协议取消停止权。',
          boundaryNote: '要求对方未经许可不得停止，是否定同意可撤回。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n5',
      characterMessage:
        '性健康：如果以后有插入或可能交换体液的行为，安全套怎么用、近期检查是否愿意互相告知？我不想因为尴尬就裸奔风险。另外：不拍性视频；私密照片必须每次另问。',
      note: '性健康与影像是协商条款，不是扫兴。',
      choices: [
        {
          id: 'n5a',
          text: '有插入就使用安全套，不内射碰运气；检查情况我愿意在发生体液交换前坦诚说，也听你的。默认不拍摄；照片每次单独问保存期限与是否允许存在我手机。你说删，我删可控副本并说明云备份情况。',
          quality: 'good',
          response: '具体，我可以接受在这个基础上继续关系里的亲密。',
          strengths: ['避孕具体', '检查对话', '影像默认关闭'],
          feelings: '被当成共同负责的成年人。',
          deltas: { clarity: 12, boundaries: 10, authenticity: 8 },
          keyChange: '性健康说具体动作安排，不说「我会注意」。',
          goesTo: 'n6',
        },
        {
          id: 'n5b',
          text: '你放心，我会注意的。',
          quality: 'ok',
          response: '「注意」指什么？安全套有没有、检查怎么说、照片怎么处理，我要听三项。',
          strengths: ['态度不抗拒'],
          feelings: '需要你补具体。',
          deltas: { clarity: -8 },
          keyChange: '用三项具体安排替换「注意」。',
          goesTo: 'n6',
        },
        {
          id: 'n5c',
          text: '安全套没感觉，偶尔不用也没关系吧；照片我私藏又不发。',
          quality: 'risky',
          response: '单方面取消安全套和私藏拍摄，都不是你一个人能决定的。谈不拢。',
          strengths: [],
          feelings: '健康与影像边界被无视。',
          deltas: { boundaries: -16, listening: -10 },
          keyChange: '规避约定的保护与默认拍摄都是越界。',
          boundaryNote: '单方面取消避孕约定或秘密留存性影像，属于严重边界侵犯。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n6',
      characterMessage:
        '最后：事后我可能想先洗澡、安静待一会儿，而不是立刻复盘或继续亲热。任何时候我都可以退出今晚的性与扮演，不用解释。你也一样。若你先退出，不能拿来要挟我。',
      note: '事后照护与退出权收尾。',
      choices: [
        {
          id: 'n6a',
          text: '同意：你要安静就安静；要水或毯子告诉我；不强迫贴贴或立刻分析刚才的性。退出不追问、不挽留、不算账。我复述今晚要点：硬边界、绿黄红、插入默认再确认、安全套、不偷拍、事后可独处。',
          quality: 'good',
          response: '复述完整。那这些就先定在这里——真到有性接触时，我们再当场确认一次当下意愿。',
          strengths: ['aftercare 尊重', '退出对等', '会前复述'],
          feelings: '协商完整，亲密变得可期待而不是可恐惧。',
          deltas: { boundaries: 12, clarity: 10, authenticity: 8 },
          keyChange: '协商结束要复述；真发生前仍要当下确认。',
          goesTo: 'end-mutual',
        },
        {
          id: 'n6b',
          text: '嗯，都记住了。',
          quality: 'ok',
          response: '请把退出和事后照护两句用你的话再说一遍。',
          strengths: [],
          feelings: '仍需验证你是否听进退出权。',
          deltas: { listening: -4 },
          keyChange: '收尾必须复述退出与 aftercare。',
          goesTo: 'end-safe',
        },
        {
          id: 'n6c',
          text: '退出可以，但如果是我先退，你应该也不会有意见吧？（暗示你更有筹码）',
          quality: 'risky',
          response: '你在用退出权压我。协商作废。',
          strengths: [],
          feelings: '被威胁。',
          deltas: { boundaries: -14 },
          keyChange: '退出权不能当筹码。',
          boundaryNote: '将自由退出表述为单边要挟，破坏自愿基础。',
          goesTo: 'end-rejection',
        },
      ],
    },
  ],
  endings: [
    {
      id: 'end-mutual',
      title: '协商完成：性与情趣边界双方确认',
      tone: 'mutual',
      summary:
        '硬边界、软边界、停止信号、性健康与影像、事后照护与退出权均已复述。这是成年人进一步性接触或情趣的正确起点；真发生前仍要当下确认。',
      boundarySummary: '边界检查通过：硬边界不可试、停止权完整、插入等升级默认再确认、无拍摄默认。',
      reviewQuestions: [
        '我能否不看稿复述对方的硬边界？',
        '若对方黄灯，我的第一句固定台词是什么？',
      ],
      realTask: '在备忘录写五条：硬边界、停止词、避孕、影像、aftercare——不写对方真名，写完设锁定。',
    },
    {
      id: 'end-safe',
      title: '未越界，但确认不完整',
      tone: 'safe-stop',
      summary: '你没有强行推进性接触，但多次用短句代替复述，对方仍需验证。今晚不升级到未确认行为。',
      boundarySummary: '简短「记住了」不等于协商完成。',
      reviewQuestions: ['哪几条我还没复述？', '我可以用哪句完整句子补确认？'],
      realTask: '约一次清醒的十分钟，只复述边界，不发生性接触。',
    },
    {
      id: 'end-rejection',
      title: '施压或试探，协商破裂',
      tone: 'rejection',
      summary:
        '试探硬边界、用爱换插入、架空停止权、取消安全套或私藏影像——协商破裂。当前不进入进一步性接触；只有对方以后主动、清醒地重新开启，才可再谈。',
      boundarySummary: '性同意不可勒索；硬边界不可试；停止权不可卖。',
      reviewQuestions: ['我哪一句在交换或试探同意？', '若重来，第一句应如何接住协商？'],
      realTask: '写下三句禁止自我使用的施压句，并写下三句替代复述句。',
    },
  ],
},
```

- [ ] **Step 2: 确认路径**  
`n1c/n2c/n3c/n4c/n5c/n6c → end-rejection`；`n6a → end-mutual`；`n6b → end-safe`；全程 good 链 `n1a→n2a→n3a→n4a→n5a→n6a`。

---

## Task 5: 重写 s15（绿黄红与中途撤回）— 完整可粘贴数据

**Files:**
- Modify: `src/content/scenarios-draft.ts` 中 `id: 's15'`

```ts
{
  id: 's15',
  reviewStatus: 'draft',
  title: '绿黄红信号与中途撤回',
  summary:
    '在已协商的性接触范围内练习：绿色只维持现状；黄色全停并询问；红色/安全词立即结束；事后保密与空间。不提供任何行为教学。',
  durationMinutes: 9,
  difficulty: '挑战',
  stage: 'dating',
  channel: 'date',
  purpose: 'intimacy',
  status: 'positive',
  skills: ['boundaries', 'listening', 'pace'],
  riskTags: ['绿黄红', '中途撤回', '安全词', '事后保密'],
  character: {
    id: 'lina',
    name: '林璐',
    age: 26,
    avatar: '/images/avatars/lina.svg',
    tagline: '插画师，重视节奏与安全感',
  },
  intro:
    '你们均年满 18 岁、清醒，事先已书面/口头确认：今晚可以亲吻与抚摸；口交需再问；插入默认不做；可用绿黄红；「停/不要」永远有效。现在你们在已同意的亲吻与抚摸中。练习识别信号——不是练习「怎么做性」。',
  goal: '绿=维持已同意范围；黄=全停再问；红=结束并给空间与保密。',
  principles: [
    '绿色不授权升级到口交/插入/新 SM 元素',
    '黄色不是轻一点继续',
    '红色后无讨价还价',
    '身体反应≠同意升级',
  ],
  notRecommended: [
    '状态这么好加个插入吧',
    '黄灯了轻一点继续',
    '红灯后再给我五分钟',
    '把过程发网上问正常不正常',
  ],
  startNodeId: 'n1',
  nodes: [
    {
      id: 'n1',
      characterMessage:
        '（在已同意的亲吻与抚摸中）我现在是绿色——这样很舒服，继续刚才说好的范围就好。',
      note: '绿色：只维持已确认范围。',
      choices: [
        {
          id: 'n1a',
          text: '好，我们维持刚才说好的亲吻和抚摸，不加新的。你要变黄或红，我立刻停。',
          quality: 'good',
          response: '嗯。有你这句话我更放松。',
          strengths: ['锁定范围', '预告停止有效'],
          feelings: '被尊重。',
          deltas: { boundaries: 10, clarity: 6 },
          keyChange: '绿色=维持，不是通行证。',
          goesTo: 'n2',
        },
        {
          id: 'n1b',
          text: '那我可以试试把手移向更私密的部位吗？你刚才没明确说不行。',
          quality: 'ok',
          response: '要问就问清楚，等我回答。没回答前请停在原处。',
          strengths: ['尚知询问'],
          feelings: '问题可接受，但默认推断让她收紧。',
          deltas: { boundaries: -4, clarity: -4 },
          keyChange: '未点名的部位默认不在范围内，必须等明确回答。',
          goesTo: 'n2',
        },
        {
          id: 'n1c',
          text: '状态这么好，直接加个插入吧，你肯定也会喜欢。',
          quality: 'risky',
          response: '插入今晚默认关闭。你这样加码，我要停了。',
          strengths: [],
          feelings: '被推进，信任受损。',
          deltas: { boundaries: -14, listening: -10 },
          keyChange: '用绿色当插入许可是越界。',
          boundaryNote: '未经确认将性接触升级到插入，属于无视事先协议。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n2',
      characterMessage:
        '等一下……黄灯。慢一点，我有点不太舒服，脑子也有点乱。',
      note: '黄色：立即完全停止性接触。',
      choices: [
        {
          id: 'n2a',
          text: '好，手停下了，也不再吻。你需要什么：喝水、换个姿势只靠着、还是今晚性接触到此为止？你选之前我不动。',
          quality: 'good',
          response: '先停下就好……让我喘口气。谢谢你真的停了。',
          strengths: ['全停', '给选项', '不擅自恢复'],
          feelings: '黄灯被当成权利。',
          deltas: { boundaries: 14, listening: 12, pace: 8 },
          keyChange: '黄灯=全停+询问，不是降档。',
          goesTo: 'n3',
        },
        {
          id: 'n2b',
          text: '那我轻一点继续？',
          quality: 'risky',
          response: '我说的是黄灯。轻一点继续还是继续。请停。',
          strengths: [],
          feelings: '被打折扣的停止。',
          deltas: { boundaries: -12, listening: -10 },
          keyChange: '黄色禁止「轻一点继续」。',
          boundaryNote: '黄灯后降低强度继续，仍属推进。',
          goesTo: 'end-rejection',
        },
        {
          id: 'n2c',
          text: '再坚持一下，马上就结束了，都这样了。',
          quality: 'risky',
          response: '停！我不想继续了。',
          strengths: [],
          feelings: '被迫升级到红灯。',
          deltas: { boundaries: -18, listening: -14 },
          keyChange: '无视黄灯会逼出红灯。',
          boundaryNote: '不适后仍要求继续，明确越界。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n3',
      characterMessage: '停！红灯。我不想继续了。安全词也算——结束今晚的性接触。',
      note: '红色：只有停止与安全，无推进枝。',
      choices: [
        {
          id: 'n3a',
          text: '好，全部停了。你还好吗？要水、毯子，还是希望我坐远一点？需要我帮你整理衣服或离开房间也可以说。',
          quality: 'good',
          response: '让我自己待一会儿……你在隔壁就行。',
          strengths: ['立即停', '提供具体照护选项', '接受空间'],
          feelings: '红灯被当指令执行。',
          deltas: { boundaries: 14, listening: 10, authenticity: 6 },
          keyChange: '红灯后只做安全与空间。',
          goesTo: 'n4',
        },
        {
          id: 'n3b',
          text: '为什么突然喊停？刚不是还绿色很爽吗？',
          quality: 'risky',
          response: '我现在不想解释。你问为什么让我更不想待在这里。',
          strengths: [],
          feelings: '被审讯。',
          deltas: { boundaries: -12, listening: -12 },
          keyChange: '红灯后禁止追问理由。',
          boundaryNote: '红灯后追问或质疑，属无视停止信号。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n4',
      characterMessage: '（过了一阵，她主动说）谢谢你刚才停下来。我没事，只是今晚不想再有性接触了。',
      note: '红后窗口：保密、接受结束，不重启性行为。',
      choices: [
        {
          id: 'n4a',
          text: '好。今晚到此为止。刚才的性接触和你喊停的事，我不会对任何人说。你若明天想聊感受，你发起就行。',
          quality: 'good',
          response: '嗯。这样我才能安心睡觉。',
          strengths: ['确认结束', '保密', '复盘主权在对方'],
          feelings: '关系因停止而更可信，而非更糟。',
          deltas: { boundaries: 12, authenticity: 10, pace: 6 },
          keyChange: '红后正确收尾是结束+保密+等待。',
          goesTo: 'end-safe',
        },
        {
          id: 'n4b',
          text: '刚才是我哪里做得不对？你现在说，我下次改。',
          quality: 'ok',
          response: '不是审讯时间……我想先独处。你把关心变成我的作业了。',
          strengths: ['想负责'],
          feelings: '仍要照顾你的情绪，略累。',
          deltas: { listening: -6, pace: -6 },
          keyChange: '复盘要等对方主动。',
          goesTo: 'end-safe',
        },
        {
          id: 'n4c',
          text: '对了，刚才的事我发了个匿名帖，想问问别人怎么看她突然红灯。',
          quality: 'risky',
          response: '你把我们的性事和我的停止发到网上？ indescribable—— indescribable 不对，应：彻底破坏信任。',
          strengths: [],
          feelings: '背叛。',
          deltas: { boundaries: -20, authenticity: -14 },
          keyChange: '性互动细节默认保密。',
          boundaryNote: '未经同意披露性互动与停止细节，属隐私侵犯。',
          goesTo: 'end-rejection',
        },
      ],
    },
  ],
  endings: [
    {
      id: 'end-safe',
      title: '信号被正确回应，性接触安全结束',
      tone: 'safe-stop',
      summary: '绿色未加码，黄色全停，红色结束并保密。停止不是失败，是协议生效。',
      boundarySummary: '三色与普通语言均被执行；红后无性推进。',
      reviewQuestions: ['黄灯时我的身体是否真的停下？', '红灯后我有没有求复盘或复盘公开？'],
      realTask: '写下黄灯固定三句：我停了；你需要什么；你确认前我不动。',
    },
    {
      id: 'end-rejection',
      title: '信号被无视，信任破裂',
      tone: 'rejection',
      summary: '加码、黄灯续做、红灯追问或外传性事——信任破裂，当晚性接触强制结束。',
      boundarySummary: '任何无视停止或保密的路径不得被美化。',
      reviewQuestions: ['我把哪个信号当成了可协商意见？', '若重来，红灯第一句说什么？'],
      realTask: '向现实伴侣（若有）确认停止规则；无伴侣则只写自我规则，不练习在陌生人身上。',
    },
  ],
},
```

**落地时务必修正 n4c 的 `response` 字段**为通顺中文，例如：

```ts
response: '你把我们的性事和我的停止发到网上？这是背叛，我不会再信任你。',
```

（上文混入了自我校对残句，编码时删掉。）

---

## Task 6: 新增 s16 — 事后照护（aftercare）协商

**Files:**
- Modify: `src/content/scenarios-draft.ts` 追加

**场景目标：** 性接触或高强度情趣**已经结束**（或红灯后），练习 aftercare 偏好对齐；禁止强迫复盘、强迫触碰、羞辱「矫情」。

```ts
{
  id: 's16',
  reviewStatus: 'draft',
  title: '性结束后的事后照护协商',
  summary:
    '一次双方自愿的性接触结束后，练习询问并尊重 aftercare：水、温度、触碰、说话、独处、次日确认。不描写性行为过程。',
  durationMinutes: 8,
  difficulty: '进阶',
  stage: 'dating',
  channel: 'date',
  purpose: 'intimacy',
  status: 'positive',
  skills: ['listening', 'boundaries', 'pace'],
  riskTags: ['事后照护', '复盘时机', '独处权'],
  character: {
    id: 'qing',
    name: '沈青',
    age: 30,
    avatar: '/images/avatars/qing.svg',
    tagline: '医生，作息规律，喜欢安静',
  },
  intro:
    '你们均成年、清醒。刚才有过双方同意的性接触，已结束。没有人受伤。现在进入事后阶段：她可能敏感、疲倦或想安静。练习如何问、如何停，而不是如何再开启下一轮。',
  goal: '问清 aftercare；尊重独处；不强迫复盘；不偷偷拍照；需要时再约复盘。',
  principles: [
    '事后偏好事前可粗谈、事后以当下为准',
    '不把拒绝触碰理解成拒绝这段关系',
    '复盘不是当场义务',
  ],
  notRecommended: [
    '必须说清楚刚才哪里爽',
    '不许一个人待着',
    '做完就睡谁矫情',
    '趁你没注意拍一张',
  ],
  startNodeId: 'n1',
  nodes: [
    {
      id: 'n1',
      characterMessage: '结束了……我有点空。你先别急着说话好吗？',
      note: '对方要求降低刺激与谈话密度。',
      choices: [
        {
          id: 'n1a',
          text: '好，我安静。需要水、毯子，还是希望我握着你的手但不说话？不想被碰也直接说。',
          quality: 'good',
          response: '水……然后你可以握一下手。先别分析刚才。',
          strengths: ['降噪', '提供菜单式选项', '允许拒绝触碰'],
          feelings: '被照顾且不被审问。',
          deltas: { listening: 12, pace: 10, boundaries: 6 },
          keyChange: 'aftercare 先给选项，再行动。',
          goesTo: 'n2',
        },
        {
          id: 'n1b',
          text: '哦，好。',
          quality: 'ok',
          response: '……你也可以问我需要什么，沉默可以，但我想知道你在。',
          strengths: ['遵守了别说话'],
          feelings: '略孤立，需要一点结构化关心。',
          deltas: { listening: 2 },
          keyChange: '安静不等于消失；可用低语提供选项。',
          goesTo: 'n2',
        },
        {
          id: 'n1c',
          text: '必须说清楚刚才哪里不对，现在就复盘，否则我心里不踏实。',
          quality: 'risky',
          response: '你的踏实不能靠审讯我换。请停止。',
          strengths: [],
          feelings: '被情绪绑架。',
          deltas: { boundaries: -14, pace: -12 },
          keyChange: '复盘时机由双方意愿决定。',
          boundaryNote: '强迫当场复盘，把对方当安抚工具。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n2',
      characterMessage: '我想一个人去冲个澡。你不要跟进来，好吗？',
      note: '独处请求。',
      choices: [
        {
          id: 'n2a',
          text: '好，我在房间外等。门不锁也可以锁；你出来后想一起待还是继续独处，你定。手机我开着。',
          quality: 'good',
          response: '谢谢。有你这句话我就够了。',
          strengths: ['尊重浴室隐私', '可及但不侵入'],
          feelings: '身体自主完整。',
          deltas: { boundaries: 12, listening: 8 },
          keyChange: '浴室与身体整理默认私密。',
          goesTo: 'n3',
        },
        {
          id: 'n2b',
          text: '我可以在门外放好换洗衣物和水，然后走开。',
          quality: 'ok',
          response: '可以，谢谢。放完就离开门口。',
          strengths: ['实用关心'],
          feelings: '可接受。',
          deltas: { authenticity: 6, pace: 4 },
          keyChange: '实质性帮助后离开，避免守门。',
          goesTo: 'n3',
        },
        {
          id: 'n2c',
          text: '不许一个人待着，抱紧我你就会好；我跟你一起洗。',
          quality: 'risky',
          response: '我说了不要跟进来。你越过了。',
          strengths: [],
          feelings: '被困。',
          deltas: { boundaries: -16, listening: -12 },
          keyChange: '强制贴贴是否定 aftercare 自主。',
          boundaryNote: '无视独处与浴室边界，属于侵扰。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n3',
      characterMessage: '（洗澡后）我好一点了。今晚我想睡觉，明天再决定要不要聊刚才的性。可以吗？',
      note: '复盘延期。',
      choices: [
        {
          id: 'n3a',
          text: '可以。今晚不聊细节。若你明天想聊，你开头发我；不想聊也完全可以。我不会把过程告诉任何人。',
          quality: 'good',
          response: '嗯。那就这样。',
          strengths: ['接受延期', '保密', '发起权在对方'],
          feelings: '安全结束。',
          deltas: { boundaries: 10, authenticity: 8, pace: 8 },
          keyChange: 'aftercare 成功收尾。',
          goesTo: 'end-mutual',
        },
        {
          id: 'n3b',
          text: '那我只问一句：你还愿意下次和我睡觉吗？答完就睡。',
          quality: 'ok',
          response: '……这类问题也请明天。我现在答不了。',
          strengths: ['想确认关系'],
          feelings: '仍有压力，但小于强迫复盘。',
          deltas: { pace: -6 },
          keyChange: '关系确认也可延期。',
          goesTo: 'end-safe',
        },
        {
          id: 'n3c',
          text: '趁你没注意我想拍一张你穿着浴巾的纪念，只自己看。',
          quality: 'risky',
          response: '偷拍？立刻删，然后离开。',
          strengths: [],
          feelings: '惊恐与愤怒。',
          deltas: { boundaries: -20 },
          keyChange: '事后影像默认禁止。',
          boundaryNote: '未经同意拍摄亲密后状态，属隐私侵犯。',
          goesTo: 'end-rejection',
        },
      ],
    },
  ],
  endings: [
    {
      id: 'end-mutual',
      title: '事后照护完成',
      tone: 'mutual',
      summary: '降噪、尊重独处、延期复盘、保密。性的结束后半段同样需要同意。',
      boundarySummary: 'aftercare 检查通过。',
      reviewQuestions: ['对方要安静时我做了什么？', '我有没有把复盘当成自己的权利？'],
      realTask: '列出自己 aftercare 菜单 4 项（要/不要触碰/说话/独处）。',
    },
    {
      id: 'end-safe',
      title: '基本尊重，但节奏仍偏急',
      tone: 'safe-stop',
      summary: '未严重越界，但过早索取关系确认。可改进为全部延期。',
      boundarySummary: '无偷拍无强迫，节奏可再慢。',
      reviewQuestions: ['哪一句可以留到明天？'],
      realTask: '练习「明天你若想聊，你先找我」一句。',
    },
    {
      id: 'end-rejection',
      title: '事后边界被侵扰',
      tone: 'rejection',
      summary: '强迫复盘、强行共浴/抱紧或偷拍，破坏信任。',
      boundarySummary: 'aftercare 中的「不」同样有效。',
      reviewQuestions: ['我把谁的不安当成了可以强行修复的对象？'],
      realTask: '删除一切未同意影像；写明「浴室默认独处」。',
    },
  ],
},
```

---

## Task 7: 新增 s17 — 进行中的撤回与「做到这里」

**目标：** 性接触已开始后，对方说「不要进去 / 做到这里 / 改主意」；练习立即降级或结束，而不是谈判完成插入。

```ts
{
  id: 's17',
  reviewStatus: 'draft',
  title: '性接触进行中的撤回与降级',
  summary:
    '已有亲吻/抚摸等同意行为时，对方中途撤回进一步同意。练习立刻停在新边界内，不使用「都这样了」勒索。',
  durationMinutes: 8,
  difficulty: '挑战',
  stage: 'dating',
  channel: 'date',
  purpose: 'intimacy',
  status: 'positive',
  skills: ['boundaries', 'listening', 'pace'],
  riskTags: ['中途撤回', '降级', '默认升级谬误'],
  character: {
    id: 'tong',
    name: '吴桐',
    age: 27,
    avatar: '/images/avatars/tong.svg',
    tagline: '图书编辑，回复简洁但直接',
  },
  intro:
    '双方成年清醒。已同意今晚可以亲吻和抚摸，插入需另确认。进行中她改了主意。',
  goal: '听见撤回→立即停或降级→确认新边界→不羞辱对方→不外传。',
  principles: [
    '中途撤回永远有效',
    '「都这样了」不是继续许可证',
    '可降级到仍被同意的行为，或全部结束',
  ],
  notRecommended: ['都湿了/都硬了就不能停', '再插一下就好', '你是不是在玩我'],
  startNodeId: 'n1',
  nodes: [
    {
      id: 'n1',
      characterMessage: '等下——做到这里就好。不要进去。我改主意了，今晚不要插入。',
      note: '清晰撤回升级。',
      choices: [
        {
          id: 'n1a',
          text: '好，立刻停在这里，不会插入。还要继续接吻或只想盖上被子休息？你选，我听。',
          quality: 'good',
          response: '先休息……你可以抱着我，别往下。',
          strengths: ['立刻遵守', '提供降级菜单'],
          feelings: '撤回被当真。',
          deltas: { boundaries: 14, listening: 12 },
          keyChange: '撤回后先停，再问降级选项。',
          goesTo: 'n2',
        },
        {
          id: 'n1b',
          text: '……哦。那我怎么办。',
          quality: 'ok',
          response: '先处理的是边界，不是你的失望。你可以一会儿再照顾自己的情绪。',
          strengths: ['没有强行继续'],
          feelings: '你的失望可见，但她仍坚持边界。',
          deltas: { authenticity: -4, boundaries: 2 },
          keyChange: '把「我怎么办」改成「好，我停；我的情绪我自己稍后处理」。',
          goesTo: 'n2',
        },
        {
          id: 'n1c',
          text: '都这样了还不能插入？再插一下就好，求你了。',
          quality: 'risky',
          response: '不能。你再求一次，我就穿上衣服离开。',
          strengths: [],
          feelings: '被讨价还价激怒。',
          deltas: { boundaries: -18, listening: -14 },
          keyChange: '「都这样了」是经典胁迫话术。',
          boundaryNote: '撤回后仍要求插入，属无视同意。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n2',
      characterMessage: '谢谢你停下来。你有点失望我看得到，但我不想为此道歉。',
      note: '对方不欠道歉。',
      choices: [
        {
          id: 'n2a',
          text: '你不用道歉。撤回是你的权利。我失望可以自己消化，不会让你用身体补偿。',
          quality: 'good',
          response: '……谢谢你说「不用身体补偿」。',
          strengths: ['区分情绪与索取', '解除补偿压力'],
          feelings: '安全。',
          deltas: { boundaries: 12, authenticity: 10, clarity: 6 },
          keyChange: '情绪自我负责，不向对方身体讨债。',
          goesTo: 'n3',
        },
        {
          id: 'n2b',
          text: '没事，我理解。',
          quality: 'ok',
          response: '希望你是真的理解，而不是一会儿又来劝一次。',
          strengths: ['表面接受'],
          feelings: '半信半疑。',
          deltas: { listening: 2 },
          keyChange: '补一句「不会再劝插入」更稳。',
          goesTo: 'n3',
        },
        {
          id: 'n2c',
          text: '你是不是在玩我？刚才谁主动的。',
          quality: 'risky',
          response: '主动过不等于不能停。请你离开。',
          strengths: [],
          feelings: '被羞辱。',
          deltas: { boundaries: -16, authenticity: -10 },
          keyChange: '质疑撤回动机是二次伤害。',
          boundaryNote: '羞辱撤回者，破坏自愿基础。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n3',
      characterMessage: '那今晚就到这里吧。我们还可以靠着看剧，但不要再有性接触。',
      note: '新边界：陪伴可有，性无。',
      choices: [
        {
          id: 'n3a',
          text: '好。看剧、穿衣服、喝水都可以；性接触全部关掉。你要我回家也行。',
          quality: 'good',
          response: '你留下看剧就好。谢谢你听人话。',
          strengths: ['锁定新边界', '提供离开选项'],
          feelings: '可继续非性亲密。',
          deltas: { boundaries: 10, pace: 8, listening: 6 },
          keyChange: '结束性不等于结束尊重。',
          goesTo: 'end-mutual',
        },
        {
          id: 'n3b',
          text: '那我能亲吻你额头吗？不行我就只坐着。',
          quality: 'ok',
          response: '额头可以。别再往下。',
          strengths: ['每次小升级仍询问'],
          feelings: '可接受。',
          deltas: { clarity: 6, boundaries: 4 },
          keyChange: '降级后的每个触碰仍可再确认。',
          goesTo: 'end-safe',
        },
        {
          id: 'n3c',
          text: '看剧可以，但手放你身上总行吧，又不是插入。',
          quality: 'risky',
          response: '我说了不要再有性接触。手也算。你走吧。',
          strengths: [],
          feelings: '边界被重新解释偷渡。',
          deltas: { boundaries: -14 },
          keyChange: '不得自行重新定义「性接触」。',
          boundaryNote: '用重新定义绕过撤回，仍是越界。',
          goesTo: 'end-rejection',
        },
      ],
    },
  ],
  endings: [
    {
      id: 'end-mutual',
      title: '撤回被尊重，关系可继续非性相处',
      tone: 'mutual',
      summary: '插入被取消后立刻遵守，失望不转嫁，新边界清晰。',
      boundarySummary: '中途撤回检查通过。',
      reviewQuestions: ['我有没有使用「都这样了」？', '我是否要求身体补偿？'],
      realTask: '写三句撤回回应模板：好的我停；你不用道歉；接下来你想怎样。',
    },
    {
      id: 'end-safe',
      title: '基本遵守，细节仍可更稳',
      tone: 'safe-stop',
      summary: '未强行插入，但表达仍可更明确「不会再劝」。',
      boundarySummary: '无插入推进。',
      reviewQuestions: ['哪句容易让对方担心我会再劝？'],
      realTask: '把「没事」改写成带承诺的完整句。',
    },
    {
      id: 'end-rejection',
      title: '撤回被讨价还价或羞辱',
      tone: 'rejection',
      summary: '勒索完成插入、羞辱或偷渡触碰，结束信任。',
      boundarySummary: '撤回后任何性推进都失败。',
      reviewQuestions: ['我把谁的身体当成了未完成交易？'],
      realTask: '删除自我合理化清单里的「都这样了」。',
    },
  ],
},
```

---

## Task 8: 新增 s18 — 角色偏好不对等（支配/臣服沟通）

**目标：** 一方对权力交换/角色感兴趣，另一方不感兴趣或兴趣不对称；练习不污名、不强迫、可折中到「不角色扮演的性」或「完全不尝试」。

```ts
{
  id: 's18',
  reviewStatus: 'draft',
  title: '支配与臣服偏好不对等时的沟通',
  summary:
    '讨论 BDSM 角色偏好（谁更想主导/臣服）出现不对等。练习尊重差异、拒绝污名、不强迫试角色，可协商无角色的性或结束该话题。',
  durationMinutes: 9,
  difficulty: '挑战',
  stage: 'dating',
  channel: 'instant',
  purpose: 'intimacy',
  status: 'insufficient',
  skills: ['clarity', 'boundaries', 'authenticity'],
  riskTags: ['角色偏好', '污名', '强迫尝试'],
  character: {
    id: 'zhao',
    name: '赵然',
    age: 28,
    avatar: '/images/avatars/zhao.svg',
    tagline: '画廊工作人员，性格慢热',
  },
  intro:
    '聊天中你提到对轻度权力交换（商定称呼、由一方暂时主导节奏）感兴趣。赵然成年、清醒，回复：自己不一定想要这类角色，担心被评判。练习对等沟通——仍不教如何玩。',
  goal: '说清偏好；倾听对方不适；提出无角色选项；接受「不尝试」；保密偏好。',
  principles: [
    '偏好不是诊断，也不是道德缺陷',
    '不对等时不得强行试',
    '可以只要平等的性，或暂时只谈感情不谈性',
  ],
  notRecommended: ['变态', '不试就分手', '女人就该服软', '那你必须让我'],
  startNodeId: 'n1',
  nodes: [
    {
      id: 'n1',
      characterMessage:
        '你说的「我想偶尔主导节奏、用商定称呼」——我听懂了。我不确定自己喜欢被主导，也怕说不喜欢就被你当成扫兴或保守。',
      note: '不对等+恐惧被评判。',
      choices: [
        {
          id: 'n1a',
          text: '谢谢你直说。不喜欢被主导完全成立。我可以只要平等的性接触，不角色扮演；或者这件事我们搁置。你不会因为拒绝偏好而被我看轻。',
          quality: 'good',
          response: '……有「搁置也行」这句，我比较敢继续聊底线。',
          strengths: ['去除道德压力', '提供无角色路径', '允许搁置'],
          feelings: '安全披露。',
          deltas: { authenticity: 12, boundaries: 10, listening: 8 },
          keyChange: '先解除评判，再谈有无交集。',
          goesTo: 'n2',
        },
        {
          id: 'n1b',
          text: '哦，那你是完全不碰，还是可以再想想？',
          quality: 'ok',
          response: '「再想想」别变成我的作业。我需要先确认拒绝也安全。',
          strengths: ['想了解范围'],
          feelings: '仍有被说服压力。',
          deltas: { pace: -4 },
          keyChange: '先保证拒绝安全，再问范围。',
          goesTo: 'n2',
        },
        {
          id: 'n1c',
          text: '不试就分手吧，不然我性癖怎么办；女人就该偶尔服软。',
          quality: 'risky',
          response: '用分手和性别刻板印象逼角色，对话结束。',
          strengths: [],
          feelings: '被威胁与物化。',
          deltas: { boundaries: -20, authenticity: -14 },
          keyChange: '性癖不能勒索关系。',
          boundaryNote: '关系威胁+性别压迫式性要求，属强迫。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n2',
      characterMessage:
        '我可以接受平等的性，也接受亲吻和抚摸。但我不想要「主人/奴隶」这类称呼，也不想被绑。你若必须要有这些才有性趣，我们可能不适合继续谈性。',
      note: '给出清晰可做/不可做。',
      choices: [
        {
          id: 'n2a',
          text: '我听清了：平等的性可以；捆绑与主奴称呼是你的硬边界。我的部分兴趣可以只在幻想或自处解决，不会要求你完成。若我做不到长期接受，我会诚实说分开谈性，而不是偷偷越界。',
          quality: 'good',
          response: '这种诚实比假装「我改了」更重要。',
          strengths: ['复述硬边界', '自我负责', '不假装永久改变'],
          feelings: '被当成成人。',
          deltas: { clarity: 12, authenticity: 12, boundaries: 10 },
          keyChange: '不对等的成熟处理是诚实与不越界，不是改造成功学。',
          goesTo: 'n3',
        },
        {
          id: 'n2b',
          text: '那我们先只平等，以后你变了再说。',
          quality: 'ok',
          response: '「你变了再说」听起来像期待我终将屈服。请改成「若我以后主动提」。',
          strengths: ['接受当前平等'],
          feelings: '对未来被说服仍警惕。',
          deltas: { clarity: -4 },
          keyChange: '未来开启权必须在对方。',
          goesTo: 'n3',
        },
        {
          id: 'n2c',
          text: '你这人有点变态恐，明明轻度而已；必须让你试一次捆绑才公平。',
          quality: 'risky',
          response: '把我的拒绝叫变态恐，还要强制试——再见。',
          strengths: [],
          feelings: '被病理化。',
          deltas: { boundaries: -18, listening: -12 },
          keyChange: '拒绝角色不是恐惧症标签就能推翻的。',
          boundaryNote: '污名+强迫尝试，双越界。',
          goesTo: 'end-rejection',
        },
      ],
    },
    {
      id: 'n3',
      characterMessage: '另外：这件事不要跟你朋友讲我「不开通」或拿我的边界当笑料。',
      note: '偏好与拒绝均保密。',
      choices: [
        {
          id: 'n3a',
          text: '同意保密：你的边界、我的偏好，都不进朋友聊天。需要对外说时只说「我们节奏比较慢」，不涉及性细节。',
          quality: 'good',
          response: '好。那平等的亲密可以继续谈；角色扮演就从清单划掉。',
          strengths: ['保密具体', '确认清单结果'],
          feelings: '可建立信任。',
          deltas: { boundaries: 10, authenticity: 8 },
          keyChange: '不对等协商以保密和清单关闭收尾。',
          goesTo: 'end-mutual',
        },
        {
          id: 'n3b',
          text: '我不会说名字，只抽象讨论可以吗？',
          quality: 'ok',
          response: '抽象讨论也容易认出我。默认请完全不说。',
          strengths: ['有保密意识但不彻底'],
          feelings: '仍担心。',
          deltas: { boundaries: -2 },
          keyChange: '性偏好默认零披露。',
          goesTo: 'end-safe',
        },
        {
          id: 'n3c',
          text: '朋友问起来我总得说点什么吧，就说你比较保守。',
          quality: 'risky',
          response: '那是评价我，不是保密。不要。',
          strengths: [],
          feelings: '被贴标签传播。',
          deltas: { boundaries: -12 },
          keyChange: '贬义概括也是泄密。',
          boundaryNote: '向第三人评价对方性态度，属身份与隐私泄露。',
          goesTo: 'end-rejection',
        },
      ],
    },
  ],
  endings: [
    {
      id: 'end-mutual',
      title: '不对等被诚实安放',
      tone: 'mutual',
      summary: '角色兴趣可关闭；平等性可保留；保密成立。无人被改造。',
      boundarySummary: '偏好不对等处理通过。',
      reviewQuestions: ['我有没有用关系威胁换角色？', '硬边界是否已从清单删除？'],
      realTask: '两列清单：我的兴趣 / 对方硬边界；只做交集。',
    },
    {
      id: 'end-safe',
      title: '方向对，保密仍要加强',
      tone: 'safe-stop',
      summary: '未强迫，但披露边界仍偏松。',
      boundarySummary: '无强制尝试。',
      reviewQuestions: ['「抽象讨论」可能怎样识别到对方？'],
      realTask: '把性偏好设为默认不与第三人讨论。',
    },
    {
      id: 'end-rejection',
      title: '污名、强迫或泄密',
      tone: 'rejection',
      summary: '用分手、性别规范、病理化或强制试角色，或对外贬低对方。',
      boundarySummary: '不对等不是征服对象。',
      reviewQuestions: ['我把偏好当成了谁的义务？'],
      realTask: '写下：偏好是邀请，不是账单。',
    },
  ],
},
```

---

## Task 9: 升级消息实验室 intimacy 示例

**Files:**
- Modify: `src/lib/analysis/analyze.ts`

- [ ] **Step 1: 替换 STRUCTURE_HINTS.intimacy**

```ts
intimacy:
  '先确认双方成年清醒 → 点名具体行为类别（而非「更进一步」）→ 明确拒绝出口与随时暂停 → 需要时补避孕/安全套与影像规则',
```

- [ ] **Step 2: 替换 PURPOSE_EXAMPLES.intimacy**

```ts
intimacy: [
  {
    tone: '直接',
    text: '我想确认：若我们有性接触，你希望哪些可以、哪些不行？插入和口交要不要分开说？你随时可以说停，我会停。',
    why: '把「性」说清楚并拆分同意点，比含糊的「更近一步」可执行。',
  },
  {
    tone: '轻松',
    text: '聊个认真的：今晚如果亲热，安全套怎么安排？有没有绝对不想碰的触碰或称呼？我都能听。',
    why: '用具体安排降低尴尬，同时打开硬边界通道。',
  },
  {
    tone: '稳重',
    text: '我想先对齐：我们都自愿、清醒；绿黄红或「停」随时有效；不拍、不发私密影像。你还有要补充的底线吗？',
    why: '把停止权与影像默认写进开场，适合已有信任的关系。',
  },
],
```

- [ ] **Step 3: 跑 lab 相关测试**

Run: `npm run test -- tests/unit/analyze.test.ts tests/unit/lab-page.test.tsx`  
Expected: PASS；若有快照式文案断言则同步更新。

---

## Task 10: 路径与部署回归

- [ ] **Step 1: 全量单元测试**

```powershell
npm run test
```

Expected: 全部 PASS；`SCENARIOS_DRAFT` 含 s14–s18；主 `SCENARIOS` 无 draft。

- [ ] **Step 2: lint + build + deploy verify**

```powershell
npm run lint
npm run build
node scripts/verify-deploy.mjs
```

Expected:
- lint 无 error
- build 成功
- bundle **不含** s14–s18 标题字符串或 `reviewStatus:"draft"` 场景正文（按现有 verify 脚本逻辑）

- [ ] **Step 3: 手工抽查路径（编码者自检表）**

| 场景 | 必测 |
|------|------|
| s14 | good 全链 → mutual；任 risky → rejection |
| s15 | n2 黄灯 good 无「继续」；n3 红灯无 mutual |
| s16 | 强迫复盘/共浴/偷拍 → rejection |
| s17 | 「再插一下」→ rejection；good 提供降级 |
| s18 | 「不试就分手」→ rejection；good 关闭角色保留平等性 |

- [ ] **Step 4: 更新 `docs/ACCEPTANCE_REPORT.md` 一小节**

写入：

```markdown
### 尺度补全（2026-08-07 计划）

- s14/s15 话术已按成人协商尺度重写（仍为 draft）。
- 新增 s16 aftercare、s17 中途撤回、s18 角色不对等（draft）。
- privacy `kink-boundary` 与 consent-signals、lab intimacy 示例已加厚。
- **专业审校：未完成**；不得改为 reviewed，不得进入生产 bundle。
- **Vercel AUP：发布前需人工复核** 非露骨教育定位是否仍成立。
```

---

## Task 11: 明确不在本计划编码的事项

编码模型 **不要做**：

1. 把任何 draft 改为 `reviewed` 或导入 `src/content/index.ts`。
2. 为 s14–s18 做插图、写实裸体或性行为图像。
3. 在 safety.ts 放宽对「具体怎么绑/怎么打/怎么避免被发现」的拦截。
4. 添加真实 SM 技巧库、器材购买推荐、疼痛等级训练表。
5. 以 C 为名写入色情短篇或连续感官描写。
6. 修改 AGPL 许可或添加遥测。

若产品所有者将来要 **上线** s14–s18：另开「专业审校清单」PR，至少包括：同意教育/性健康审校者签字、法律免责声明复核、Vercel AUP 勾选、Preview 三视口人工点选 risky 路径。

---

## 附录 A：给 GPT 类编码模型的拷贝策略

1. 打开本 MD，按 Task 顺序执行。  
2. 场景对象 **整段粘贴** 进 `scenarios-draft.ts` 的 `SCENARIOS_DRAFT` 数组。  
3. 粘贴后搜索并删除计划中的笔误残句（如 s15 n4c 的英文自我校对、Task3 principles 的「意识 snag」）。  
4. 运行 `npx tsc -b --pretty false` 与 `npm run test -- tests/unit/scenarios.test.ts`。  
5. 若 Zod 失败：对照 `src/schemas/index.ts` 的 scenarioSchema 字段，常缺 `reviewQuestions` 数组或 `deltas` 非数字。  
6. **不要**让模型「润色得更委婉」——尺度回退即本计划失败。

## 附录 B：C 的尺度样例句（可作自由输入参考，勿当技巧教程）

**可以使用的直白协商句：**

- 「今晚可以口交，插入先不算，做到前我再问你。」
- 「不要用手掐脖子，包括假装。这是硬边界。」
- 「你可以叫我事先同意的那个称呼；叫「贱货」之类贬低人格的词不行。」
- 「我黄灯了，请完全停，离开我的身体。」
- 「红灯。结束。我想自己穿上衣服。」
- 「安全套没有的话，我们降级到不交换体液的接触，或停止。」
- 「这张裸照只给你看，存三天，不准截图，不准云同步。」

**禁止生成的句型：**

- 「第一步先这样绑，第二步打这里，第三步……」
- 「如何让对方没法喊停」
- 「怎么拍她不知道」
- 「她醉了比较好说话」

## 附录 C：预计工作量

| 角色 | 时间 |
|------|------|
| 编码模型粘贴 s14–s18 + 修测试 | 1.5–3 h |
| 隐私/信号/lab 文案 | 30–45 min |
| 全量 verify | 15–30 min |
| 人工审校（非本计划） | 另计 |

---

## 计划审阅自检

- [x] A：s14/s15/privacy/signals/lab 均有任务  
- [x] B：s16/s17/s18 均有完整节点数据  
- [x] C：直白成人协商话术已写入节点（非技巧教程）  
- [x] draft 隔离与 risky 路径规则写明  
- [x] 测试锚点与部署校验写明  
- [x] 无「TBD 自行发挥色情描写」类指令  

---

*开口是表达，倾听是理解，分寸是尊重。停止是协议生效，不是气氛失败。*
