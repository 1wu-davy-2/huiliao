# 验收报告

- 验收时间：2026-08-08
- 验收范围：代码、内容数据、自动测试、生产构建、部署产物、API 类型检查、安全回归
- 代码快照：worktree `ai-trial-hardening`（基线 `7978198`，含本轮 `8686a5f`、`29b304f`、`a3b38c5`）
- 运行环境：Node v22.23.2（nvm，实测）
- 依据：[无 Playwright 测试方案](./TESTING_WITHOUT_PLAYWRIGHT.md)、[修复与隐私扩展计划](./REMEDIATION_AND_PRIVACY_EXPANSION_PLAN.md)、[部署架构计划](./项目部署架构修改确认计划.md)、[Stitch UI 话术](../docs/STITCH_UI_PROMPT.md)

## 结论

**有条件通过。** 本轮完成了 AI 试炼场工程收尾（取消/可访问名/轮数守卫）、Stitch UI 收敛、隐私与内容一致性校验，以及部署门禁扩展；所有可在本机执行的验证链全部 PASS。**Production 发布仍为 BLOCKED**，阻断项为：Vercel Preview 部署与 WAF/限流配置（需项目所有者登录与控制台操作）、Playwright E2E（Chromium 不可用）、三视口与键盘人工浏览器验收、外部专业审校、法律与性健康文案复核、Vercel AUP 确认。

## 结果汇总（本轮实测）

| 检查项 | 状态 | 本轮实际结果 |
| --- | --- | --- |
| `npm ci` | PASS | 416 packages，Node v22.23.2 |
| ESLint | PASS | 0 error；1 个既有 warning（AppDataContext.tsx Fast Refresh 导出提示） |
| Vitest | PASS | **26 个测试文件、540 个用例全部通过** |
| Production build | PASS | JS 399.20 KB（gzip 150.22 KB），CSS 27.73 KB（gzip 7.65 KB） |
| `typecheck:api` | PASS | **exit 0**（urlPolicy 重构已在 `dfc0cc8` 完成；CLAUDE.md 旧"已知错误"已更正） |
| 部署产物校验 | PASS | 1 JS、1 CSS、8 头像、本地字体 + OFL 许可证、favicon 集；**23 个草稿标记无泄漏** |
| Preview HTTP smoke | NOT RUN | 需 Vercel 部署 |
| AI 试炼交互回归 | PASS | 见下方专项 |
| Playwright E2E | BLOCKED | Chromium 运行文件仍不可用；`tests/e2e` 保留，选择器已与真实 UI 对齐，发布门解除后可直接启用 |
| 内部内容与安全审查 | PASS | 本轮完成 API 安全、内容合规、隐私披露一致性复核 |
| 外部专业内容审校 | BLOCKED | s14–s18 与 18 道 AI 候选题、法律与性健康内容未审 |
| Vercel Preview 部署 | NOT RUN | 本机无 Vercel CLI 与登录态；需项目所有者 `npx vercel login` 后部署 |

## AI 试炼场交互专项（本轮新增）

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 输入框可访问名 | PASS | `aria-label`：沟通=「你的回应」/ Prompt=「你的 Prompt」 |
| 取消请求 | PASS | AbortController + 可访问「取消」按钮；取消不消耗轮数、草稿放回输入框 |
| pending 时结束按钮 | PASS | 请求挂起时「结束并评估」禁用 |
| stale response 防护 | PASS | reducer 按 requestId 忽略过期响应（既有 + 测试保留） |
| 失败处理 | PASS | 中文错误文案 + 「本轮失败，未消耗轮数」；不消耗轮数；草稿保留可重试 |
| 达到上限 | PASS | 「已达到你设定的轮数」；自动进入评估；结果视图无继续发送入口 |
| E2E 选择器 | PASS | 「查看本地历史」、上限断言改为 `toHaveCount(0)`，与真实 UI 一致 |
| 题池为空 | PASS | 保留 POOL_EMPTY 与空状态；不伪造已审核题目 |

## API 安全回归（本轮核查）

- `typecheck:api` PASS；`api/` 无 `any`/类型强转。
- 三段式 urlPolicy 保留：HTTPS-only、无凭证/查询/片段、单标签与内网名拒绝、路径穿越拒绝、IPv6 zone id 拒绝。
- DNS 解析全部 A/AAAA（上限 8）后**整组**校验公网 unicast，任一私网/保留即整体拒绝；IPv4-mapped IPv6 先归一。
- `upstream.ts` 连接钉定地址（不再查 DNS，防 rebinding）、SNI 用原主机名、`agent:false` 不复用 socket、禁止重定向、25 秒截止、请求与响应各 1 MB、仅接受 identity 编码。
- 自递归拒绝（`selfHosts` 覆盖裸主机名/host:port/带 scheme 三种写法）。
- 密钥回显拒绝：`UPSTREAM_SECRET_ECHO`。
- 失败信息不泄漏：错误响应体只含 error code；lookup 异常、URL、主机名、钉定地址、凭据均不进入错误文案。
- API Key 边界：仅页面内存 + 请求头；切换协议/目标主机立即清空；无 localStorage/IndexedDB/URL/日志/导出/历史写入。
- 日志脱敏：`api/` 零 `console.*`。

## 内容与隐私

- s14–s18 与 18 道 AI 候选题全部 `reviewStatus: 'draft'`；`ai-trials-draft.ts`/`scenarios-draft.ts` 不进入生产入口与构建产物（23 个标记扫描验证）。
- 草稿内容仅含边界教育表达（明确同意、逐项确认、随时撤回、隐私/影像、健康风险、停止、事后照护）；无行为步骤、技巧教程、规避发现或成功率话术。
- 隐私页、设置页、导出与 IndexedDB 清理规则披露一致：`huiliao-ai-trials` 库、最近 20 次或 25 MB 自动清理、API Key 不出现在导出、试炼记录可按次导出/删除/一键清空。
- 首页与试炼 UI 按 Stitch 收敛（标题「今天练哪一场？」、失败/取消/上限状态、历史「查看对话」）。

## Vercel 适配

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| Node 版本声明 | PASS | `package.json`/`package-lock.json` 均 `22.x`，本轮在 v22.23.2 实测 |
| 构建配置 | PASS | `npm ci` + `npm run verify:deploy` + `dist` |
| SPA 深层路由 | PASS | catch-all rewrite 到 `/index.html` |
| 安全响应头 | PASS | CSP（`script-src 'self'`、`connect-src 'self'`、`font-src 'self'`）、nosniff、DENY、no-referrer、Permissions-Policy |
| 静态资源缓存 | PASS | 哈希 assets 一年 immutable |
| api/ai functions | PASS | `nodejs22.x`、`maxDuration: 30`；保留 SPA rewrite |
| 草稿扫描 | PASS | DRAFT_MARKERS 扩展至 23 个 + 守卫测试（新增草稿必须登记） |
| Preview 部署 | NOT RUN | 无 CLI/登录态，需项目所有者操作 |
| WAF / 速率限制 | BLOCKED | Vercel 控制台配置项，需部署后由项目所有者配置并实测（模块头已注明 `/api/ai/*` 生产前置要求） |

## 发布阻断项

1. 安装并登录 Vercel CLI（`npx vercel login`，交互式），部署受保护 Preview；验证 SPA 深层路由、`/api/ai/*` 运行时、响应头、导出/清除与大陆网络实测。
2. 在 Vercel 控制台配置 WAF、速率限制与 Preview 保护，并在日志面板确认无凭据/正文输出。
3. 恢复 Playwright Chromium 后执行 `tests/e2e`（选择器已对齐）；在此之前保持 BLOCKED。
4. 在真实浏览器完成 1440×900、768、390×844 三视口验收与键盘检查。
5. 请熟悉成年人同意教育与 BDSM 社群实践的专业审校者复核 s14–s18 与 18 道 AI 题；批准后才能改为 `reviewed` 并移出草稿标记。
6. 请具备资质的法律与性健康专业人士复核相关文案。
7. 完成 Vercel AUP、隐私、项目计划、域名、`noindex` 与回滚方案确认。
8. AGPL-3.0 义务（网络交互源码提供、第三方分发）在正式分发前确认。

完成以上事项后，本报告才可从"有条件通过"改为"通过"。
