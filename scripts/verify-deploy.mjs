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

// 4. bundle 不含 draft 场景（按场景内容标记检查；reviewStatus 字段名本身是运行时合法代码）
const DRAFT_MARKERS = ['成年人自愿情趣的事前边界协商', '绿黄红信号与中途撤回']
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
