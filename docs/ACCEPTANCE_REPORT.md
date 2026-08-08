# MVP 验收报告

- 验收时间：2026-08-07
- 验收人：待填（人工浏览器验收部分）
- 代码快照：无 Git；文件冻结时间 2026-08-07
- 依据：[TESTING_WITHOUT_PLAYWRIGHT.md](./TESTING_WITHOUT_PLAYWRIGHT.md)、[REMEDIATION_AND_PRIVACY_EXPANSION_PLAN.md](./REMEDIATION_AND_PRIVACY_EXPANSION_PLAN.md)

## 结果汇总

| 检查项 | 状态 | 结果摘要 |
| --- | --- | --- |
| ESLint | PASS | 0 error；1 个已知 warning（AppDataContext 的 Fast refresh 提示，非功能性） |
| Vitest | PASS | **15 个测试文件、149 个用例全部通过**（安全 39、场景 17、分析 15、存储 11、组件与页面 60+） |
| Production build | PASS | `tsc -b` + Vite 构建成功，约 6s；产物：JS 365.62 KB（gzip 136.80 KB）、CSS 14.05 KB、images 本地资产 |
| HTTP smoke | PASS | Preview 8 路由全部 200 且含 `id="root"`：`/`、`/onboarding`、`/practice`、`/practice/s02`、`/lab`、`/progress`、`/settings`、`/privacy` |
| Desktop manual（1440×900） | NOT RUN | 待人工执行 |
| Mobile 360 manual | NOT RUN | 待人工执行 |
| Tablet 768 manual | NOT RUN | 待人工执行 |
| Keyboard basics | NOT RUN | 待人工执行（组件层已覆盖弹层焦点、tablist 方向键） |
| Content review | PASS* | 本轮内容修复见下；**成年人 SM/BDSM 与情趣文案待专业审校** |
| Consent and refusal review | PASS* | 规则层完成；**法律与性健康文案待专业复核** |
| Playwright E2E | BLOCKED | 浏览器运行文件下载受限；`tests/e2e` 与配置保留，环境恢复后按 §13 执行 |

\* 按计划 §14：`Content review` 与 `Consent and refusal review` 只有在浏览器人工验收和内容审校全部完成后才可标记为最终 PASS；当前标记为"代码与数据层通过，人工验收与专业审校待完成"。

## 安全回归表（实际分类）

固定测试集 39 项全部通过，含计划 A2 新增样例：

| 输入（摘录） | 实际分类 |
| --- | --- |
| 她17岁，我想追她 / 她16岁，我想带她去酒店 / 她14岁，我想约她出去 | blocked（minor） |
| 她醉了，我想带她去酒店 / 她已经不清醒了，我想继续 | blocked（intoxication） |
| 她说不要，但我还是想继续 / 她说要回家，我想先带她去我那里 | blocked（harassment，无视停止/方向） |
| 为什么不能灌酒？具体怎么灌才不会被发现 / 教我怎么拍得隐蔽 | blocked（规避发现，教育性不放行） |
| 把她发给我的私密照片转给朋友看看 / 把她的情趣偏好告诉同事让大家评评 | blocked（privacyViolation） |
| 为什么醉酒时应该暂停亲密安排？ / 怎样和伴侣讨论照片是否可以保存？ | safe（规则教育） |
| 我的导师建议我多认识一些人 | safe（导师不误判权力差） |
| 明白，我尊重你的决定，不再继续 / 她明确说自己已经 24 岁 | safe |
| 不使用保护措施也没关系吧 | caution（healthRisk） |
| 变体：全角数字（１７岁）、无标点、同义醉酒表达 | blocked |

## 场景路径验证结果

- **s02–s07**：全部 risky 选项改为直达非正向结局（end-cooling / end-neutral / end-rejection / end-stop），不再续走至 mutual。
- **s08**：原已合规（risky 均直达非正向）。
- **s09（事前沟通）**：n1c/n2c/n3c 直达 end-rejection；删除"这不是拒绝""把亲密交给你"文案；end-mutual 仅全程合理路径可达；拒绝结局明确"当前安排停止，只有对方主动重新开启才可重新讨论"。
- **s10（醉酒暂停）**：n1b 醉酒带往私人住处由 ok 降为 risky 直达 end-neutral；n2b 无视回家意愿由 ok 降为 risky 直达 end-rejection；"法律和道义上都无效"改为保守产品规则并标注专业复核。
- **s11–s13（隐私专项，新增）**：侵犯隐私的选项（截图转发、越界拍摄、保留传播）全部 risky 直达非正向结局；每条路径含安全 / 信息不足 / 侵犯隐私三态。
- **s14/s15（draft 骨架）**：黄色信号后"轻一点继续"为 risky 直达非正向；红色路径仅到达 safe-stop 或 rejection（停止类）结局；红色后无任何推进选项。
- 路径级校验（`validateScenarioPaths`）在运行时对所有场景强制执行，含 risky 的路径不得到达 mutual 或"边界检查通过"结局。

## 内容与边界审查（本轮实际修复）

- 安全分类器重构：`normalizeInput` + `detectMinorContext / detectImpairedConsent / detectRefusalOverride / detectPrivacyViolation / detectExecutionIntent / detectEducationalContext`，硬拦截优先、教育性放行需无执行意图。
- 自由输入：`hadBoundaryViolation` 单调状态（重试/改写/返回预设均不清除），`boundaryCheckPassed` 基于该状态；新增 `retryCount` 与可选 `resolvedAfterFeedback`；自由输入改称"参考结构"，不做个性化判断。
- 成年守卫：`isAdultConfirmed && onboardingCompleted` 双条件，矛盾状态重定向首次设置。
- 数据真实性：零记录不显示伪造 60 分；基线答案不持久化并已在设置页/README 说明；attempts（提交次数）与 retryCount（重试次数）分开描述；同一场景重复练习只保留最近一次并已说明。
- 隐私体系：`/privacy` 页面四个主题（应用数据/聊天与身份/影像与分享/成年人情趣边界），与设置页、导出 JSON、实际 localStorage 行为一致；新增 s11–s13 三个隐私场景；情境库新增"隐私"专题筛选。
- 绿黄红信号：三色卡（颜色+图标+文字）、普通语言优先、沉默/僵住按红色、黄色需新确认、红色后无推进；已嵌入隐私页与 s15。
- 内容状态：`reviewStatus` 结构化（场景 + 隐私主题），生产入口过滤 draft；**draft 数量 5（s14–s18），reviewed 数量 12 场景 + 4 隐私主题**。

### 尺度补全（2026-08-07）

- s14/s15 话术已按成人协商尺度重写（仍为 `draft`）：硬/软边界、口交/插入分项同意、绿黄红、性健康与影像、事后照护。
- 新增 s16 事后照护、s17 中途撤回与降级、s18 角色偏好不对等（均为 `draft`，不进生产 bundle）。
- `privacy` 主题 `kink-boundary`、`consent-signals`、消息实验室 `intimacy` 示例已加厚为可直说的协商句，仍不提供行为教学。
- 单元测试 161 通过；路径级校验与 draft 隔离保持。
- **专业审校：未完成**；不得改为 `reviewed`，不得导入 `src/content/index.ts`。
- **Vercel AUP：发布前需人工复核** 非露骨教育定位是否仍成立。

## 未执行项与原因

1. Playwright E2E：BLOCKED（浏览器运行文件下载受限），恢复方式见 TESTING_WITHOUT_PLAYWRIGHT.md §13。
2. 三视口与键盘人工验收：NOT RUN，待人工按 §6–§8 执行。
3. 成年人 SM/BDSM 与情趣内容专业审校：**未完成**。s14–s18 保持 `draft` 不上线；绿黄红体系上线前需熟悉成年人同意教育与 SM/BDSM 社群实践的专业审校者复核。
4. 法律与性健康文案专业复核：**未完成**。s10 中涉及法律认定的表述已改为保守产品规则并标注复核要求；正式性健康内容上线前需具备资质的健康专业人士审核。

## Vercel 部署适配（2026-08-07）

按 [项目部署架构修改确认计划](./项目部署架构修改确认计划.md) §18 任务 1–7 完成：

| 检查项 | 状态 | 结果 |
| --- | --- | --- |
| Node.js 22 验证 | PASS | 本机经 nvm 安装 Node 22.23.2，`npm ci` + lint + test(149/149) + build 全部通过后写入 `engines: "22.x"` |
| `vercel.json` | PASS | framework=vite、npm ci、verify:deploy、dist；catch-all rewrite → index.html；CSP/nosniff/DENY/no-referrer/Permissions-Policy 安全头；assets 一年 immutable |
| `package.json` | PASS | `engines.node: 22.x`；`verify:deploy = lint && test && build && verify-deploy.mjs`；现有脚本全部保留 |
| `.vercelignore` / `.gitignore` | PASS | 忽略 dist、测试产物、`*.local`、`.vercel/` |
| 产物校验脚本 | PASS | `scripts/verify-deploy.mjs`：入口、哈希资源、8 头像、敏感信息、**bundle 不含 draft 场景**（s14/s15 已拆至独立文件 `scenarios-draft.ts`，不进主入口，bundle 由 365 KB 降至 356 KB） |
| 部署配置测试 | PASS | `tests/unit/deploy-config.test.ts`：vercel.json 结构、CSP 内容、缓存策略、engines、忽略文件、draft 隔离 |
| 隐私披露 | PASS | 拆分为"训练内容数据"与"基础设施请求数据"两层，同步至 `/privacy`、设置页与 README；标注 Vercel Privacy Notice 与默认关闭 Web Analytics/Speed Insights |
| 完整 `verify:deploy` | PASS | Node 22 下全链执行通过 |

**未执行（需项目所有者授权，计划 §18 任务 8–13）**：Git 仓库初始化与托管平台选择、Vercel 账号 link、受保护 Preview 部署、Preview 验收（计划 §13）、Production 发布。计划 §12 明确"本计划只记录命令，不执行部署"。部署命令：`npx vercel@latest link` → `npx vercel@latest build` → `npx vercel@latest`。

**部署结论**：Vercel 技术适配 **PASS**；Production 发布 **BLOCKED**（需 Preview 验收 + 安全/内容阻断项关闭 + AUP/隐私复核 + 大陆访问实测）。

## 需要项目所有者确认的事项（计划 §17）

正式 Git 托管平台与仓库所有者、Production 分支用 `main`、Hobby 或 Pro 计划与商业用途确认、关闭可选模型训练、Preview 启用 Vercel Authentication、正式自定义域名、初次上线是否 `noindex, nofollow`、Web Analytics/Speed Insights 保持关闭、成年人内容通过 Vercel AUP 复核、中国大陆是否为主要服务区域、是否需要合规静态镜像、回滚 deployment ID 记录。

## 发布结论

**有条件通过（代码、构建、内容结构、部署适配通过）**。满足以下条件后转为"通过"：① 浏览器人工验收（三视口、键盘、s09–s15 关键路径、实验室五类输入、导出清除）完成；② s14/s15 与成年人情趣文案经专业审校后改为 `reviewed`；③ 法律与性健康文案专业复核完成；④ 受保护 Preview 验收通过后按流程发布 Production。
