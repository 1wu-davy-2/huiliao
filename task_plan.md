# 会聊项目执行计划

## 目标

保存当前分支已有的应用代码、UI 资源、Stitch 设计参考与协作文档，形成一个可追踪的 Git 提交并推送到 GitHub；本轮不进行编码、测试或构建。

## 当前阶段

阶段 1：整理并提交当前工作树（进行中）

## 阶段安排

### 阶段 1：变更盘点与提交

- [x] 确认当前分支、远端和工作树
- [x] 确认 Stitch UI 资料位于 `docs/design/stitch/`
- [x] 确定纳入源码、测试、静态资源、字体许可证和设计资料
- [x] 排除 `.playwright-cli/` 与 `tsconfig.app.tsbuildinfo`
- [ ] 创建规范化提交并推送 `feature/ai-trial-lab`

### 阶段 2：UI 与交互收敛（后续）

- [ ] 依据 Stitch 参考统一首页、练习、实验室、进度和设置页的视觉语言
- [ ] 保留本地字体、favicon、响应式布局和无障碍语义
- [ ] 不改变成人内容的 `draft` 审校门

### 阶段 3：AI 试炼场收尾（后续）

- [ ] 完成已审校题池发布前的人工审校流程
- [ ] 收敛取消请求、错误恢复、历史记录和 IndexedDB 清除行为
- [ ] 复核 API 目标地址、协议适配和部署配置

### 阶段 4：验证与部署（后续）

- [ ] 按项目指南运行 lint、单测、构建、API 类型检查和部署产物校验
- [ ] 运行 Playwright 桌面、平板和移动流程
- [ ] 在 Vercel Preview 验证 `/api/ai/*` 路由、WAF/速率限制与 GitHub 自动部署

## 本轮明确不做

- 不修改业务代码或样式实现
- 不运行 `npm test`、`npm run build`、`npm run lint`、`npm run e2e` 或 `npm run verify:deploy`
- 不把任何 `reviewStatus: 'draft'` 改为 `reviewed`
- 不提交浏览器临时日志、截图缓存或本机增量构建文件

## 交付记录

- 目标远端：`origin`（GitHub）
- 目标分支：`feature/ai-trial-lab`
- 提交信息：`待本轮提交后回填`
- 推送状态：待执行
