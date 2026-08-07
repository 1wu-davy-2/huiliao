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
        progress: [
          {
            scenarioId: 's02',
            completedAt: '2026-08-06T10:00:00.000Z',
            attempts: 3,
            scores: { clarity: 80, authenticity: 70, listening: 75, pace: 66, boundaries: 62 },
            boundaryCheckPassed: true,
          },
        ],
        favorites: ['s02'],
        reflections: [
          {
            id: 'r-1',
            scenarioId: 's02',
            createdAt: '2026-08-06T10:05:00.000Z',
            text: '测试复盘内容',
          },
        ],
      }),
    )
  })
})

test('导出数据后清除数据，刷新仍回到首次设置', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: '设置与隐私' })).toBeVisible()

  // 导出 JSON
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /导出 JSON/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/huiliao-export-.*\.json$/)

  // 清除数据需要二次确认
  await page.getByRole('button', { name: /清除数据/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '取消' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('heading', { name: '设置与隐私' })).toBeVisible()

  // 确认清除后回到首次设置
  await page.getByRole('button', { name: /清除数据/ }).click()
  await page.getByRole('button', { name: '确认清除' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByRole('heading', { name: '首次设置' })).toBeVisible()

  // 刷新后仍停留在首次设置（数据不可恢复）
  await page.reload()
  await expect(page).toHaveURL(/\/onboarding$/)
})

test('重新进行首次设置', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /重新设置/ }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
})
