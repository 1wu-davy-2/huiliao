import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/onboarding')
  await page.evaluate(() => {
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

test('完成一个三节点场景、重试一次并保存复盘', async ({ page }) => {
  await page.goto('/practice/s02')
  await expect(page.getByRole('heading', { name: '刚加好友后的第一轮聊天' })).toBeVisible()
  await expect(page.getByText('虚构练习角色')).toBeVisible()

  // 节点 1：选择合理表达
  await page.getByRole('button', { name: /那条路线是我上个月走的/ }).click()
  await expect(page.getByRole('button', { name: /重试此节点/ })).toBeVisible()
  await expect(page.getByText(/做得好的地方/)).toBeVisible()
  await page.getByRole('button', { name: /^继续$/ }).click()

  // 节点 2：选择后再重试一次
  await page.getByRole('button', { name: /连续上坡/ }).click()
  await page.getByRole('button', { name: /重试此节点/ }).click()
  await page.getByRole('button', { name: /连续上坡/ }).click()
  await page.getByRole('button', { name: /^继续$/ }).click()

  // 节点 3 → 结局
  await page.getByRole('button', { name: /我周末一般也是补觉/ }).click()
  await page.getByRole('button', { name: /^继续$/ }).click()

  // 结局视图
  await expect(page.getByText('练习结束')).toBeVisible()
  await expect(page.getByText('边界检查通过', { exact: true })).toBeVisible()

  // 保存私密复盘
  await page.getByPlaceholder(/写下这次练习中你注意到的/).fill('今天注意到自己提问太多，下次多分享。')
  await page.getByRole('button', { name: '保存复盘' }).click()
  await expect(page.getByRole('status')).toContainText('已保存在本浏览器')

  // 完成记录与复盘出现在首页
  await page.goto('/')
  await expect(page.getByText(/本周已完成 1 个情境练习/)).toBeVisible()
  await expect(page.getByText('今天注意到自己提问太多，下次多分享。')).toBeVisible()

  // 进度页有完成记录与边界正确率
  await page.goto('/progress')
  const boundarySection = page.getByRole('region', { name: '边界判断' })
  await expect(boundarySection.getByRole('heading', { name: '边界判断' })).toBeVisible()
  await expect(boundarySection.getByText('100%', { exact: true })).toBeVisible()
  await expect(page.getByText('边界通过', { exact: true })).toBeVisible()
})
