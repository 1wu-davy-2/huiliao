# 图片资产说明

本目录全部为**程序化生成的原创矢量资产**，不包含任何真人照片、外部图片或远程热链。

## 生成方式

- 生成脚本：`scripts/generate-assets.mjs`（Node 内置模块，无第三方依赖）。
- 所有图形由基础几何形状（圆、矩形、路径）按固定模板组合而成，配色取自产品设计令牌色系（`src/styles/tokens.css`）。
- 重新生成：`node scripts/generate-assets.mjs`。

## 文件清单

| 文件 | 内容 | 用途 |
| --- | --- | --- |
| `avatars/{lina,ran,yue,yan,qing,tong,zhao,jie}.svg` | 8 个一致风格的几何人像头像 | 虚构练习角色（对应 `src/content/characters.ts`），模拟对话与反馈中展示 |
| `hero-communication.svg` | 咖啡店对坐交流场景 | 成年人日常交流主图（备用展示） |
| `brand-mark.svg` | 描边对话气泡 | 侧栏品牌标记（`AppLayout` 的 `.brand-mark`），替换原 lucide `MessageCircle` |
| `illus-diagnose.svg` | 文字行逐步散为圆点粒子 | `/lab` 入口页「消息诊断」卡面装饰 |
| `illus-simulate.svg` | 两个抽象人形与之间的连接线 | `/lab` 入口页「AI 情景模拟」卡面装饰 |

## 合规说明

- 角色头像均为抽象几何图形，无人像识别特征，无性暗示，风格克制。
- 所有头像明确用于虚构练习角色（界面中有「虚构练习角色」标注）。
- 图片全部本地托管，页面不引用任何远程 URL。
- `brand-mark.svg` / `illus-diagnose.svg` / `illus-simulate.svg` 为**纯装饰**，引用时必须写
  `alt="" aria-hidden="true"`，语义由相邻文本承载。三者均不含 `role` / `aria-label`，
  也不含任何文字字形（避免绕过 `verify-deploy.mjs` 的草稿标记检查）。
- `brand-mark.svg` 描边取 `--primary-container`（#7faf7b）。该色在浅底约 2.4:1，
  按 `src/styles/tokens.css` 的约定**仅可用于描边与低强调装饰，禁止用作文字色**。
- 设计稿（`docs/design/stitch/`）中的远程图片（`lh3.googleusercontent.com`）与
  Material Symbols 图标字体均被部署 CSP 拦截，一律不得引入；图标统一用 lucide-react。
