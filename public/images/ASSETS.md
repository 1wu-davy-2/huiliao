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

## 合规说明

- 角色头像均为抽象几何图形，无人像识别特征，无性暗示，风格克制。
- 所有头像明确用于虚构练习角色（界面中有「虚构练习角色」标注）。
- 图片全部本地托管，页面不引用任何远程 URL。
