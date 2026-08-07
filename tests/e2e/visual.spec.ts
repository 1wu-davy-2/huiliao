import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = ['/', '/practice', '/lab', '/practice/s02']

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'huiliao:v1',
      JSON.stringify({
        schemaVersion: 1,
        settings: {
          isAdultConfirmed: true,
          selectedChallenges: ['start'],
          onboardingCompleted: true,
          reducedMotion: false,
        },
        progress: [],
        favorites: [],
        reflections: [],
      }),
    )
  })
})

for (const path of PAGES) {
  test(`视觉检查与截图：${path}`, async ({ page }, testInfo) => {
    const errors: string[] = []
    const resourceFailures: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(String(err)))
    page.on('response', (res) => {
      if (res.status() >= 400 && res.request().resourceType() !== 'document') {
        resourceFailures.push(`${res.status()} ${res.url()}`)
      }
    })

    await page.goto(path)
    await expect(page.locator('#root').first()).toBeVisible()

    // 三个目标视口均无横向滚动
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )
    expect(noOverflow, `${path} 存在横向滚动`).toBe(true)

    // 截图存档（视觉验证）
    const safePath = path.replace(/\//g, '_') || 'home'
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}${safePath}.png`,
      fullPage: true,
    })

    // 图片非空、无 404、无控制台错误
    if (path === '/practice/s02') {
      const avatar = page.locator('.avatar-img').first()
      await expect(avatar).toBeVisible()
      const loaded = await avatar.evaluate((img: HTMLImageElement) => img.naturalWidth > 0)
      expect(loaded, '头像图片未能加载').toBe(true)
    }
    expect(resourceFailures, `资源加载失败：${resourceFailures.join('、')}`).toEqual([])
    expect(errors, `控制台错误：${errors.join('；')}`).toEqual([])
  })
}

test('axe 无障碍扫描（桌面端）', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '无障碍扫描只在桌面端执行')
  for (const path of PAGES) {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(
      serious,
      `${path} 存在严重无障碍问题：${serious.map((v) => `${v.id}: ${v.help}`).join('；')}`,
    ).toEqual([])
  }
})
