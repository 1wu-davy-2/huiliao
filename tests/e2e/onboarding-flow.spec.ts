import { expect, test } from '@playwright/test'

test('新用户完成首次设置并进入推荐练习', async ({ page }) => {
  await page.goto('/')
  // 未完成首次设置时重定向到首次设置
  await expect(page).toHaveURL(/\/onboarding$/)

  // 步骤 1：成年确认（未勾选不能继续）
  await page.getByRole('button', { name: '继续' }).click()
  await expect(page.getByRole('alert')).toContainText('18 岁')
  await page.getByLabel(/我已年满 18 岁/).check()
  await page.getByRole('button', { name: '继续' }).click()

  // 步骤 2：选择困难（最多两项）
  await page.getByLabel(/不知道怎么开口/).check()
  await page.getByLabel(/害怕被拒绝/).check()
  await page.getByRole('button', { name: '继续' }).click()

  // 步骤 3：基线判断
  await page.getByLabel(/退一步停止追问/).check()
  await page.getByLabel(/具体的时间、地点/).check()
  await page.getByLabel(/暂停并确认/).check()
  await page.getByRole('button', { name: '继续' }).click()

  // 步骤 4：确认互动原则
  await page.getByLabel(/真实表达/).check()
  await page.getByLabel(/让对方容易拒绝/).check()
  await page.getByLabel(/拒绝后停止/).check()
  await page.getByRole('button', { name: '完成并进入首页' }).click()

  // 完成设置后进入首页工作台
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: /今天练哪一场/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /继续练习/ })).toBeVisible()

  // 推荐场景为针对“不知道怎么开口”的 s02
  await expect(page.getByText(/刚加好友后的第一轮聊天/)).toBeVisible()

  // 重新加载后仍保持已设置状态
  await page.reload()
  await expect(page).toHaveURL(/\/$/)
})
