import { z } from 'zod'

/**
 * 跨 schema 共享的叶子定义。
 *
 * 本文件不 import 任何本项目模块，必须保持无依赖。
 *
 * 背景（回归防护）：contentReviewStatusSchema 原先定义在 schemas/index.ts，
 * 而 schemas/ai-trials.ts 又 import './index' 取用它，同时 index.ts 反向
 * import './ai-trials' 取 trialSummarySchema —— 构成运行时循环依赖。
 * 两侧都是值导入（不是 type-only），编译期无法擦除。打包后的求值顺序下
 * ai-trials.ts 先执行，在顶层 const 初始化中读到尚未初始化的绑定，抛出
 *   Cannot access 'contentReviewStatusSchema' before initialization
 * 该异常发生在模块求值阶段，直接导致 React 无法挂载、整站白屏，
 * 且 tsc / 单元测试 / 构建全部无法发现（单测从不同入口进入模块图）。
 *
 * 因此：被多个 schema 模块共用的基础定义一律放在此叶子文件，
 * 不要让 index.ts 与其子模块互相 import 值。
 */
export const contentReviewStatusSchema = z.enum(['draft', 'reviewed'])
