# MVP 验收报告

- 验收时间：2026-08-07
- 验收范围：代码、内容数据、自动测试、生产构建、部署产物、HTTP 冒烟
- 代码快照：当前为 Git 仓库；本轮工作树基线为 `d74fa8e`，最终提交以 `git log` 为准
- 依据：[无 Playwright 测试方案](./TESTING_WITHOUT_PLAYWRIGHT.md)、[修复与隐私扩展计划](./REMEDIATION_AND_PRIVACY_EXPANSION_PLAN.md)、[部署架构计划](./项目部署架构修改确认计划.md)

## 结论

**有条件通过。** 代码、内容结构、自动测试、构建和 Vercel 静态部署适配通过；Production 发布仍为 **BLOCKED**。阻断项是三视口与键盘人工浏览器验收、受保护的 Vercel Preview 验收、s14/s15 外部专业审校、法律与性健康文案复核，以及托管平台 AUP/隐私确认。

本轮没有把 s14/s15 发布。两个场景仍为 `draft`，独立保存在 `src/content/scenarios-draft.ts`，生产入口和构建产物均不包含其标题或内容。

## 结果汇总

| 检查项 | 状态 | 本轮实际结果 |
| --- | --- | --- |
| ESLint | PASS | 0 error；1 个既有 warning（`AppDataContext.tsx` 的 Fast Refresh 文件导出提示） |
| Vitest | PASS | **16 个测试文件、166 个用例全部通过** |
| Production build | PASS | `tsc -b` 与 Vite 构建成功；JS 362.29 KB（gzip 135.54 KB），CSS 14.16 KB（gzip 3.51 KB） |
| 部署产物校验 | PASS | 1 JS、1 CSS、8 个本地头像；入口、哈希资源、敏感信息和 draft 隔离检查通过 |
| Preview HTTP smoke | PASS | 8 个路由均返回 200 且含 `id="root"`，深层路由 SPA 回退正常 |
| Desktop 1440×900 | BLOCKED | 宿主未提供可用的应用内浏览器实例，本轮未执行可视验收 |
| Tablet 768 | BLOCKED | 同上 |
| Mobile 360 | BLOCKED | 同上 |
| Keyboard manual | BLOCKED | 同上；组件测试已覆盖隐私标签方向键、弹层焦点等关键交互 |
| Playwright E2E | BLOCKED | Chromium 运行文件仍不可用；现有配置和 `tests/e2e` 保留 |
| 内部内容与安全审查 | PASS | 本轮完成隐私、同意、停止信号和数据真实性复核 |
| 外部专业内容审校 | BLOCKED | s14/s15、法律与性健康内容尚未经对应专业人士复核 |

本轮自动验证使用可用的 Node 兼容运行时 v24.18.0。当前终端的 `node.exe/npm` 不在 PATH，因此没有把本轮结果描述为 Node 22 实测；历史执行记录曾报告 Node 22.23.2 全链通过，最终仍应以 Vercel Preview 的 Node 22 构建为发布依据。

## HTTP 冒烟

生产预览实际检查：

| 路由 | HTTP | 根节点 |
| --- | --- | --- |
| `/` | 200 | PASS |
| `/onboarding` | 200 | PASS |
| `/practice` | 200 | PASS |
| `/practice/s02` | 200 | PASS |
| `/lab` | 200 | PASS |
| `/progress` | 200 | PASS |
| `/settings` | 200 | PASS |
| `/privacy` | 200 | PASS |

本地服务：开发服务器 `http://127.0.0.1:5173`；本轮生产预览使用 `http://127.0.0.1:4174`（4173 已被占用）。

## 安全与场景回归

- 安全分类器 39 项全部通过，覆盖未成年人、意识受损、无视停止、隐私侵犯、执行意图、教育语境、全角数字和同义表达。
- 教育性提问只有在同句不存在执行意图时才可放行；硬拦截优先。
- `validateScenarioPaths` 阻止任何含 risky 选择的路径到达 mutual 或“边界通过”结局。
- s09 的进一步亲密事前沟通覆盖避孕、性健康、隐私和随时停止；s10 的醉酒路径只允许暂停、照顾基本安全或结束安排。
- s11-s13 覆盖截图转发、拍摄保存、备份分享、撤回和删除限制；侵犯隐私的路径直达非正向结局。
- s14/s15 草稿补齐双向事前协商、逐项隐私、个体化事后照顾，以及预先约定的绿/黄/红信号。黄色要求完全暂停并重新确认，红色要求立即结束；普通语言和非语言停止信号始终优先。
- s14/s15 的保密表述不再承诺“不向任何人说”或“绝对删除”。未经同意不得满足第三方好奇心；确需专业或紧急帮助时，只提供必要且尽量去身份化的信息。

## 数据真实性与隐私

- 持久数据仅写入当前 origin 的 `localStorage` 键 `huiliao:v1`；没有账号、后端数据库、云同步、内容上传或默认分析代码。
- 成年确认、困难选择、动效偏好、进度、收藏和主动保存的复盘会持久化；复盘按原文保存并进入导出，因此界面明确提醒不要填写可识别或敏感信息。
- 消息实验室草稿和场景自由输入只保留在当前页面内存，不写入 `localStorage`，也不进入导出。
- 同一场景再次完成时，最新结果会完整替换上一条记录，包含 `retryCount` 与 `resolvedAfterFeedback`，不会形成新旧字段混合。
- “重新进行首次设置”会同时清除已完成设置与成年确认，不能以矛盾状态绕过门禁。
- 本地数据损坏时，应用阻止正常页面和后续覆盖，显示恢复页；用户可先下载原始文本，再明确确认清除并重新开始。
- 空字符串、无法访问的存储和未来 schema 版本同样进入恢复流程；未来版本不会被旧版应用降级保存，运行期间出现损坏后所有写操作也会停止。
- 存储权限不可用时只提供“重新读取”，不提供盲目清除；权限恢复后可读回原数据，清除失败会显示反馈并保留原值。
- 导出包含 schema 版本、导出时间和当前可读取的本地数据；清除只删除当前站点命名空间，不会删除已下载文件，也不承诺支持导入恢复。
- Vercel 提供静态文件时仍会处理 IP、User-Agent、请求路径等基础请求元数据；应用内隐私页和 README 已与“训练内容不上传”分层说明。

## 审查依据

内部内容按以下公开资料的核心原则复核，但不以此冒充法律、医疗或 BDSM 专业审校：

- [RAINN：Consent 101](https://rainn.org/5-rules-for-getting-consent/)：同意应清晰、自愿、持续，并可随时撤回。
- [Planned Parenthood：All About Sexting](https://www.plannedparenthood.org/learn/teens/bullying-safety-privacy/all-about-sexting)：数字内容存在复制、保存和转发风险，因此产品不承诺不可验证的绝对删除。
- [NCSF：Is This Assault?](https://ncsfreedom.org/wp-content/uploads/2025/09/Is-this-Assault-Updated.pdf)：成年人自愿情境仍需尊重协商范围、停止信号和撤回。

## Vercel 适配

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| Node 版本声明 | PASS | `package.json` 与 `package-lock.json` 均声明 `22.x` |
| 构建配置 | PASS | `installCommand=npm ci`、`buildCommand=npm run verify:deploy`、`outputDirectory=dist` |
| SPA 深层路由 | PASS | `vercel.json` catch-all rewrite 到 `/index.html` |
| 安全响应头 | PASS | CSP、nosniff、DENY、no-referrer 与 Permissions-Policy 已配置 |
| 静态资源缓存 | PASS | 哈希 assets 使用一年 immutable；HTML 不设置该缓存 |
| 忽略文件 | PASS | 排除构建、测试报告、本地环境和 `.vercel/` |
| Preview / Production 部署 | NOT RUN | 需要项目所有者授权、Vercel 账号和托管仓库 |

Vercel 技术配置已就绪，但“可以托管”不等于“已经部署”。发布流程仍应按计划执行：连接仓库和 Vercel 项目，在受保护 Preview 上完成 Node 22 构建、三视口、键盘、深层路由、响应头、导出/清除和大陆网络实测，再决定 Production。

## 发布阻断项

1. 在真实浏览器完成 1440×900、768 和 360 三视口验收，并检查键盘焦点、弹层、长中文换行和侧栏遮挡。
2. 恢复 Playwright Chromium 后执行现有 E2E 与 axe 检查；在此之前只能保持 BLOCKED。
3. 请熟悉成年人同意教育与 BDSM 社群实践的专业审校者复核 s14/s15，批准后才能改为 `reviewed`。
4. 请具备资质的法律与性健康专业人士复核相关文案；应用继续保留“不替代专业建议”边界。
5. 完成 Vercel AUP、隐私、项目计划、域名、`noindex`、大陆可用性与回滚方案确认。
6. 项目已采用 AGPL-3.0；正式分发和部署前确认网络交互、修改源码提供及第三方分发等许可证义务。

完成以上事项后，本报告才可从“有条件通过”改为“通过”。
