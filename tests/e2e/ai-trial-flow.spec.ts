import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * AI 试炼场端到端流程。
 *
 * 所有 /api/ai/* 请求一律被拦截并以本地夹具应答，绝不调用真实模型服务。
 *
 * 注意：当前已审校题池为空（人工审校发布门），因此 /lab/ai 只渲染
 * “暂无已审核题目”，设置、试炼与历史界面均不可达。本文件因此分成两部分：
 *   1. 现在就能断言的发布门与拦截行为
 *   2. 题池开放后才能跑的完整流程（test.skip，附解除条件）
 * 题目通过审校后，删除 POOL_EMPTY 常量与相应 skip 即可启用。
 */

const POOL_EMPTY = true

const SENTINEL_KEY = 'sk-e2e-sentinel-must-never-appear'

const TURN_BODY = {
  text: '我听到你说的了。不过我今天不太想聊这个，换个话题好吗？',
  finishReason: 'stop',
  usage: { inputTokens: 120, outputTokens: 40 },
}

const EVALUATE_BODY = {
  hardChecks: [{ type: 'nonEmpty', passed: true, explanation: '输出非空' }],
  hardScore: 100,
  evaluation: {
    score: 78,
    strengths: ['回应了对方的话题'],
    weaknesses: ['可以更具体'],
    nextAction: '下次补一个真实细节',
    disclaimer: 'model-self-evaluation',
  },
}

interface Recorded {
  url: string
  method: string
  headers: Record<string, string>
  body: string
}

/** 拦截两个端点，记录请求以便断言凭据只走专用头。 */
async function mockAiApi(page: Page, recorded: Recorded[]) {
  const handler = async (route: Route, payload: unknown) => {
    const request = route.request()
    recorded.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      body: request.postData() ?? '',
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  }
  await page.route('**/api/ai/turn', (route) => handler(route, TURN_BODY))
  await page.route('**/api/ai/evaluate', (route) => handler(route, EVALUATE_BODY))
}

/** 跳过首次设置门禁，直接进入应用。 */
async function completeOnboarding(page: Page) {
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
}

test.describe('AI 试炼场 · 发布门', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page)
  })

  test('实验室页提供到 AI 试炼场的二级入口，且未新增第六个底部导航项', async ({ page }) => {
    await page.goto('/lab')
    await expect(page.getByRole('heading', { name: '训练中心' })).toBeVisible()

    // 入口页每节是一个具名 region；按 region 取作用域，避免 strict-mode 命中多个链接
    const aiEntry = page.getByRole('region', { name: 'AI 情景模拟' })
    const aiLink = aiEntry.getByRole('link', { name: '选择场景' })
    await expect(aiLink).toBeVisible()
    await expect(aiLink).toHaveAttribute('href', '/lab/ai')

    // 底部导航仍是五项
    const bottomNav = page.locator('.bottom-nav')
    if (await bottomNav.isVisible()) {
      await expect(bottomNav.getByRole('link')).toHaveCount(5)
    }
  })

  test('题池为空时显示暂无已审核题目，不渲染任何凭据输入', async ({ page }) => {
    const recorded: Recorded[] = []
    await mockAiApi(page, recorded)

    await page.goto('/lab/ai')
    await expect(page.getByText('暂无已审核题目')).toBeVisible()

    // 发布门未解除前不得暴露 API Key 输入或开始试炼
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '开始试炼' })).toHaveCount(0)

    // 且不得自发调用任何模型接口
    expect(recorded).toHaveLength(0)
  })

  test('页面无横向溢出、无控制台错误、无资源 404', async ({ page }) => {
    const consoleErrors: string[] = []
    const failedResponses: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('response', (res) => {
      if (res.status() === 404) failedResponses.push(res.url())
    })

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 360, height: 800 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/lab/ai')
      await expect(page.getByText('暂无已审核题目')).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `viewport ${viewport.width} 出现横向溢出`).toBeLessThanOrEqual(1)
    }

    expect(consoleErrors).toEqual([])
    expect(failedResponses).toEqual([])
  })

  test('favicon 资源可用', async ({ page }) => {
    for (const asset of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png']) {
      const res = await page.request.get(asset)
      expect(res.status(), asset).toBe(200)
    }
  })
})

test.describe('AI 试炼场 · 完整流程', () => {
  // 解除条件：src/content/ai-trials.ts 的已审校题池不再为空
  // （人工审校清单签字后），删除 POOL_EMPTY 并移除本 skip。
  test.skip(POOL_EMPTY, '已审校题池为空：设置、试炼与历史界面尚不可达')

  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page)
  })

  test('设置 → 同意 → 随机题目 → 一轮成功 → 自评 → 保存历史', async ({ page }) => {
    const recorded: Recorded[] = []
    await mockAiApi(page, recorded)

    await page.goto('/lab/ai')

    await page.getByRole('button', { name: '沟通试炼' }).click()
    await page.getByRole('button', { name: '简单' }).click()
    await page.getByLabel('模型 ID').fill('gpt-4o-mini')
    await page.getByLabel('API Key').fill(SENTINEL_KEY)
    await page.getByLabel(/我知道输入和模型回复会发送到我填写的模型服务/).check()
    await page.getByRole('button', { name: '随机换一题' }).click()
    await page.getByRole('button', { name: '开始试炼' }).click()

    await page.getByLabel('你的回应').fill('你之前提到的那条徒步路线，我上个月也走过。')
    await page.getByRole('button', { name: '发送' }).click()

    await expect(page.getByText(TURN_BODY.text)).toBeVisible()
    await expect(page.getByText(/第\s*1\s*\/\s*\d+\s*轮/)).toBeVisible()

    await page.getByRole('button', { name: '结束并评估' }).click()

    await expect(page.getByRole('heading', { name: '硬规则检查' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '模型自评' })).toBeVisible()
    await expect(page.getByText('模型自评，仅供比较，不是客观基准')).toBeVisible()

    // 凭据只出现在专用头，绝不进 JSON 正文或 URL
    expect(recorded.length).toBeGreaterThanOrEqual(2)
    for (const call of recorded) {
      expect(call.headers['x-huiliao-api-key']).toBe(SENTINEL_KEY)
      expect(call.body).not.toContain(SENTINEL_KEY)
      expect(call.body).not.toContain('apiKey')
      expect(call.url).not.toContain(SENTINEL_KEY)
      expect(call.headers.authorization).toBeUndefined()
    }
  })

  test('取消请求不消耗轮数且可重试', async ({ page }) => {
    await page.route('**/api/ai/turn', async (route) => {
      // 挂起，交由界面取消
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      await route.abort('failed')
    })

    await page.goto('/lab/ai')
    await page.getByLabel('模型 ID').fill('gpt-4o-mini')
    await page.getByLabel('API Key').fill(SENTINEL_KEY)
    await page.getByLabel(/我知道输入和模型回复会发送到我填写的模型服务/).check()
    await page.getByRole('button', { name: '开始试炼' }).click()

    await page.getByLabel('你的回应').fill('先说一句正常的话。')
    await page.getByRole('button', { name: '发送' }).click()
    await page.getByRole('button', { name: '取消' }).click()

    await expect(page.getByText(/第\s*0\s*\/\s*\d+\s*轮/)).toBeVisible()
    await expect(page.getByRole('button', { name: '发送' })).toBeEnabled()
  })

  test('自评 JSON 非法时显示模型自评不可用且不阻塞硬规则结果', async ({ page }) => {
    await page.route('**/api/ai/turn', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TURN_BODY) }),
    )
    await page.route('**/api/ai/evaluate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hardChecks: [], hardScore: 0, evaluation: null }),
      }),
    )

    await page.goto('/lab/ai')
    await page.getByLabel('模型 ID').fill('gpt-4o-mini')
    await page.getByLabel('API Key').fill(SENTINEL_KEY)
    await page.getByLabel(/我知道输入和模型回复会发送到我填写的模型服务/).check()
    await page.getByRole('button', { name: '开始试炼' }).click()
    await page.getByLabel('你的回应').fill('一句正常的回应。')
    await page.getByRole('button', { name: '发送' }).click()
    await page.getByRole('button', { name: '结束并评估' }).click()

    await expect(page.getByRole('heading', { name: '硬规则检查' })).toBeVisible()
    await expect(page.getByText('模型自评不可用')).toBeVisible()
  })

  test('达到 5 轮下限与 30 轮上限后自动结束', async ({ page }) => {
    const recorded: Recorded[] = []
    await mockAiApi(page, recorded)

    await page.goto('/lab/ai')
    await page.getByLabel('模型 ID').fill('gpt-4o-mini')
    await page.getByLabel('API Key').fill(SENTINEL_KEY)
    await page.getByLabel('最大轮数').fill('5')
    await page.getByLabel(/我知道输入和模型回复会发送到我填写的模型服务/).check()
    await page.getByRole('button', { name: '开始试炼' }).click()

    for (let i = 0; i < 5; i += 1) {
      await page.getByLabel('你的回应').fill(`第 ${i + 1} 条正常回应。`)
      await page.getByRole('button', { name: '发送' }).click()
      await expect(page.getByText(new RegExp(`第\\s*${i + 1}\\s*/\\s*5\\s*轮`))).toBeVisible()
    }

    await expect(page.getByText('已达到你设定的轮数')).toBeVisible()
    // 达到上限自动进入评估，结果视图不再提供继续发送的入口
    await expect(page.getByRole('button', { name: '发送' })).toHaveCount(0)
  })

  test('历史记录可刷新后保留、导出与删除', async ({ page }) => {
    const recorded: Recorded[] = []
    await mockAiApi(page, recorded)

    await page.goto('/lab/ai')
    await page.getByLabel('模型 ID').fill('gpt-4o-mini')
    await page.getByLabel('API Key').fill(SENTINEL_KEY)
    await page.getByLabel(/我知道输入和模型回复会发送到我填写的模型服务/).check()
    await page.getByRole('button', { name: '开始试炼' }).click()
    await page.getByLabel('你的回应').fill('一句正常的回应。')
    await page.getByRole('button', { name: '发送' }).click()
    await page.getByRole('button', { name: '结束并评估' }).click()
    await expect(page.getByRole('heading', { name: '模型自评' })).toBeVisible()

    // 刷新后历史仍在（IndexedDB 持久化）
    await page.reload()
    await page.getByRole('button', { name: '查看本地历史' }).click()
    await expect(page.getByText('gpt-4o-mini')).toBeVisible()
    await expect(
      page.getByText('完整对话只保存在当前浏览器 IndexedDB，最近 20 次或 25 MB，达到上限自动清理最旧记录。'),
    ).toBeVisible()

    // 导出不含凭据
    const download = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出' }).first().click(),
    ]).then(([d]) => d)
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const exported = Buffer.concat(chunks).toString('utf8')
    expect(exported).not.toContain(SENTINEL_KEY)
    expect(exported).not.toContain('apiKey')

    // 删除本次后列表清空
    await page.getByRole('button', { name: '删除' }).first().click()
    await expect(page.getByText('暂无历史记录')).toBeVisible()
  })

  test('底部导航不遮挡输入框与结束按钮（360×800）', async ({ page }) => {
    await mockAiApi(page, [])
    await page.setViewportSize({ width: 360, height: 800 })

    await page.goto('/lab/ai')
    await page.getByLabel('模型 ID').fill('gpt-4o-mini')
    await page.getByLabel('API Key').fill(SENTINEL_KEY)
    await page.getByLabel(/我知道输入和模型回复会发送到我填写的模型服务/).check()
    await page.getByRole('button', { name: '开始试炼' }).click()

    const composer = page.getByLabel('你的回应')
    const finish = page.getByRole('button', { name: '结束并评估' })
    const nav = page.locator('.bottom-nav')

    const composerBox = await composer.boundingBox()
    const finishBox = await finish.boundingBox()
    const navBox = await nav.boundingBox()

    expect(composerBox).not.toBeNull()
    expect(finishBox).not.toBeNull()
    if (navBox && composerBox) {
      expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(navBox.y + 1)
    }
    if (navBox && finishBox) {
      expect(finishBox.y + finishBox.height).toBeLessThanOrEqual(navBox.y + 1)
    }
  })
})
