# 变更发现与决策

## 本轮会话：2026-08-08（worktree `ai-trial-hardening`）

### 基线（Node v22.23.2 实测，禁止沿用旧数字）

| 命令 | 真实结果 |
|------|----------|
| `npm ci` | PASS（416 packages） |
| `npm run lint` | PASS，0 error / 1 warning（AppDataContext.tsx Fast Refresh，既有） |
| `npm test` | PASS，**26 文件 / 540 用例**（26 files passed, 538→540 随本轮新增用例） |
| `npm run build` | PASS，JS 399.20 KB（gzip 150.22 KB）、CSS 27.73 KB（gzip 7.65 KB） |
| `npm run typecheck:api` | **PASS（exit 0）** |
| `npm run verify:deploy` | PASS（1 JS、1 CSS、8 头像、23 个草稿标记无泄漏） |

README 曾声明 159 用例、CLAUDE.md 曾声明 233 用例且记载 `typecheck:api` 失败——均已按本轮实测更正。

### 关键发现

1. **CLAUDE.md 的"Known-broken: typecheck:api"已过时。** `dfc0cc8` 已完成 urlPolicy 重构：`turn.ts`/`evaluate.ts`/providers 全部迁移到 `PinnedTarget`，`resolveTarget` 对预设与自定义地址统一走 `resolveAndPin`（含 `selfHosts`）。CLAUDE.md 相应章节已重写为 PASS 状态与不变量清单。
2. **安全不变量零缺口。** `api/_lib/urlPolicy.ts` 三段式（语法→分类→钉定）与 `upstream.ts` 有界请求实现完整，测试覆盖 URL 语法/私网与保留地址/混合 DNS 整体拒绝/路径前缀保留/自递归/失败信息不泄漏/25s 超时/1 MB 上限/密钥回显/不跟随重定向。`urlPolicy.ts` 内嵌控制字符的隐患已消除（`hasControlOrWhitespace` 用字符码判断）。
3. **API Key 边界干净。** 仅 React state + `apiKeyRef`，只经 `X-Huiliao-Api-Key` 头传输；`trialClient`/`trialDb`/导出/历史均无凭据路径；切换协议或目标主机立即清空密钥与同意勾选。
4. **E2E 与 UI 存在选择器偏差（已修正）。** 测试期望「试炼历史」按钮（实际 UI 为「查看本地历史」）、上限后「发送」仍 disabled（实际结果视图不再渲染发送按钮）、`你的回应` aria-label 缺失。已按"选择器与真实 UI 一致"原则修正 E2E 并补齐 UI。
5. **UI 层此前未接线取消能力。** reducer 已有 `CANCEL_REQUEST` 与 stale 防护，但 `AiTrialPage` 无 AbortController；本轮补齐后，取消不消耗轮数且把草稿放回输入框（重试友好）。失败路径原先直接显示错误码原文（`TrialRequestError.message` 就是 code），本轮改用 `messageForCode` 输出中文并附「本轮失败，未消耗轮数」。
6. **评估 effect 曾违反 exhaustive-deps。** 依赖数组只有 `[state.phase]`，lint 警告列出 14 个缺失依赖；补全依赖是安全的（evaluating 阶段输入区已禁用、设置页已卸载，运行期字段不会变化，守卫处提前返回，不会重复评估/保存）。
7. **verify-deploy 草稿扫描原本只覆盖 2 个标题。** s16–s18 与 18 道 AI 候选题标题未在 DRAFT_MARKERS 中；本轮扩展为 23 个标记并新增守卫测试（草稿标题必须同步登记），防止新草稿静默绕过发布门。
8. **Vercel CLI 不可用。** 本机未安装 vercel CLI、无 `~/.vercel` 登录态，`npx vercel` 下载挂起。Preview 部署需项目所有者交互式登录，本轮如实标记 NOT RUN。
9. **API 层零日志。** `api/` 无任何 `console.*` 调用，日志脱敏在代码层面天然满足（无内容可泄漏）。

### 决策

| 决策 | 理由 |
|------|------|
| 在独立 worktree（`ai-trial-hardening`）工作 | 用户要求不修改、不合并 `main` |
| 草稿标记用标题而非 id | 标题是唯一且稳定的内容特征，构建产物中一旦出现即泄漏 |
| 上限后结果视图不渲染发送入口 | 与"达到上限自动结束"一致；E2E 断言随之改为 `toHaveCount(0)` |
| 取消/失败保留输入草稿 | 取消不消耗轮数，草稿放回便于修改重试；成功提交才清空 |
| 首页标题与副文案按 Stitch | STITCH_UI_PROMPT.md 是权威 UI 规范（今天练哪一场？/ 下一步不是取悦对方，而是把话说清楚。） |
| 不删除 POOL_EMPTY、不伪造已审核题目 | 题池空是人工审校发布门的预期状态，不是 bug |
| 不引入远程字体/渐变/营销元素 | 用户 Phase 4 约束 + CSP `font-src 'self'` 会拦截远程字体 |

### 剩余风险/待办

- Vercel Preview 部署与 WAF/速率限制配置需项目所有者执行（见 task_plan.md）。
- Playwright Chromium 恢复前 E2E 保持 BLOCKED。
- s14–s18 与 18 道 AI 题、法律/性健康文案待外部专业审校。
- 发布门已自动拦截草稿泄漏；审校通过后须同时更新 `ai-trials.ts` 的 `AI_TRIALS_REVIEWED`、删除 E2E 的 POOL_EMPTY，并将标记从 DRAFT_MARKERS 移除（守卫测试会提示）。
