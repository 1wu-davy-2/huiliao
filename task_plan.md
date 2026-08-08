# 会聊项目执行计划

## 目标

在独立 worktree（`ai-trial-hardening`，基于 `feature/ai-trial-lab`）完成 AI 试炼场工程收尾、Stitch UI 落地、隐私边界校验与部署前门禁；不修改、不合并 `main`。

## 当前阶段

阶段 2–6 主体完成（2026-08-08）；剩余阻断项为需要用户/外部资源的事项（见文末）。

## 阶段安排

### 阶段 1：变更盘点与提交（已完成，上一轮）

- [x] 确认当前分支、远端和工作树
- [x] 创建 `feature/ai-trial-lab` 并推送

### 阶段 2：修复 API 与安全问题（本轮）

- [x] 实测 `typecheck:api`：**PASS**（exit 0）——urlPolicy 重构已在 `dfc0cc8` 完成，CLAUDE.md 旧"已知错误"章节已更新
- [x] 核查并确认安全不变量全部保留且有测试：HTTPS-only、DNS 全地址公网校验、IP 钉定、防 rebinding、防自递归、禁止重定向、25 秒超时、1 MB 上限、密钥回显检测、失败信息不泄漏
- [x] `api/` 无 `any`/类型强转
- [x] API Key 仅存在于页面内存（React state + ref）与 `X-Huiliao-Api-Key` 请求头；无 localStorage/IndexedDB/URL/日志/导出/历史写入

### 阶段 3：修复 AI 试炼交互（本轮）

- [x] 输入框增加可访问名：`aria-label`（沟通=「你的回应」/ Prompt=「你的 Prompt」）
- [x] AbortController 取消请求 + 可访问「取消」按钮；取消不消耗轮数、恢复草稿
- [x] 请求挂起时禁用「结束并评估」
- [x] 保留 stale response 防护（requestId 不匹配忽略）、失败不消耗轮数、重试保留消息与越界记录
- [x] 失败提示输出中文文案并附「本轮失败，未消耗轮数」（修复错误码原文直出）
- [x] 达到上限显示「已达到你设定的轮数」并自动进入评估
- [x] E2E 选择器与真实 UI 对齐（「查看本地历史」、上限后无发送入口）；POOL_EMPTY 保留
- [x] 评估 effect 依赖数组补全，消除 exhaustive-deps 警告

### 阶段 4：按 Stitch 资料收敛 UI（本轮）

- [x] 保留五项一级导航；AI 试炼场为实验室二级入口
- [x] 首页标题改为「今天练哪一场？」、副文案采用 Stitch 定义
- [x] 历史记录新增「查看对话」展开完整转录（可收起）
- [x] 空状态/加载/失败/取消/达到上限/结果/历史状态齐全
- [x] 三视口适配核查：无固定 min-width 溢出；底部导航高度已由 `.content` padding-bottom 预留；断点 640/768/1024/1280
- [x] 本地字体（@fontsource，无远程引用）、现有设计令牌、favicon
- [x] 无大面积渐变/紫色渐变/发光球体/营销 Hero/卡片级过度圆角；999px 圆角仅用于 tag/头像/进度条/开关等小元素
- [x] Stitch HTML 仅作参考，实现均为 React 组件（下划线输入、编辑式字段节奏等签名手法已采用）

### 阶段 5：内容与隐私一致性（本轮）

- [x] s14–s18 与 18 道 AI 候选题保持 `reviewStatus: 'draft'`
- [x] `ai-trials-draft.ts`/`scenarios-draft.ts` 不进入生产入口与构建产物（`AI_TRIALS_REVIEWED` 为空，`getPublishedTrials` 过滤 reviewed）
- [x] 草稿内容合规核查：仅边界教育用法（识别胁迫、拒绝压力话术），无行为步骤/技巧教程/规避方法/成功率承诺
- [x] 隐私页、设置页、导出、IndexedDB 清理规则披露一致（huiliao-ai-trials、20 次/25 MB、密钥边界、导出排除）

### 阶段 6：部署前门禁与文档收尾（本轮）

- [x] verify-deploy 草稿扫描扩展：DRAFT_MARKERS 覆盖 s14–s18 与全部 18 道 AI 题标题（共 23 个）
- [x] 新增回归守卫测试：新增草稿标题必须同步登记到标记列表
- [x] 完整链执行：lint（0 error）/ test（540）/ build / typecheck:api / verify:deploy 全部 PASS
- [x] 日志脱敏核查：`api/` 零 `console.*` 输出
- [ ] **NOT RUN** 受保护 Vercel Preview 部署：本机无 Vercel CLI、无登录态，需项目所有者交互式登录（`! npx vercel login`）后 `npx vercel deploy --prebuilt`，再验证 SPA 深层路由与 `/api/ai/*`
- [ ] **BLOCKED** WAF/速率限制/Preview 保护配置：属 Vercel 项目控制台设置，需部署后由项目所有者配置并实测
- [x] task_plan.md / findings.md / progress.md / ACCEPTANCE_REPORT.md 已用本轮实测结果更新

## 本轮明确不做

- 不修改、不合并 `main`（独立 worktree 分支 `ai-trial-hardening`）
- 不把任何 `reviewStatus: 'draft'` 改为 `reviewed`
- 不删除 POOL_EMPTY、不伪造已审核题目
- 不新增操控/欺骗/纠缠/绕过拒绝/未成年/醉酒/偷拍/露骨性行为教学内容

## 剩余阻断项（需用户或外部资源）

1. Vercel CLI 安装与登录（交互式），部署受保护 Preview 并实测 `/api/ai/*`、深层路由、响应头
2. WAF / 速率限制 / Preview 保护 / 日志面板配置与实测（Vercel 控制台）
3. Playwright Chromium 恢复后执行 E2E（当前保持 BLOCKED，按 TESTING_WITHOUT_PLAYWRIGHT.md）
4. 浏览器人工验收：1440×900 / 768 / 390×844 三视口、键盘、s09–s18 路径
5. 外部专业审校：s14–s18 与 18 道 AI 题、法律与性健康文案
6. Vercel AUP / 隐私 / 计划 / 域名 / noindex / 大陆可用性确认
7. 以上完成后才可考虑 Production 发布

## 交付记录

- 目标分支：`ai-trial-hardening`（基于 `feature/ai-trial-lab`）
- 本轮提交：`8686a5f`（交互收尾）、`29b304f`（Stitch UI）、`a3b38c5`（部署门禁）
- 基线：worktree 起始 `7978198`；全部命令在 Node v22.23.2 实测
