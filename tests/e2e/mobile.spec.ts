import { expect, test } from '@playwright/test'

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

test('移动端：底部导航、筛选抽屉与场景练习', async ({ page }) => {
  await page.goto('/')

  // 底部导航可见且可用
  const bottomNav = page.getByRole('navigation', { name: '主导航（移动端）' })
  await expect(bottomNav).toBeVisible()
  // 导航已收拢为 4 项，练习与实验室合并进「训练中心」（入口页 /lab）
  await bottomNav.getByRole('link', { name: '训练中心' }).click()
  await expect(page).toHaveURL(/\/lab$/)

  // 移动端筛选抽屉。直接进情境库，不经入口页文案，避免与入口页改版耦合
  await page.goto('/practice')
  await page.getByRole('button', { name: /筛选/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '初次约会' }).click()
  await expect(page.getByText('查看 2 个结果')).toBeVisible()
  await page.getByRole('button', { name: /查看 2 个结果/ }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()

  // 进入场景并完成一个节点
  await page.getByRole('heading', { name: '初次约会确认身体距离与亲吻意愿' }).click()
  await expect(page).toHaveURL(/\/practice\/s08$/)
  await page.getByRole('button', { name: /我可以牵你的手吗/ }).click()
  await expect(page.getByRole('button', { name: /重试此节点/ })).toBeVisible()

  // 360px 下无横向滚动
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
  expect(noOverflow).toBe(true)
})
