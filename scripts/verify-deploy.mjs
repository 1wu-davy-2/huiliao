// 部署前产物校验：在 npm run build 之后运行，检查 dist/ 是否符合静态托管要求。
// 任一检查失败以非零退出码结束，阻断部署。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')

const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

// 0. 许可证
check(existsSync(join(ROOT, 'LICENSE')), 'LICENSE 文件缺失（AGPL-3.0）')

// 1. 入口与资源
const indexPath = join(DIST, 'index.html')
check(existsSync(indexPath), 'dist/index.html 不存在')
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8')
  check(html.length > 100, 'dist/index.html 为空或过小')
  check(/\/assets\/[^"]+\.(js|css)/.test(html), '入口资源未使用 /assets/ 路径')
}

const assetsDir = join(DIST, 'assets')
const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : []
const jsFiles = assets.filter((f) => f.endsWith('.js'))
const cssFiles = assets.filter((f) => f.endsWith('.css'))
check(jsFiles.length > 0, 'dist/assets 缺少 JS 文件')
check(cssFiles.length > 0, 'dist/assets 缺少 CSS 文件')
check(
  jsFiles.every((f) => /-[A-Za-z0-9_-]{8,}\.js$/.test(f)) && cssFiles.every((f) => /-[A-Za-z0-9_-]{8,}\.css$/.test(f)),
  'JS/CSS 文件名未带内容哈希',
)

// 1b. 自托管字体：CSP 为 font-src 'self'，字体必须随产物发出且不得回退到远程
const woff2 = assets.filter((f) => f.endsWith('.woff2'))
check(woff2.length > 0, 'dist/assets 缺少 woff2 字体（font-src 为 self，远程字体会被 CSP 拦截）')
for (const family of ['hanken-grotesk', 'work-sans', 'be-vietnam-pro']) {
  check(
    woff2.some((f) => f.startsWith(family)),
    `dist/assets 缺少 ${family} 的 woff2 子集`,
  )
}
const fontBytes = woff2.reduce((sum, f) => sum + statSync(join(assetsDir, f)).size, 0)
check(
  fontBytes < 600 * 1024,
  `woff2 总体积 ${Math.round(fontBytes / 1024)} KB 超过 600 KB，可能误打入未子集化字体`,
)
// 入口 CSS 不得引用远程字体源
if (cssFiles.length > 0) {
  const allCss = cssFiles.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n')
  check(
    !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(allCss),
    'CSS 中出现 Google Fonts 远程引用（会被 CSP font-src self 拦截）',
  )
}

// 1c. OFL-1.1 要求：分发字体软件时必须随附版权声明与许可证文本
const oflPath = join(DIST, 'licenses', 'fonts-OFL-1.1.txt')
check(
  existsSync(oflPath) && statSync(oflPath).size > 1000,
  'dist/licenses/fonts-OFL-1.1.txt 缺失或过小（自托管字体分发必须随附 OFL 许可证）',
)
if (existsSync(oflPath)) {
  const ofl = readFileSync(oflPath, 'utf8')
  for (const family of ['Hanken Grotesk', 'Work Sans', 'Be Vietnam Pro']) {
    check(ofl.includes(family), `OFL 许可证文件缺少 ${family} 的版权声明`)
  }
}

// 1d. 设计稿不得进入产物
check(!existsSync(join(DIST, 'stitch_')), 'dist 中出现 stitch_ 设计稿目录（应只存在于 docs/）')

// 2. 本地图片完整
const AVATARS = ['lina', 'ran', 'yue', 'yan', 'qing', 'tong', 'zhao', 'jie']
for (const name of AVATARS) {
  const p = join(DIST, 'images', 'avatars', `${name}.svg`)
  check(existsSync(p) && statSync(p).size > 100, `dist/images/avatars/${name}.svg 缺失或为空`)
}
check(existsSync(join(DIST, 'images', 'hero-communication.svg')), 'dist/images/hero-communication.svg 缺失')

// 3. 敏感信息扫描（只匹配真实凭据形态，避免 React 内部 input type 枚举等误报）
const SENSITIVE = /api[_-]?key\s*[:=]|api[_-]?secret|bearer\s+[A-Za-z0-9]{8,}|BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY/i
const ABS_PATH = /[A-Za-z]:\\[^"']+|\\Users\\[^"']+/i
for (const file of [...jsFiles, ...cssFiles]) {
  const content = readFileSync(join(assetsDir, file), 'utf8')
  if (SENSITIVE.test(content)) {
    failures.push(`${file} 可能包含敏感信息（API Key/Token/密码字样）`)
  }
  if (ABS_PATH.test(content)) {
    failures.push(`${file} 可能包含本机绝对路径`)
  }
}
check(!existsSync(join(DIST, '.env')), 'dist 中出现 .env')

// 4. favicon 资源
const FAVICON_FILES = ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']
for (const name of FAVICON_FILES) {
  const p = join(DIST, name)
  check(existsSync(p) && statSync(p).size > 0, `dist/${name} 缺失或为空`)
}
// 验证 ICO 魔数（前4字节：00 00 01 00）
const icoPath = join(DIST, 'favicon.ico')
if (existsSync(icoPath)) {
  const icoBuf = readFileSync(icoPath)
  check(icoBuf.length >= 22, 'favicon.ico 大小不足以包含 ICO 头')
  if (icoBuf.length >= 4) {
    const magicOk = icoBuf[0] === 0 && icoBuf[1] === 0 && icoBuf[2] === 1 && icoBuf[3] === 0
    check(magicOk, 'favicon.ico 魔数不正确（应为 ICO 格式）')
  }
}
// 验证 apple-touch-icon.png 为 180×180
const applePath = join(DIST, 'apple-touch-icon.png')
if (existsSync(applePath)) {
  const pngBuf = readFileSync(applePath)
  check(pngBuf.length >= 29, 'apple-touch-icon.png 大小不足以包含 PNG 头')
  const width = pngBuf.readUInt32BE(16)
  const height = pngBuf.readUInt32BE(20)
  check(width === 180 && height === 180, `apple-touch-icon.png 尺寸应为 180×180，实际为 ${width}×${height}`)
}

// 5. bundle 不含 draft 内容（按内容标记检查；reviewStatus 字段名本身是运行时合法代码）。
//    必须覆盖全部草稿：scenarios-draft.ts 的 s14–s18 标题与 ai-trials-draft.ts 的 18 道题标题。
//    新增草稿时必须同步把其唯一标题加到这里，否则发布门不会拦截泄漏。
const DRAFT_MARKERS = [
  // s14–s18（成年人情趣边界草稿场景）
  '成年人自愿情趣的事前边界协商',
  '绿黄红信号与中途撤回',
  '性结束后的事后照护协商',
  '性接触进行中的撤回与降级',
  '支配与臣服偏好不对等时的沟通',
  // 18 道 AI 试炼候选题（全部待人工审校）
  '初次认识——活动后的自然开口',
  '线上聊天——回应对方的一条朋友圈',
  '日常关心——对方说今天很累',
  '邀约——从聊天到提出见面',
  '表达好感——不让对方有压力',
  '对方回复变短——调整节奏',
  '对方明确拒绝——接受并体面收尾',
  '发生误会——澄清而不升级冲突',
  '亲密冲动——暂停并确认同意',
  '翻译任务——指定风格和受众',
  '摘要任务——限制长度和要点数',
  '分类任务——给定类别做判断',
  '结构化提取——从文本中提取指定字段',
  '防注入——写一个不被误导的 Prompt',
  '多步推理——先判断再生成',
  '多角色约束——同时满足多个用户画像',
  '格式化约束——生成合法 CSV 并处理特殊字符',
  '链式约束——多轮条件输出格式',
]
for (const file of jsFiles) {
  const content = readFileSync(join(assetsDir, file), 'utf8')
  for (const marker of DRAFT_MARKERS) {
    if (content.includes(marker)) {
      failures.push(`${file} 包含 draft 内容标记：${marker}`)
    }
  }
}

if (failures.length > 0) {
  console.error('部署产物校验失败：')
  for (const f of failures) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log(`部署产物校验通过：${jsFiles.length} JS、${cssFiles.length} CSS、${AVATARS.length} 头像、入口与敏感信息检查 OK`)
