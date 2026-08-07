# 2026-08-07 会话工作记录

## 记录范围

本文是本轮协作的结构化工作记录，用于项目交接和审计。它总结用户请求、实施改动、验证结果和未完成事项，不包含模型隐藏推理、GitHub 私钥、访问令牌或其他本机敏感凭据。

## 项目方向

项目从“提供快速推进关系的话术”调整为面向成年人的关系沟通练习工具，重点训练：

- 自然开口、回应、邀约、面对冷淡和接受拒绝。
- 清晰、自愿、持续、可撤回的同意。
- 影像、身份、聊天记录、设备、云备份、分享和删除边界。
- 成年人自愿情趣语境下的事前协商、停止信号和事后沟通。
- 对操控、欺骗、纠缠、灌酒、偷拍、未成年人、意识受损和无视停止等意图进行拦截。

项目不承诺恋爱结果，不提供绕过拒绝、制造压力或促成身体关系的执行建议。

## 本轮请求脉络

1. 先只读了解代码架构、页面风格、功能完成度、中文自然度和成年人亲密沟通边界，不影响另一执行流程的测试。
2. Playwright Chromium 下载受限后，采用无 Playwright 的测试组合，并保留 E2E 为真实的 `BLOCKED`。
3. 制定并执行低门槛修复、隐私大幅扩展、成年人情趣边界和绿/黄/红停止信号方案。
4. 制定 Vercel 静态托管架构和发布前确认方案。
5. 对完成状态进行第二轮代码、内容、隐私、同意和部署审查，修复审查发现的问题。
6. 将本轮内容写入项目 Markdown，并尝试使用本机 GitHub SSH 凭据推送。

## 内容与安全改动

### 已发布内容

- `/privacy` 提供“应用数据、聊天与身份、影像与分享、成年人情趣边界”四个主题。
- 明确区分页面内存、当前站点 `localStorage`、导出文件和托管平台基础请求元数据。
- 明确复盘按原文持久保存并进入导出，提醒不要填写姓名、联系方式、精确位置、性经历等可识别或敏感信息。
- 草稿和自由输入只保留在当前页面内存，不写入 `localStorage`，也不上传。
- 绿/黄/红颜色只有在双方事先约定含义时才可使用，不能替代普通语言、非语言信号和持续确认。
- 绿色只维持已确认的当前范围；黄色先完全暂停并重新确认；红色立即停止，不追问、不争辩、不尝试恢复。
- 事后关心按个人当下偏好决定，允许独处、延后联系或不复盘，不默认触碰或立即讨论。
- s11-s13 隐私场景不再承诺“绝对删除”“不会向任何人说”或必然让对方安心。
- 数字内容删除改为清理自己可控的副本、检查自动下载和云备份、如实说明第三方或服务端限制。
- 日常保密不允许满足朋友或网络的好奇；确需专业或紧急帮助时，只提供必要且尽量去身份化的信息。
- 传播已发生时，建议立即停止继续分享、清理可控副本并要求接收者删除；告知、留证和求助应采用安全且合法的方式。

### 隔离草稿

- s14“建立成年人情趣边界清单”和 s15“使用绿黄红停止信号”已补齐完整分支，但仍标记为 `draft`。
- 两个草稿独立位于 `src/content/scenarios-draft.ts`，不由生产内容入口导入。
- 构建校验会检查生产 bundle 不含两个草稿的标题。
- 只有外部专业审校通过并将状态改为 `reviewed` 后才可发布。

### 安全规则

- 输入标准化覆盖全角/半角数字、标点、空白和常见表达变体。
- 检测职责拆分为未成年人、意识受损、无视停止、隐私侵犯、执行意图和教育语境。
- 硬拦截优先；同句包含危险执行意图时，不能以“教育性提问”绕过。
- 场景路径校验保证任何包含 risky 选择的路径不能到达 mutual 或“边界检查通过”结局。
- 自由输入中的边界违规为本局单调状态，重试、改写或返回预设不会清除记录。

## 数据真实性与恢复

- 成年门禁同时要求 `isAdultConfirmed` 与 `onboardingCompleted` 为真。
- “重新设置”同时撤销成年确认与设置完成状态，清空困难选择，但保留进度、收藏、复盘和动效偏好。
- 同一场景再次完成时使用完整的新记录替换旧记录，避免 `retryCount` 或 `resolvedAfterFeedback` 新旧混合。
- 无练习记录时不显示伪造的能力分数。
- 本地数据无法解析时，应用进入阻断式恢复页，不用默认值覆盖原文。
- 空字符串、未来 schema 和存储访问被拒绝同样进入恢复流程。
- 未来 schema 不会被旧版本解析、剥离未知字段并降级写回。
- 应用运行期间若本地数据被其他标签页或外部操作破坏，后续写入、导出和设置操作会停止并进入恢复页。
- 可读取原文时支持先下载文本备份；清除需要二次确认，清除失败不会伪装成成功。
- 存储权限不可用时只显示“重新读取”，不允许在尚未读取原数据时清除；恢复权限后会重新加载原值。

## Vercel 适配

- `vercel.json` 指定 Vite、`npm ci`、`npm run verify:deploy` 和 `dist`。
- catch-all rewrite 支持 SPA 深层路由。
- 配置 CSP、`nosniff`、`DENY`、`no-referrer` 和 Permissions-Policy。
- 哈希静态资源使用一年 immutable 缓存。
- `package.json` 和 `package-lock.json` 均声明 Node 22.x。
- 部署产物脚本检查入口、资源、8 个本地头像、敏感信息和 draft 隔离。
- 当前仅完成技术适配，没有执行 Vercel Preview 或 Production 发布。
- 项目当前采用 AGPL-3.0，正式分发前仍需确认网络交互和修改源码提供义务。

## 本轮实际验证

| 检查项 | 结果 |
| --- | --- |
| ESLint | PASS，0 error，1 个既有 Fast Refresh warning |
| Vitest | PASS，16 个测试文件，166/166 用例 |
| TypeScript | PASS，`tsc -b` |
| Vite build | PASS |
| JS 产物 | 362.29 KB，gzip 135.54 KB |
| CSS 产物 | 14.16 KB，gzip 3.51 KB |
| 部署产物校验 | PASS，1 JS、1 CSS、8 个头像 |
| Preview HTTP | PASS，8 个路由均为 200 且含 `id="root"` |
| Playwright E2E | BLOCKED，Chromium 运行文件不可用 |
| 三视口与键盘人工验收 | BLOCKED，宿主未提供可用的应用内浏览器实例 |

通过的 HTTP 路由：`/`、`/onboarding`、`/practice`、`/practice/s02`、`/lab`、`/progress`、`/settings`、`/privacy`。

本轮自动验证通过可用的 Node 兼容运行时 v24.18.0 执行；当前终端的 `node.exe/npm` 不在 PATH。项目 Node 22 声明已由配置测试覆盖，最终发布仍应以 Vercel Preview 的 Node 22 构建为准。

## 主要文件

| 文件 | 本轮作用 |
| --- | --- |
| `src/content/privacy.ts` | 隐私、身份、影像和成年人情趣边界主题 |
| `src/content/consent-signals.ts` | 绿黄红信号定义 |
| `src/content/scenarios-d.ts` | 已发布 s11-s13 隐私场景修订 |
| `src/content/scenarios-draft.ts` | 隔离的 s14/s15 草稿 |
| `src/lib/storage/storage.ts` | schema 校验、写入保护与恢复错误 |
| `src/lib/settings/AppDataContext.tsx` | 运行时恢复、跨标签同步和数据操作保护 |
| `src/app/App.tsx` | 阻断式数据恢复页 |
| `vercel.json` | Vercel 构建、路由和安全响应头 |
| `scripts/verify-deploy.mjs` | 部署产物验证 |
| `docs/ACCEPTANCE_REPORT.md` | 当前验收结论与发布阻断项 |

## 审查依据

- [RAINN：Consent 101](https://rainn.org/5-rules-for-getting-consent/)
- [Planned Parenthood：All About Sexting](https://www.plannedparenthood.org/learn/teens/bullying-safety-privacy/all-about-sexting)
- [NCSF：Is This Assault?](https://ncsfreedom.org/wp-content/uploads/2025/09/Is-this-Assault-Updated.pdf)

这些资料用于内部原则核对，不替代法律、医疗、心理或 BDSM 专业审校。

## GitHub 状态

- 本地 GitHub SSH 认证成功，账户为 `1wu-davy-2`；本文未记录密钥内容。
- 当前项目配置的远端为 `git@github.com:1wu-davy-2/huiliao.git`，分支为 `main`。
- 已通过 `git fetch` 确认本地基线与当前 `origin/main` 一致。
- 查询 `git@github.com:1wu-davy-2/cangku1.git` 时，GitHub 返回仓库不存在或当前密钥无权限。
- 在获得 `cangku1` 的准确 `owner/repository` 地址或创建授权前，不应把本轮提交强推或误推到其他仓库。

## 发布前剩余事项

1. 提供可访问的 `cangku1` GitHub 仓库地址，或明确批准使用当前 `1wu-davy-2/huiliao` 远端。
2. 在真实浏览器完成 1440×900、768 和 360 三视口及键盘验收。
3. 恢复 Playwright Chromium 后执行 E2E 和 axe。
4. 完成 s14/s15 的成年人同意与 BDSM 社群实践专业审校。
5. 完成法律、性健康、Vercel AUP/隐私和大陆网络可用性复核。
6. 在受保护的 Vercel Preview 完成 Node 22 构建和发布前验收。
