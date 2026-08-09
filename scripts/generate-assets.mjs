// 生成「会聊」本地矢量资产：8 个虚构练习角色头像 + 1 张日常交流主图。
// 全部为程序化生成的原创几何图形，不使用任何真人照片或远程资源。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const AVATAR_DIR = join(ROOT, 'public', 'images', 'avatars')

// 角色与配色（取自产品设计令牌色系）
const CHARACTERS = [
  { id: 'lina', bg: '#eaf1e8', hair: '#3a423e', shirt: '#3c683b', style: 'long' },
  { id: 'ran', bg: '#f7efdc', hair: '#1c1b1b', shirt: '#b78324', style: 'bob' },
  { id: 'yue', bg: '#e6f1ea', hair: '#4a3226', shirt: '#2f7d4d', style: 'ponytail' },
  { id: 'yan', bg: '#ffdad6', hair: '#1c1b1b', shirt: '#c45846', style: 'short' },
  { id: 'qing', bg: '#eef0f6', hair: '#3a423e', shirt: '#245026', style: 'bun' },
  { id: 'tong', bg: '#f5efe4', hair: '#4a3226', shirt: '#66706a', style: 'long' },
  { id: 'zhao', bg: '#eaf1e8', hair: '#1c1b1b', shirt: '#3c683b', style: 'bob' },
  { id: 'jie', bg: '#f7efdc', hair: '#3a423e', shirt: '#b78324', style: 'ponytail' },
]

const SKIN = '#e8c9a8'

// 发型形状（几何组合，风格统一）：
//   cap  = 头顶半圆（基础帽子），差异部分按 style 追加
function hairShapes(style, hair) {
  const parts = []
  switch (style) {
    case 'short':
      parts.push(`<path d="M34 64 A30 30 0 0 1 94 64 Z" fill="${hair}"/>`)
      break
    case 'long':
      parts.push(`<path d="M24 72 A40 40 0 0 1 104 72 Z" fill="${hair}"/>`)
      parts.push(`<rect x="20" y="64" width="9" height="28" rx="4.5" fill="${hair}"/>`)
      parts.push(`<rect x="99" y="64" width="9" height="28" rx="4.5" fill="${hair}"/>`)
      break
    case 'bob':
      parts.push(`<path d="M24 80 A40 40 0 0 1 104 80 L104 78 L24 78 Z" fill="${hair}"/>`)
      parts.push(`<rect x="22" y="66" width="8" height="22" rx="4" fill="${hair}"/>`)
      parts.push(`<rect x="98" y="66" width="8" height="22" rx="4" fill="${hair}"/>`)
      break
    case 'ponytail':
      parts.push(`<path d="M24 72 A40 40 0 0 1 104 72 Z" fill="${hair}"/>`)
      parts.push(`<circle cx="105" cy="58" r="11" fill="${hair}"/>`)
      break
    case 'bun':
      parts.push(`<path d="M24 72 A40 40 0 0 1 104 72 Z" fill="${hair}"/>`)
      parts.push(`<circle cx="64" cy="25" r="10" fill="${hair}"/>`)
      break
    default:
      parts.push(`<path d="M24 72 A40 40 0 0 1 104 72 Z" fill="${hair}"/>`)
  }
  return parts.join('\n    ')
}

function avatarSvg(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${c.id}（虚构练习角色）头像">
  <defs>
    <clipPath id="clip-${c.id}"><circle cx="64" cy="64" r="64"/></clipPath>
  </defs>
  <g clip-path="url(#clip-${c.id})">
    <rect width="128" height="128" fill="${c.bg}"/>
    <path d="M0 128 L0 102 Q64 80 128 102 L128 128 Z" fill="${c.shirt}"/>
    <path d="M56 108 L72 108 L64 98 Z" fill="${c.bg}"/>
    <rect x="56" y="84" width="16" height="22" fill="${SKIN}"/>
    <circle cx="64" cy="66" r="21" fill="${SKIN}"/>
    <circle cx="43" cy="66" r="6" fill="${SKIN}"/>
    <circle cx="85" cy="66" r="6" fill="${SKIN}"/>
    ${hairShapes(c.style, c.hair)}
  </g>
</svg>
`
}

const HERO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" role="img" aria-label="成年人在咖啡店对坐交流的插画">
  <rect width="800" height="400" fill="#fcf9f8"/>
  <rect x="0" y="300" width="800" height="100" fill="#eef0ec"/>
  <rect x="60" y="60" width="120" height="200" rx="8" fill="#eaf1e8"/>
  <rect x="620" y="70" width="120" height="180" rx="8" fill="#f7efdc"/>
  <circle cx="700" cy="120" r="26" fill="#b78324" opacity="0.35"/>
  <rect x="240" y="250" width="40" height="50" rx="6" fill="#c2c9bd"/>
  <rect x="280" y="250" width="40" height="50" rx="6" fill="#c2c9bd"/>
  <rect x="520" y="250" width="40" height="50" rx="6" fill="#c2c9bd"/>
  <rect x="560" y="250" width="40" height="50" rx="6" fill="#c2c9bd"/>
  <rect x="376" y="196" width="48" height="30" rx="10" fill="#1c1b1b"/>
  <rect x="380" y="200" width="40" height="6" rx="3" fill="#b78324"/>
  <path d="M180 300 L180 236 Q180 196 226 190 L226 300 Z" fill="#66706a"/>
  <circle cx="204" cy="196" r="24" fill="#e8c9a8"/>
  <path d="M180 196 A24 24 0 0 1 228 196 Z" fill="#3a423e"/>
  <path d="M140 300 L140 246 Q140 214 174 210 L174 300 Z" fill="#3c683b"/>
  <circle cx="158" cy="216" r="20" fill="#e8c9a8"/>
  <path d="M138 216 A20 20 0 0 1 178 216 Z" fill="#1c1b1b"/>
  <path d="M620 300 L620 240 Q620 204 570 200 L570 300 Z" fill="#245026"/>
  <circle cx="596" cy="206" r="24" fill="#e8c9a8"/>
  <path d="M620 206 A24 24 0 0 0 572 206 Z" fill="#3a423e"/>
  <path d="M660 300 L660 250 Q660 220 628 214 L628 300 Z" fill="#b78324"/>
  <circle cx="644" cy="226" r="20" fill="#e8c9a8"/>
  <path d="M662 226 A20 20 0 0 0 626 226 Z" fill="#4a3226"/>
</svg>
`

// ---------- 品牌标记与入口页插画 ----------
// 三者均为纯装饰：界面侧以 <img alt="" aria-hidden="true"> 引入，
// 因此 SVG 内部不写 role/aria-label，避免被内联时重复播报。
// 所有坐标为固定表，不使用随机数，重复生成结果逐字节一致。

// 品牌标记：描边对话气泡（对应 docs/design/stitch/logo/screen.png）。
// 描边色取 --primary-container(#7faf7b)：该色在浅底约 2.4:1，
// 按 tokens.css 注释只可用于描边/装饰，不可承载文字。
const BRAND_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path
    d="M64 22 C87 22 106 38 106 58 C106 70 100 79 91 85 C95 93 100 101 99 106 C97 111 90 107 84 102 C78 97 74 93 70 90 C68 90 66 91 64 91 C41 91 22 78 22 58 C22 38 41 22 64 22 Z"
    fill="none" stroke="#7faf7b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

// 消息诊断：整齐的文字行向右逐步碎成颗粒，隐喻「把草稿拆开看」。
function diagnoseSvg() {
  const ROWS = [176, 148, 192, 132, 164]
  const DASHES = [30, 24, 18]
  const DASH_OPACITY = [0.55, 0.4, 0.28]
  const DOTS = [
    { r: 6, fill: '#7faf7b', opacity: 0.85 },
    { r: 5, fill: '#3c683b', opacity: 0.7 },
    { r: 4, fill: '#7faf7b', opacity: 0.55 },
    { r: 3, fill: '#3c683b', opacity: 0.4 },
    { r: 2.5, fill: '#7faf7b', opacity: 0.28 },
  ]
  const parts = []
  ROWS.forEach((lineWidth, index) => {
    const y = 54 + index * 44
    let x = 48
    parts.push(
      `<rect x="${x}" y="${y - 4.5}" width="${lineWidth}" height="9" rx="4.5" fill="#c2c9bd" opacity="0.85"/>`,
    )
    x += lineWidth + 16
    DASHES.forEach((dashWidth, dashIndex) => {
      parts.push(
        `<rect x="${x}" y="${y - 4.5}" width="${dashWidth}" height="9" rx="4.5" fill="#c2c9bd" opacity="${DASH_OPACITY[dashIndex]}"/>`,
      )
      x += dashWidth + 12
    })
    x += 8
    DOTS.forEach((dot, dotIndex) => {
      parts.push(
        `<circle cx="${x + dotIndex * 18}" cy="${y}" r="${dot.r}" fill="${dot.fill}" opacity="${dot.opacity}"/>`,
      )
    })
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300">
  ${parts.join('\n  ')}
</svg>
`
}

// AI 情景模拟：两个抽象人形相对而坐，中间是三条强弱不同的连接线。
function simulateSvg() {
  const figure = (cx, fill) =>
    [
      `<circle cx="${cx}" cy="110" r="26" fill="${fill}"/>`,
      `<path d="M ${cx - 36} 208 C ${cx - 36} 162 ${cx - 18} 148 ${cx} 148 C ${cx + 18} 148 ${cx + 36} 162 ${cx + 36} 208 Z" fill="${fill}"/>`,
    ].join('\n  ')
  const LINKS = [
    { dy: -26, width: 3, opacity: 0.9 },
    { dy: 0, width: 2.5, opacity: 0.6 },
    { dy: 26, width: 2, opacity: 0.38 },
  ]
  const links = LINKS.map(
    (link) =>
      `<path d="M 176 ${162 + link.dy} Q 240 ${132 + link.dy} 304 ${162 + link.dy}" fill="none" stroke="#7faf7b" stroke-width="${link.width}" stroke-linecap="round" opacity="${link.opacity}"/>`,
  )
  const beads = [216, 240, 264].map(
    (cx, index) =>
      `<circle cx="${cx}" cy="${index === 1 ? 141 : 144}" r="4" fill="#3c683b" opacity="0.5"/>`,
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300">
  <rect x="40" y="242" width="400" height="8" rx="4" fill="#c2c9bd" opacity="0.35"/>
  ${figure(132, '#3c683b')}
  ${figure(348, '#50616b')}
  ${links.join('\n  ')}
  ${beads.join('\n  ')}
</svg>
`
}

const IMAGE_DIR = join(ROOT, 'public', 'images')

mkdirSync(AVATAR_DIR, { recursive: true })
for (const c of CHARACTERS) {
  writeFileSync(join(AVATAR_DIR, `${c.id}.svg`), avatarSvg(c))
}
writeFileSync(join(IMAGE_DIR, 'hero-communication.svg'), HERO)
writeFileSync(join(IMAGE_DIR, 'brand-mark.svg'), BRAND_MARK)
writeFileSync(join(IMAGE_DIR, 'illus-diagnose.svg'), diagnoseSvg())
writeFileSync(join(IMAGE_DIR, 'illus-simulate.svg'), simulateSvg())
console.log(
  `已生成 ${CHARACTERS.length} 个头像、主图、品牌标记与 2 张入口插画：${IMAGE_DIR}`,
)
