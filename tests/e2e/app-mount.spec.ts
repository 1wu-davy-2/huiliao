import { expect, test } from '@playwright/test'

/**
 * 应用挂载冒烟测试（回归闸门）。
 *
 * 存在原因：一次 schemas/index ⇄ schemas/ai-trials 的运行时循环依赖导致
 * "Cannot access 'contentReviewStatusSchema' before initialization"，
 * React 根本没有挂载，整个应用是空白页。而当时：
 *   - vitest 455 项全绿（每个测试文件从不同根进入模块图，绕开了真实求值顺序）
 *   - tsc 通过（类型层面循环导入完全合法）
 *   - vite build 通过（打包不校验 TDZ）
 *   - verify:deploy 通过（只检查产物文件与敏感串）
 *
 * 因此单元测试与构建都无法发现"白屏"。本文件断言每条路由都真的挂载了 React，
 * 且没有任何未捕获页面错误。任何模块级循环依赖或首屏抛错都会在此失败。
 */

const ROUTES = ['/', '/practice', '/lab', '/lab/ai', '/progress', '/settings', '/privacy']

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'huiliao:v1',
      JSON.stringify({
        schemaVersion: 2,
        settings: {
          isAdultConfirmed: true,
          selectedChallenges: ['start'],
          onboardingCompleted: true,
          reducedMotion: false,
        },
        progress: [],
        favorites: [],
        reflections: [],
        trialSummaries: [],
      }),
    )
  })
})

for (const route of ROUTES) {
  test(`${route} 挂载 React 且无未捕获错误`, async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []

    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto(route)

    // React 必须真的渲染出内容：空白页时 #root 没有子节点
    await expect(page.locator('#root > *').first()).toBeAttached()
    const rootChildren = await page.locator('#root > *').count()
    expect(rootChildren, `${route} 的 #root 没有子节点（React 未挂载）`).toBeGreaterThan(0)

    // 循环依赖 TDZ、首屏 throw 都会出现在 pageerror
    expect(pageErrors, `${route} 出现未捕获页面错误`).toEqual([])
    expect(consoleErrors, `${route} 出现控制台错误`).toEqual([])
  })
}
