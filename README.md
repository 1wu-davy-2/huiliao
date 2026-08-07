# 会聊

面向缺少约会沟通经验的成年男性，提供尊重、真诚、有边界的关系沟通练习。通过分支情境模拟、消息诊断、五维能力反馈和复盘，训练自然表达、倾听回应、低压力邀约、面对拒绝，以及成年人亲密互动中的明确和持续同意。

- 产品计划：[docs/PRODUCT_PLAN.md](./docs/PRODUCT_PLAN.md)
- 编码任务书：[docs/IMPLEMENTATION_BRIEF.md](./docs/IMPLEMENTATION_BRIEF.md)

项目不把女性视为需要“攻略”的对象，不承诺回复、邀约、恋爱或身体关系结果。涉及操控、欺骗、强迫、灌酒、纠缠、偷拍、未成年人或明显权力差的意图，产品不会提供执行建议。

## 环境要求

- Node.js 18+
- npm 9+

## 安装与启动

```bash
npm install
npm run dev        # 启动开发服务器 http://localhost:5173
```

生产构建与预览：

```bash
npm run build      # TypeScript 检查 + Vite 构建（输出 dist/）
npm run preview    # 预览生产构建
```

## 质量检查

```bash
npm run lint       # ESLint
npm run test       # Vitest 单元与组件测试（15 个文件、149 个用例）
npm run build      # TypeScript 检查 + Vite 构建
npm run e2e        # Playwright E2E（当前环境 BLOCKED，见下）
```

当前状态：`npm run lint`（0 error）、`npm run test`（149/149）、`npm run build` 均已通过；Preview 的 8 个路由 HTTP 冒烟检查全部 200（含 `/privacy`）。Playwright 因浏览器运行文件下载受限记录为 **BLOCKED**，`tests/e2e` 与 `playwright.config.ts` 已保留，环境恢复后可运行；浏览器验收由人工按 [TESTING_WITHOUT_PLAYWRIGHT.md](./docs/TESTING_WITHOUT_PLAYWRIGHT.md) 执行。

## 技术架构

- **构建**：Vite 5 + React 18 + TypeScript（严格模式）
- **路由**：React Router 6（未完成首次设置时重定向到 `/onboarding`）
- **数据校验**：Zod——场景图结构、本地存储 schema
- **图标**：lucide-react；样式为原生 CSS + CSS 自定义属性设计令牌
- **测试**：Vitest + React Testing Library（单元/组件）、Playwright + axe-core（E2E/视觉/无障碍）
- **数据**：浏览器 `localStorage`，单一带版本号的命名空间 `huiliao:v1`，由 `src/lib/storage/` 统一封装

目录结构：

```text
src/
  app/                 # 路由与入口
  components/          # 通用控件（布局、弹层、技能条）
  features/
    onboarding/        # 首次设置（18+ 确认、困难、基线、原则）
    home/              # 训练首页
    practice/          # 情境库与模拟对话
    lab/               # 消息实验室
    progress/          # 进度与复盘
    settings/          # 设置与隐私
  content/             # 场景数据（12 个已发布 + 2 个 draft 骨架）、隐私主题、绿黄红信号
  schemas/             # Zod 数据契约
  lib/
    safety/            # 安全意图拦截（独立可测试模块）
    analysis/          # 消息诊断（纯函数 analyzeMessage）
    scenario/          # 场景图结构校验
    storage/           # localStorage 读写、迁移、导出、清除
    skills/            # 五维能力计算与场景推荐
  styles/              # 设计令牌与全局样式
public/images/         # 本地矢量资产（程序化生成，见 ASSETS.md）
tests/
  unit/                # Vitest 单元与组件测试
  e2e/                 # Playwright 端到端测试
scripts/               # 资产生成脚本
```

## 隐私策略摘要

- **训练内容数据**：消息实验室草稿、模拟对话自由输入、复盘不上传任何服务器；应用无 Function、数据库或云同步。
- **本地数据**：首次设置、练习进度、五维能力、收藏、复盘仅保存在当前域名浏览器的 `localStorage`（`huiliao:v1`），按域名隔离。
- **不保存**：消息实验室原始草稿、模拟对话自由输入原文（诊断后即丢弃）、姓名、联系方式、位置、性经历、基线答案。
- **基础设施请求数据**：访问网站时，托管平台（Vercel）为提供静态文件会处理基础请求元数据（IP、User-Agent、请求路径等），按其[隐私政策](https://vercel.com/legal/privacy-notice)处理；项目默认不开启 Web Analytics 与 Speed Insights。
- 设置页支持导出结构化 JSON（含 schema 版本与导出时间）与一键清除；清除后刷新页面旧数据无法恢复。
- 未来若增加服务器、模型或统计能力，必须重新取得明确选择加入，并同步更新本说明。

## Vercel 部署

当前为纯静态 Vite SPA，按 [docs/项目部署架构修改确认计划.md](./docs/项目部署架构修改确认计划.md) 适配：

- **Framework Preset**：Vite；**Install**：`npm ci`；**Build**：`npm run verify:deploy`（lint + 单元/组件测试 + 构建 + 产物校验）；**Output**：`dist`；**Node.js**：22.x（`engines` 已锁定）。
- **深层路由**：`vercel.json` 的 catch-all rewrite 将任意路径回退到 `index.html`，`/practice/s02` 等直接访问与刷新可用。
- **安全响应头**：CSP（`default-src 'self'`，保留 `style-src 'unsafe-inline'` 以兼容 React 内联样式）、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: no-referrer`、`Permissions-Policy`；带哈希的 `/assets/` 一年 immutable 缓存。
- **数据隔离**：Preview URL、`*.vercel.app` 与自定义域名是不同的 origin，`localStorage` 互不共享；切换永久域名前需先导出数据（当前未实现导入）。
- **分析与第三方**：不启用 Vercel Web Analytics、Speed Insights、广告或第三方脚本；无环境变量，无 `.env.example`。
- **状态**：Playwright 未执行时 E2E 不记为通过；Vercel 技术适配完成后仍需受保护 Preview 验收与内容/AUP/隐私复核，Production 发布当前为 **BLOCKED**（见验收报告）。

## 安全边界

- 仅面向 18 岁以上成年人，首次进入必须确认年龄。
- 收到拒绝、停止联系要求或连续不回应后，只建议接受并停止推进。
- 亲密练习只训练双方意愿表达、同意确认（清醒、自主、明确、具体、持续、可撤回）、暂停与退出。
- 安全拦截为独立模块 `src/lib/safety/`，带固定测试集（14 条必拦截、6 条谨慎、9 条正常样例）。

## 内容体系

- **12 个已发布场景**：普通沟通（s02–s07）、亲密同意（s08–s10）、隐私专项（s11–s13，含影像/拍摄/删除保密）。
- **2 个 draft 骨架场景**（s14/s15）：成年人自愿情趣的事前边界协商与绿黄红信号。`reviewStatus: 'draft'`，不进入情境库与任何用户界面，等待内容审校者补充批准后改为 `reviewed` 发布。
- **`/privacy` 隐私与边界手册**：应用数据、聊天与身份、影像与分享、成年人情趣边界四个主题；绿黄红信号卡同时使用颜色、图标与文字，不依赖颜色单独传达。
- **安全分类器**：独立模块（`normalize` + 意图检测函数组合），39 项固定测试集；教育性提问不绕过同句执行意图。

## 验收状态

对照 [编码任务书 §17](./docs/IMPLEMENTATION_BRIEF.md) 与 [修复与隐私内容扩展实施计划](./docs/REMEDIATION_AND_PRIVACY_EXPANSION_PLAN.md) 的验收清单：`npm run lint` / `npm run test`（149/149）/ `npm run build` 通过，Preview 8 路由 HTTP 冒烟通过，路径级安全校验覆盖全部场景；浏览器人工验收与内容审校结论见 [docs/ACCEPTANCE_REPORT.md](./docs/ACCEPTANCE_REPORT.md)。
