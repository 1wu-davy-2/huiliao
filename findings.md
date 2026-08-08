# 变更发现与决策

## 当前仓库

- 当前分支：`feature/ai-trial-lab`
- 远端：`https://github.com/1wu-davy-2/huiliao.git`
- 当前基线提交：`dfc0cc8 fix: 修复 AI 试炼场审计问题并补齐缺失测试`

## 纳入提交的内容

- React/Vite 应用源码、组件、样式、内容、测试和脚本的现有修改。
- favicon、头像、hero 图、本地字体 CSS 与字体许可证。
- Stitch UI 设计参考：`docs/design/stitch/`（HTML 参考、PNG 截图、`DESIGN.md`）。
- Stitch 页面话术：`docs/STITCH_UI_PROMPT.md`。
- 仓库协作说明：`AGENTS.md`、`CLAUDE.md`。
- 现有产品/审校/AI 试炼计划文档。

## 明确排除

- `.playwright-cli/`：本机浏览器调试日志和页面快照。
- `tsconfig.app.tsbuildinfo`：TypeScript 本机增量缓存。
- `dist/`、`test-results/`、`node_modules/` 等构建或运行产物。

## 重要决策

| 决策 | 理由 |
|------|------|
| UI 图放在 `docs/design/stitch/` | 设计参考不应进入生产静态资源目录；构建产物不会打包这些文件 |
| 保留所有 draft 标记 | 成人内容必须经过人工专业审校，不能由本轮提交自动上线 |
| 使用独立功能分支推送 | 不覆盖 `main`，便于后续继续编码和评审 |
| 本轮不执行验证命令 | 用户明确要求先不要进行检验操作 |

## 后续风险/待办

- AI 试炼题池当前仍需人工审校后才能发布。
- Vercel 的 GitHub 自动部署、Preview 路由和 `/api/ai/*` 运行时需在后续阶段实测。
- 提交完成后应在下一阶段重新运行完整验证，而不是引用本轮之前的结果。
