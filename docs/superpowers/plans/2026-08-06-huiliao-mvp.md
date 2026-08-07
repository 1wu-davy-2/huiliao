# 会聊 MVP 收尾实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成「会聊」前端 MVP 的剩余实现——4 个缺失页面、构建错误修复、本地图片资产、单元/E2E 测试与全量验证,使 `lint`/`test`/`build`/`e2e` 全部通过并满足编码任务书验收清单。

**Architecture:** Vite + React 18 + TypeScript(strict)+ React Router 6 + Zod + lucide-react,纯前端本地存储。已完成的代码不再重写:内容层(8 场景 s02–s08/s10、8 角色)、lib 层(safety/analysis/storage/skills/validate)、首页、情境库、首次设置、布局与样式均已就绪且质量合格。本计划只补齐缺口。

**Tech Stack:** Vite 5 / React 18 / TS 5.6 / Vitest 2 + RTL / Playwright + axe-core / localStorage

**现状盘点(已核实):**
- 构建失败:① `src/lib/storage/storage.ts:26` 的 `migrate(parsed)` 类型不匹配——`storedDataSchema.parse()` 推断 `scores` 为 `Partial<Record<SkillKey, number>>`(zod v3 `z.record` 的枚举键行为),不可赋给 `ProgressRecord[]`;② 缺 `src/vite-env.d.ts`,`@/styles/global.css` 导入无声明。
- 缺失页面:`ScenarioPage`、`MessageLabPage`、`ProgressPage`、`SettingsPage`(App.tsx 已引用)。
- 缺失:`tests/`(vite.config.ts 已引用 `tests/setup.ts` 与 `tests/unit/**`)、`playwright.config.ts`、`public/images/`(characters.ts 已引用 `/images/avatars/<8 个>.svg`)、README 更新。

**关键决策(执行时遵循):**
- ScenarioPage 完成记录:`scores` 以 60 为基线累加所选选项 `deltas`(clamp 0–100);`boundaryCheckPassed = 本次未选任何 risky 选项`;`attempts = 本次回答的选项数`。
- 自由输入(240 字)与预设选项走同一套反馈逻辑;原始输入不持久化。
- 图片资产用本地 SVG(字符表已引用 .svg 路径);在 `public/images/ASSETS.md` 记录为程序化生成的原创矢量资产,无远程热链。
- 危险意图测试集:至少 12 条必拦截 + 6 条 caution + 8 条正常,全部落在 `tests/unit/safety.test.ts`。
- 数据模型、路由、状态命名一律沿用现有 `src/types/index.ts`、`src/schemas/index.ts`,不新建平行类型。

---

### Task 1: 修复构建错误(storage 类型 + vite-env.d.ts)

**Files:**
- Modify: `src/schemas/index.ts`(scores 字段类型标注)
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: 给 progressRecordSchema.scores 标注完整类型**

在 `src/schemas/index.ts` 顶部 import 处补 `SkillKey` 类型,并把 scores 字段改为:

```ts
scores: z.record(skillKeySchema, z.number().int().min(0).max(100)) as z.ZodType<
  Record<SkillKey, number>
>,
```

- [ ] **Step 2: 创建 `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 3: 验证**

Run: `npm run build`
Expected: 构建成功,`dist/` 生成,无 TS 错误。

- [ ] **Step 4: 验证 lint**

Run: `npm run lint`
Expected: 无 error。

### Task 2: 实现 ScenarioPage 模拟对话页(`/practice/:id`)

**Files:**
- Create: `src/features/practice/ScenarioPage.tsx`
- Modify: `src/styles/global.css`(追加对话区稳定高度等少量类)

- [ ] **Step 1: 实现页面**

核心状态机:`nodeId`(当前节点)→ 选择选项或自由输入提交 → 显示反馈面板(对方 `response`、`strengths`、`feelings`、按 `deltas` 降序取 2–3 项五维变化、`keyChange`、`boundaryNote`)+「重试此节点」/「继续」;`goesTo` 指向 ending 时进入结局视图。

要素:
- 顶部:场景标题、角色(头像 `character.avatar` + 称呼 + 情境,标注"虚构练习角色")、退出按钮。
- 对话区:稳定高度、可滚动、live region 通知新消息;消息用 `.msg`/`.msg-user`/`.msg-bubble`。
- 回应区:三个预设选项(radio 卡片,标注"压力低/信息不足/有压力"类标签可用 `quality` 映射)或切换"自己写一句"(textarea ≤240 字 + 剩余字数)。
- 反馈面板:`.feedback`,按 `quality` 决定是否加 `.feedback-warning`。
- 结局视图:`.feedback` 展示 `summary` + `boundarySummary`;`reviewQuestions` 渲染为私密复盘提示(多行 textarea,默认不保存原文,「保存复盘」才写 `saveReflection`);展示 `realTask` 现实任务;按钮「再练一次」「返回情境库」;提交完成记录 `completeScenario`。
- 未找到场景 id → 渲染空状态 + 返回情境库链接。
- 分数:基线 60(复用 `emptySkillMap`)+ 所选选项 deltas 求和(clamp),存 `ProgressRecord.scores`。

- [ ] **Step 2: 追加全局 CSS**

在 `global.css` 追加(保持现有风格与令牌):

```css
/* ---------- 模拟对话 ---------- */
.dialog-stage { display: flex; flex-direction: column; gap: 12px; }
.dialog-list { display: flex; flex-direction: column; gap: 12px; min-height: 260px; max-height: 46vh; overflow-y: auto; padding: 4px 2px; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.character-card { display: flex; gap: 12px; align-items: center; }
.choice-list { display: flex; flex-direction: column; gap: 10px; }
.choice-card { text-align: left; display: flex; flex-direction: column; gap: 6px; }
.node-chip { font-size: 13px; font-weight: 600; color: var(--muted); }
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev`,打开 `/practice/s02` 完成一局。
Expected: 节点推进、反馈、重试、结局、复盘保存、首页"最近复盘"出现。

### Task 3: 实现 MessageLabPage 消息实验室(`/lab`)

**Files:**
- Create: `src/features/lab/MessageLabPage.tsx`

- [ ] **Step 1: 实现页面**

- 脱敏提示卡(首屏固定):不要输入姓名、电话、账号、地址等。
- 三个必选:关系阶段(`stageSchema`)、沟通目的(`purposeSchema`)、对方回应状态(`statusSchema`)。
- 草稿 textarea ≤600 字 + 剩余字数;三个"载入示例"按钮填入安全样例(直接复用 `PURPOSE_EXAMPLES` 风格文本,自行写三条)。
- 提交 → `analyzeMessage(context, text)`:
  - `ok`:展示优点、concerns(若有)、五维 `scores`(SkillBars)、`rewritePrinciple`、三种示例(直接/轻松/稳重,各含 `why`)。
  - `caution`:先展示边界提示(feedback-warning),再给低压力版本(前 2 个示例)。
  - `blocked`:只显示拒绝说明 + 风险 + `stopCondition` 安全替代,不输出任何示例改写。
- 每个示例旁显示"按自己的真实语气重写"提示 + 自行重写 textarea(提交为本地普通文本,不诊断)。
- 状态:初始空状态卡;离开页面不写 localStorage(草稿只存 React state)。

- [ ] **Step 2: 手动验证**

Run: `npm run dev`,输入"她为什么不回我" → caution;输入"让她喝醉" → blocked;示例正常。

### Task 4: 实现 ProgressPage 进度页(`/progress`)

**Files:**
- Create: `src/features/progress/ProgressPage.tsx`

- [ ] **Step 1: 实现页面**

- 五维能力:复用 `SkillBars` + `aggregateSkillScores`。
- 边界判断正确率:`boundaryAccuracy(data.progress)`(null 时空状态)。
- 完成记录:`.list-row` 列出 `progress`(场景标题 via `getScenario`、完成时间、attempts、五维分数、边界通过徽章)。
- 收藏:`favorites` 映射场景卡(可取消收藏)。
- 私密复盘:`reflections` 列表 + 删除按钮(`deleteReflection`),空状态文案。
- 全部空数据时给出进入练习的操作。

- [ ] **Step 2: 手动验证**

Run: `npm run dev`,完成一个场景后查看 `/progress`。

### Task 5: 实现 SettingsPage 设置页(`/settings`)

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: 实现页面**

- 产品原则卡(三条原则 + 安全说明,文案复用 onboarding/产品计划)。
- 数据说明卡:本地保存内容清单(设置/进度/收藏/主动保存的复盘)、不保存内容(实验室原文、自由输入原文)、无注册无跟踪。
- 减少动态效果 switch(`reducedMotion`)。
- 导出 JSON:`exportStoredData()` 下载为文件(Blob + a[download]),内容含 schemaVersion/exportedAt/data。
- 清除数据:`Modal` 二次确认 → `clearAll()` → `navigate('/onboarding', {replace:true})`。
- 重新进行首次设置:按钮 → `resetSettings()` → 跳转 `/onboarding`。

- [ ] **Step 2: 手动验证**

导出文件可打开且含 schemaVersion;清除后刷新回到首次设置。

### Task 6: 创建本地图片资产

**Files:**
- Create: `public/images/avatars/{lina,ran,yue,yan,qing,tong,zhao,jie}.svg`(8 个)
- Create: `public/images/hero-communication.svg`(1 张主图)
- Create: `public/images/ASSETS.md`

- [ ] **Step 1: 生成 8 个角色头像 SVG**

程序化原创矢量:同风格几何头像(圆底 + 单色人物剪影 + 每角色独立配色,取自现有令牌色系),尺寸 128×128,viewBox 一致;头像标注为虚构角色。在 `ASSETS.md` 记录:由脚本按固定模板生成,配色/发型差异代表不同虚构角色,无任何真人照片,无远程引用。

- [ ] **Step 2: 生成主图 SVG**

日常交流场景(如咖啡桌对坐剪影),暖白底 + 主色线条,克制无性暗示,尺寸 800×400;用于首页或缺失图片兜底展示。

- [ ] **Step 3: 验证**

Run: `npm run dev`,确认 `/images/avatars/lina.svg` 与各页面头像 200 可访问,无 404。

### Task 7: 单元与组件测试

**Files:**
- Create: `tests/setup.ts`
- Create: `tests/unit/storage.test.ts`
- Create: `tests/unit/safety.test.ts`
- Create: `tests/unit/analyze.test.ts`
- Create: `tests/unit/scenarios.test.ts`
- Create: `tests/unit/skills.test.ts`
- Create: `tests/unit/onboarding.test.tsx`
- Create: `tests/unit/practice-page.test.tsx`

- [ ] **Step 1: 创建 `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
```

- [ ] **Step 2: storage 测试** — load 默认值/损坏 JSON 回退/schemaVersion 迁移/增删改/addProgressRecord 合并/export 含 schemaVersion 与 exportedAt/clear 后为空/草稿不出现(验证命名空间无草稿键)。
- [ ] **Step 3: safety 测试** — 固定集:≥12 条 blocked(灌酒、偷拍、威胁、纠缠、小号、未成年、权力差、欺骗、打压等)、≥6 条 caution(在吗在吗、为什么没回、喝多了、为你付出等)、≥8 条 safe(正常邀约、日常聊天、教育性提问"为什么不能灌酒");断言不含危险改写输出。
- [ ] **Step 4: analyze 测试** — ok/caution/blocked 三类;连续问号审问感;邀约缺时间地点;缺拒绝出口;大段自我输出;blocked 时 examples 为空。
- [ ] **Step 5: scenarios 测试** — 8 场景全部过 Zod schema 与图校验(起始存在、引用有效、全可达、可结束、无环、risky 必有 boundaryNote、拒绝结局不由 risky 直达);s02–s08/s10 数量断言 ≥8。
- [ ] **Step 6: skills 测试** — applyDeltas clamp;aggregateSkillScores 均值;boundaryAccuracy;recommendScenario(未完成优先、fallback、全完成返回 null)。
- [ ] **Step 7: onboarding 组件测试** — 未勾选 18+ 不能继续;困难最多选 2;三题必答;完成写入 settings 并跳转。
- [ ] **Step 8: practice-page 组件测试** — 筛选组合、空状态、清除筛选。

- [ ] **Step 9: 运行**

Run: `npm run test`
Expected: 全部通过。

### Task 8: Playwright 配置与 E2E 测试

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/onboarding-flow.spec.ts`
- Create: `tests/e2e/scenario-flow.spec.ts`
- Create: `tests/e2e/lab-flow.spec.ts`
- Create: `tests/e2e/settings-flow.spec.ts`
- Create: `tests/e2e/mobile.spec.ts`

- [ ] **Step 1: 创建 `playwright.config.ts`**

三个 project:`Desktop-Chromium`(1440×900)、`Tablet`(768×1024)、`Mobile`(360×800,isMobile + hasTouch);`webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true }`;screenshot 仅 on failure。

- [ ] **Step 2: 六个 E2E 用例**(对应任务书 §15.2)
1. 新用户首次设置 → 进入推荐练习。
2. 完成 s02 三个节点 + 重试一次 + 保存复盘(断言首页复盘出现)。
3. 实验室:选示例/自写 → 正常诊断 → 自行重写。
4. 危险输入(如"灌醉她")→ blocked,页面无危险改写文本。
5. 导出后清除数据,刷新回到 `/onboarding`。
6. Mobile project 下打开筛选、选场景、完成一个节点。

- [ ] **Step 3: axe 扫描**

对首页、`/practice`、`/lab` 运行 `new AxeBuilder({ page })` 断言无 serious/critical 违规。

- [ ] **Step 4: 视觉验证**

三视口截取首页/练习页/实验室,断言图片非空、头像 `naturalWidth>0`、控制台无 error/404/key warning。

- [ ] **Step 5: 运行**

Run: `npx playwright install chromium`(如缺)&& `npm run e2e`
Expected: 全部通过。

### Task 9: README 与收尾文档

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 重写 README**

安装(要求 Node 18+)、`npm run dev`/`test`/`build`/`lint`/`e2e`、目录架构说明(src 分层)、隐私策略摘要(本地存储、不持久化草稿、导出清除)、安全边界摘要、验收清单状态。移除"处于产品规划阶段"表述。

### Task 10: 全量验证与验收

- [ ] **Step 1**: `npm run lint` 无 error。
- [ ] **Step 2**: `npm run test` 全绿。
- [ ] **Step 3**: `npm run build` 成功。
- [ ] **Step 4**: `npm run e2e` 全绿。
- [ ] **Step 5**: 启动 `npm run dev`,对照任务书 §17 验收清单逐条确认;报告访问地址与验证结果。

---

## Self-Review(与任务书 §17 验收清单对照)

- 打开先进入成年确认/首页 → Task 2/7(RequireOnboarding 已存在)。
- 首页无营销 Hero → 已实现,无需改。
- 五导航桌面/移动可用 → AppLayout 已实现,无需改。
- ≥8 场景可玩、每场景 ≥3 节点 → 内容已有 8 场景 × 4 节点,Task 2 使其可交互。
- 分支含冷淡/迟疑/拒绝/结束 → 内容层已含(end-rejection/end-cooling/end-stop),Task 2 呈现。
- 自由输入/反馈/重试/完成/复盘真实工作 → Task 2。
- 实验室三类结果 → Task 3。
- 高风险输入无危险改写 → Task 3 + safety 测试(Task 7 Step 3)。
- 亲密内容强调同意 → 内容层已体现,测试覆盖。
- 进度只评价能力与边界 → Task 4。
- 草稿不持久化 → Task 7 Step 2 断言。
- 导出/清除生效 → Task 5 + E2E 用例 5。
- 图片本地、无 404 → Task 6 + E2E 断言。
- 三视口无溢出 → E2E mobile + axe。
- 键盘/焦点/标签/AA → Modal 已有焦点圈定;E2E axe。
- lint/test/build 通过 → Task 10。
