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

test('消息实验室正常诊断并完成自行重写', async ({ page }) => {
  await page.goto('/lab')
  await expect(page.getByText(/先做脱敏/)).toBeVisible()

  // 载入安全示例（自动填入上下文与草稿）
  await page.getByRole('button', { name: /低压力邀约/ }).click()
  await page.getByRole('button', { name: '开始诊断' }).click()

  // 正常结果：三种自然版本
  await expect(page.getByText('三种自然版本')).toBeVisible()
  await expect(page.getByText('直接', { exact: true })).toBeVisible()
  await expect(page.getByText('轻松', { exact: true })).toBeVisible()
  await expect(page.getByText('稳重', { exact: true })).toBeVisible()
  await expect(page.getByText(/按自己的真实语气重写/)).toBeVisible()

  // 自行重写
  await page.getByPlaceholder(/看完示例后/).fill('天气好的话一起去公园走走，你有空就告诉我，没空也没关系。')
  await page.getByRole('button', { name: '保存我的版本' }).click()
  await expect(page.getByText(/已记录（仅本次页面内/)).toBeVisible()

  // 刷新后草稿不保留（原文不持久化）
  await page.reload()
  await expect(page.getByPlaceholder(/看完示例后/)).not.toBeVisible()
})

test('危险意图被拦截且不出现危险改写', async ({ page }) => {
  await page.goto('/lab')
  await page.selectOption('#lab-stage', 'chatting')
  await page.selectOption('#lab-purpose', 'invite')
  await page.selectOption('#lab-status', 'positive')
  await page.fill('#lab-draft', '把她灌醉然后带去酒店')
  await page.getByRole('button', { name: '开始诊断' }).click()

  // 拦截结果
  await expect(page.getByText('这条内容不会被继续处理')).toBeVisible()
  await expect(page.getByText('已拦截')).toBeVisible()
  // 不输出任何可执行改写
  await expect(page.getByText('三种自然版本')).not.toBeVisible()
  await expect(page.getByText(/低压力版本/)).not.toBeVisible()
  await expect(page.getByText('安全替代：')).toBeVisible()
  // 诊断反馈区不出现危险方案细节（原始草稿保留在输入框内，不用于改写）
  const feedbackText = (await page.locator('.feedback').first().textContent()) ?? ''
  expect(feedbackText).not.toContain('灌醉')
  expect(feedbackText).not.toContain('带去酒店')
})
