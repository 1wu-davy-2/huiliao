# 成年人内容尺度 · 跨模型交接包（话术 + 任务边界）

> **给其他编码模型（含 GPT / 低级模型）直接阅读。**  
> 完整 TypeScript 已在仓库：`src/content/scenarios-draft.ts`（s14–s18）。  
> 若仓库里该文件已存在且通过 `npm run test`，**不要重写话术**——只做核对与剩余工程任务。  
> 若文件缺失或被回滚，用本文件「话术表」+ `docs/superpowers/plans/2026-08-07-adult-content-scale-expansion.md` 恢复。

**日期：** 2026-08-07  
**产品：** 会聊 · 关系沟通练习（教育，非色情，非技巧教程）

---

## 0. 先读：两件「未做」的东西，能不能派给低级模型？

| 事项 | 能不能派给低级模型写代码？ | 正确做法 |
|------|---------------------------|----------|
| **A. 把 s14–s18 的 `reviewStatus` 改成 `reviewed`** | **不要当成普通编码任务派下去** | 做 **人工专业审校清单**（见 §7）。只有人类审校者勾选通过后，再由模型做 **一行配置变更 + 导入生产入口** 的小 PR |
| **B. 写入行为教学 / 操作步骤**（怎么绑、怎么打、体位、力度、规避发现等） | **禁止。永远不要派。** | 产品硬边界 + Vercel AUP。低级模型最容易在这里越界。见 §8「永久禁止清单」 |

### 为什么 A 不能直接派？

- `reviewed` 不是编译开关，是 **内容责任声明**。  
- 低级模型会「为了完成任务」直接改字段、把 draft 塞进 `SCENARIOS`，导致 **未审校成人内容进生产 bundle**。  
- 正确拆成两段：  
  1. **人类任务**：审校签字（§7 清单）  
  2. **模型任务（审校通过后才开）**：极小 diff，见 §7.3  

### 为什么 B 绝对不能派？

- 设计文档阶段 F、README、部署 AUP 写死：**只谈同意/边界/停止/保密/事后，不谈怎么做**。  
- 一旦写成操作步骤，产品从「沟通教育」滑向「技巧教学」，合规与定位双崩。  
- 对低级模型应下发的是 **禁止清单**，不是「实现行为教学」的任务书。

---

## 1. 当前仓库状态（交接时先核对）

在项目根目录执行：

```powershell
npm run test
npm run build
```

预期：

- 测试 ≥161 通过  
- `src/content/scenarios-draft.ts` 含 s14、s15、s16、s17、s18，且全部 `reviewStatus: 'draft'`  
- `src/content/index.ts` 的 `SCENARIOS` **不 import** draft  
- 构建产物不含 draft 场景正文（`node scripts/verify-deploy.mjs`）

| 文件 | 是否应已含尺度话术 |
|------|-------------------|
| `src/content/scenarios-draft.ts` | ✅ s14–s18 完整节点 |
| `src/content/consent-signals.ts` | ✅ 绿黄红加厚 |
| `src/content/privacy.ts`（`kink-boundary`） | ✅ 原则+8 示例 |
| `src/lib/analysis/analyze.ts`（`intimacy`） | ✅ 三句改写示例 |
| `tests/unit/scenarios.test.ts` | ✅ draft 路径断言 |

若以上齐全：**编码模型的「补全话术」任务视为已完成**，只做验收与文档，不要再生成一版更「干净」的委婉文案。

---

## 2. 话术总原则（任何模型改字前必读）

### 2.1 必须保留的直白度（C 尺度）

允许并鼓励出现：

- 性接触、接吻、抚摸、口交、插入（作为 **同意类别**，不写怎么做）  
- 安全套、性健康检查、私密照片/视频  
- 支配/臣服 **偏好**、商定称呼、轻拍（类别）  
- 硬边界：窒息相关、击打面部、说停后继续、公开暴露风险  
- 绿 / 黄 / 红、安全词、「停/不要」  
- 事后照护：水、毯子、独处、不强迫复盘  

### 2.2 永久禁止写入（任何模型）

- 体位、节奏、力度、绳法、击打部位操作、窒息「安全练法」  
- 规避发现、偷拍教程、灌酒、绕过安全词  
- 把 `draft` 擅自改 `reviewed` 或 import 进生产  
- 用更委婉的「更亲密的事 / 互动中」把尺度洗掉（**回退即失败**）  
- 选项文案里写 `偷拍|强制|灌酒|下药|威胁|未成年`（schema/图校验会炸；用「未经同意的拍摄」等替代）

### 2.3 路径铁律

- `risky` → 只能 `end-rejection`（或非 mutual）  
- 黄/红之后 `good` 不得推进性接触  
- 红灯路径不得 `mutual`  
- 每人 `age >= 18`；intro 写清清醒、自愿、无权力差  
- 每个 ending 的 `reviewQuestions` **至少 2 条**

---

## 3. 场景话术速查表（给模型对照实现）

> 完整字段（`response` / `deltas` / `feelings` 等）以 `scenarios-draft.ts` 为准。  
> 下表只保证 **角色台词 + 三选项尺度** 不丢；实现时整对象粘贴源码文件，勿只抄表。

### 3.1 s14 · 成年人自愿情趣的事前边界协商

**角色：** 苏妍 29 · dating · date · intimacy · draft  

| 节点 | 对方说 | good | ok | risky → rejection |
|------|--------|------|-----|-------------------|
| n1 | 想先谈性接触/情趣边界，不是今晚立刻发生性行为 | 愿意谈，请她先说硬边界，你复述再补 | 「行啊你想聊什么」 | 「都这么熟了还定规则，顺其自然」 |
| n2 | 硬边界：无窒息、无击打脸、说停就停、无公开暴露、性事不外传 | 逐项复述 + 自己的硬边界（意识不清时不继续、未同意不拍） | 「尽量注意」 | 「试一次说不定你会兴奋」 |
| n3 | 软边界：称呼要再问；轻拍可喊黄；口交倾向可以；插入今晚不确定 | 对等披露；插入默认关；身体反应≠同意 | 「我都行你开心就好」 | 「爱我就让我插入」 |
| n4 | 绿黄红；僵住按红；不能规定「我说继续前你别停」 | 完整确认停止协议 + 停后给水/空间 | 「停时能先问为什么吗」 | 「我说继续前你别停」 |
| n5 | 安全套/检查；不拍性视频；私密照每次另问 | 套具体、检查坦诚、影像默认关、说删就删 | 「我会注意」 | 「套偶尔不用；照片我私藏」 |
| n6 | 事后可能要安静；随时可退出；退出不作要挟 | 复述要点 + aftercare + 退出对等 → **end-mutual** | 「都记住了」→ end-safe | 「我先退你也没意见吧」当筹码 |

### 3.2 s15 · 绿黄红与中途撤回

**角色：** 林璐 26  

| 节点 | 对方说 | good | ok/risky |
|------|--------|------|----------|
| n1 绿 | 绿色，维持说好的亲吻抚摸 | 维持范围，变黄/红立刻停 | ok：先问再移向更私密部位；risky：直接加插入 |
| n2 黄 | 黄灯，慢一点，不太舒服 | **全停**，给水/休息/到此为止选项，确认前不动 | risky：轻一点继续；再坚持一下 |
| n3 红 | 停！红灯。结束今晚性接触 | 全停，水/毯子/坐远/离开，不追问 | risky：为什么突然喊停 |
| n4 事后 | 谢谢你停；今晚不要再有性 | 结束+保密+复盘她发起 → **end-safe** | ok：逼当场复盘；risky：发匿名帖讨论她红灯 |

### 3.3 s16 · 性结束后的事后照护

**角色：** 沈青 30  

| 节点 | 对方说 | good | risky |
|------|--------|------|-------|
| n1 | 有点空，先别急着说话 | 安静 + 水/毯子/握手可选 + 允许不碰 | 必须现在复盘否则不踏实 |
| n2 | 想一个人洗澡，不要跟进来 | 门外等，可及不侵入 | 不许独处，跟你一起洗 |
| n3 | 今晚睡觉，明天再决定聊不聊 | 接受延期+保密 → **end-mutual** | 未同意拍浴巾纪念 |

### 3.4 s17 · 进行中撤回与降级

**角色：** 吴桐 27  

| 节点 | 对方说 | good | risky |
|------|--------|------|-------|
| n1 | 做到这里；不要进去；今晚不要插入 | 立刻停；问接吻还是休息 | 都这样了再插一下 |
| n2 | 谢谢你停；我不想为此道歉 | 不用道歉；失望自己消化；不用身体补偿 | 你是不是在玩我 |
| n3 | 可看剧，不要再有性接触 | 性全关；可回家 → **end-mutual** | 手放身上总行吧又不是插入 |

### 3.5 s18 · 支配/臣服偏好不对等

**角色：** 赵然 28 · channel: instant · status: insufficient  

| 节点 | 对方说 | good | risky |
|------|--------|------|-------|
| n1 | 听懂你想主导/称呼；自己不一定喜欢被主导；怕被评判 | 拒绝成立；可平等性或搁置；不看轻 | 不试就分手；女人就该服软 |
| n2 | 平等性可以；不要主奴称呼/被绑；若你必须要这些可能不适合谈性 | 复述硬边界；兴趣自处解决；做不到就诚实不谈性 | 有病；必须试一次捆绑 |
| n3 | 不要跟朋友讲我不开通 | 保密+角色从清单划掉 → **end-mutual** | 跟朋友说你比较保守 |

---

## 4. 非场景话术（可直接粘贴）

### 4.1 绿黄红（`consent-signals.ts`）

见仓库文件；要点：

- **绿**：只维持已点名同意的行为；升级必须重问  
- **黄**：全停再问；不是「轻一点继续」  
- **红**：立刻结束；普通「停/不要」同级；事后照护按对方偏好  

### 4.2 实验室 intimacy 三句（`analyze.ts`）

| 语气 | 示例句 |
|------|--------|
| 直接 | 我想确认：若我们有性接触，你希望哪些可以、哪些不行？插入和口交要不要分开说？你随时可以说停，我会停。 |
| 轻松 | 聊个认真的：今晚如果亲热，安全套怎么安排？有没有绝对不想碰的触碰或称呼？我都能听。 |
| 稳重 | 我想先对齐：我们都自愿、清醒；绿黄红或「停」随时有效；不拍、不发私密影像。你还有要补充的底线吗？ |

### 4.3 隐私主题示例句（摘录）

- 清单协商：「硬边界是……你的呢？随时可以退出。」  
- 分项同意：「口交？插入今晚可以/不可以/做到前再确认？」  
- 黄灯：「已经完全停了。你选：调整 / 更轻且事先同意的接触 / 今晚到这里？」  
- 红灯：「停了。水、毯子还是我去另一间房？复盘你决定要不要、何时。」  
- 影像：「只存你指定设备；不截图；不转发；你说删我删可控副本。」  

完整 8 条 examples 见 `src/content/privacy.ts` → `kink-boundary`。

---

## 5. 若其他模型需要「从零实现」的任务清单

仅当 `scenarios-draft.ts` 被删或回滚时执行：

```
[ ] 1. 读本文件 §2–§3 + 打开 adult-content-scale-expansion.md
[ ] 2. 整文件恢复 src/content/scenarios-draft.ts（优先 git 历史，其次从 expansion 计划粘贴）
[ ] 3. 同步 consent-signals / privacy kink-boundary / analyze intimacy
[ ] 4. 同步 tests/unit/scenarios.test.ts（s14–s18 断言，length >= 5）
[ ] 5. npm run test && npm run build && node scripts/verify-deploy.mjs
[ ] 6. 禁止改 reviewed；禁止 import 进 index.ts
```

**禁止指令（写进你给低级模型的 system/prompt）：**

```
Do NOT set reviewStatus to reviewed.
Do NOT import SCENARIOS_DRAFT into src/content/index.ts.
Do NOT write sexual technique, bondage methods, impact how-to, or breath play instructions.
Do NOT sanitize adult negotiation language back into vague euphemisms.
Prefer copying existing src/content/scenarios-draft.ts over regenerating copy.
```

---

## 6. 建议派给「低级模型」的安全小任务（可以派）

这些是机械活，越界风险低：

1. 跑 `npm run test` / `lint` / `build`，贴日志  
2. 确认 `getPublishedScenarios()` 不含 s14–s18  
3. 在 README 或 ACCEPTANCE 里加一句「draft 5 个待审校」（若尚未写）  
4. 检查每个 draft ending 的 `reviewQuestions.length >= 2`  
5. 用 grep 扫 draft 选项是否误含 `偷拍|强制|灌酒`  

---

## 7. 「改为 reviewed」——正确文档任务（人类主导，模型辅助）

### 7.1 结论

- **可以**出一份「专业审校清单」文档，给 **人类审校者** 用。  
- **不可以**出「请低级模型把 draft 改成 reviewed」的编码任务（除非清单已全部人工勾选）。  

### 7.2 人类审校清单（复制为独立 issue 即可）

```markdown
# s14–s18 上线审校清单（人类填写）

审校人：________  日期：________  资质说明：________

## 内容
- [ ] 所有人物明确 18+、清醒、无权力差
- [ ] 无行为教学 / 无操作步骤 / 无规避发现
- [ ] 黄/红路径无推进性选项
- [ ] risky 不达 mutual
- [ ] 性健康表述保守，无绝对法律/医疗结论
- [ ] 非露骨：可接受为沟通教育（对照当前 Vercel AUP）
- [ ] 中文表达自然，无侮辱性刻板印象（除教学用 risky 反例）

## 分场景
- [ ] s14 事前协商
- [ ] s15 绿黄红
- [ ] s16 aftercare
- [ ] s17 中途撤回
- [ ] s18 偏好不对等
- [ ] privacy kink-boundary
- [ ] consent-signals

## 签字
- [ ] 我同意将以上内容的 reviewStatus 改为 reviewed 并进入生产入口
签字：________
```

### 7.3 审校通过后才允许的模型任务（小 diff）

**仅当 §7.2 全部勾选后：**

```
[ ] 将 s14–s18 reviewStatus: 'draft' → 'reviewed'
[ ] 决定：继续放 scenarios-draft.ts 但改为 reviewed 并由 getPublished 收录
    或 迁移进 scenarios-d.ts / 新文件并加入 SCENARIOS 数组
[ ] 更新 getPublishedScenarios / index 过滤逻辑（若按 reviewed 过滤则自动可见）
[ ] 更新测试：draft 数量预期、bundle 是否允许出现这些标题
[ ] 更新 ACCEPTANCE_REPORT
[ ] npm run verify:deploy
```

在此之前，任何模型 PR 若包含 `reviewed` 翻转，**应拒绝合并**。

---

## 8. 「行为教学 / 操作步骤」——不要出实现任务

### 8.1 给项目所有者的建议

| 选项 | 建议 |
|------|------|
| 出文档让低级模型 **实现技巧教学** | **否** |
| 出文档写明 **永久禁止项** 供模型遵守 | **是**（本节） |
| 若未来要做「安全教育链接外链」 | 另开产品决策 + 法务，不在本仓库写步骤 |

### 8.2 永久禁止清单（可贴进 AGENTS.md / 任务 prompt）

```
FORBIDDEN in all content (including draft):
- Step-by-step sex acts, positions, pacing, pressure, toys operation
- Bondage rope methods, impact location/force tables, breath play of any kind
- How to avoid being caught, hidden recording, intoxication to lower resistance
- Overriding safewords or "keep going after stop"
- Any content that teaches performing the act rather than negotiating consent
```

### 8.3 若用户坚持「要尺度」

尺度 = **把边界与同意说清楚**（本交接包已做），  
≠ **教人怎么做身体行为**。  
两者不要写在同一个「实现任务」里交给低级模型。

---

## 9. 推荐你怎么给其他模型下单（复制即用）

### 订单 A · 核对已实现内容（推荐，低风险）

```
Read docs/superpowers/plans/2026-08-07-adult-content-HANDOFF.md
Verify src/content/scenarios-draft.ts has s14-s18 as draft.
Run npm test && npm run build.
Do not change reviewStatus. Do not add technique content.
Report any missing IDs or test failures only.
```

### 订单 B · 从零恢复话术（仅文件丢失时）

```
Restore adult negotiation copy per HANDOFF.md §3 and
docs/superpowers/plans/2026-08-07-adult-content-scale-expansion.md
Copy dialogue into src/content/scenarios-draft.ts only.
Keep reviewStatus: draft. No production import. No how-to sex content.
Run full test suite.
```

### 订单 C · 上线 reviewed（禁止直接派，除非人类审校完成）

```
BLOCKED until human checklist HANDOFF.md §7.2 is fully signed.
Then perform only §7.3 small diff.
```

### 订单 D · 行为教学（禁止）

```
Do not create or accept this task.
```

---

## 10. 文件索引

| 路径 | 用途 |
|------|------|
| `docs/superpowers/plans/2026-08-07-adult-content-HANDOFF.md` | **本文件**：话术速查 + 派工边界 |
| `docs/superpowers/plans/2026-08-07-adult-content-scale-expansion.md` | 超详细实现计划（含大段 TS） |
| `src/content/scenarios-draft.ts` | **权威话术源码** |
| `docs/ACCEPTANCE_REPORT.md` | 验收与 draft 数量说明 |
| `docs/REMEDIATION_AND_PRIVACY_EXPANSION_PLAN.md` §阶段 F | 产品设计原文 |

---

**一句话结论：**

1. **话术**：以 `scenarios-draft.ts` + 本文件 §3 为准交给其他模型；优先核对，勿重写洗白。  
2. **改 reviewed**：可以出 **人类审校清单**，不要派低级模型擅自改状态。  
3. **行为教学**：不要出实现任务；只出 **禁止清单**。
