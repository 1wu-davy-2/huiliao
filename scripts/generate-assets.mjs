// 生成「会聊」本地矢量资产：8 个虚构练习角色头像 + 1 张日常交流主图。
// 全部为程序化生成的原创几何图形，不使用任何真人照片或远程资源。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const AVATAR_DIR = join(ROOT, 'public', 'images', 'avatars')

// 角色与配色（取自产品设计令牌色系）
const CHARACTERS = [
  { id: 'lina', bg: '#e2efec', hair: '#3a423e', shirt: '#217a70', style: 'long' },
  { id: 'ran', bg: '#f7efdc', hair: '#202522', shirt: '#b78324', style: 'bob' },
  { id: 'yue', bg: '#e6f1ea', hair: '#4a3226', shirt: '#2f7d4d', style: 'ponytail' },
  { id: 'yan', bg: '#fae9e5', hair: '#202522', shirt: '#c45846', style: 'short' },
  { id: 'qing', bg: '#eef0f6', hair: '#3a423e', shirt: '#165e57', style: 'bun' },
  { id: 'tong', bg: '#f5efe4', hair: '#4a3226', shirt: '#66706a', style: 'long' },
  { id: 'zhao', bg: '#e2efec', hair: '#202522', shirt: '#217a70', style: 'bob' },
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
  <rect width="800" height="400" fill="#f6f7f4"/>
  <rect x="0" y="300" width="800" height="100" fill="#eef0ec"/>
  <rect x="60" y="60" width="120" height="200" rx="8" fill="#e2efec"/>
  <rect x="620" y="70" width="120" height="180" rx="8" fill="#f7efdc"/>
  <circle cx="700" cy="120" r="26" fill="#b78324" opacity="0.35"/>
  <rect x="240" y="250" width="40" height="50" rx="6" fill="#c4ccc6"/>
  <rect x="280" y="250" width="40" height="50" rx="6" fill="#c4ccc6"/>
  <rect x="520" y="250" width="40" height="50" rx="6" fill="#c4ccc6"/>
  <rect x="560" y="250" width="40" height="50" rx="6" fill="#c4ccc6"/>
  <rect x="376" y="196" width="48" height="30" rx="10" fill="#202522"/>
  <rect x="380" y="200" width="40" height="6" rx="3" fill="#b78324"/>
  <path d="M180 300 L180 236 Q180 196 226 190 L226 300 Z" fill="#66706a"/>
  <circle cx="204" cy="196" r="24" fill="#e8c9a8"/>
  <path d="M180 196 A24 24 0 0 1 228 196 Z" fill="#3a423e"/>
  <path d="M140 300 L140 246 Q140 214 174 210 L174 300 Z" fill="#217a70"/>
  <circle cx="158" cy="216" r="20" fill="#e8c9a8"/>
  <path d="M138 216 A20 20 0 0 1 178 216 Z" fill="#202522"/>
  <path d="M620 300 L620 240 Q620 204 570 200 L570 300 Z" fill="#165e57"/>
  <circle cx="596" cy="206" r="24" fill="#e8c9a8"/>
  <path d="M620 206 A24 24 0 0 0 572 206 Z" fill="#3a423e"/>
  <path d="M660 300 L660 250 Q660 220 628 214 L628 300 Z" fill="#b78324"/>
  <circle cx="644" cy="226" r="20" fill="#e8c9a8"/>
  <path d="M662 226 A20 20 0 0 0 626 226 Z" fill="#4a3226"/>
</svg>
`

mkdirSync(AVATAR_DIR, { recursive: true })
for (const c of CHARACTERS) {
  writeFileSync(join(AVATAR_DIR, `${c.id}.svg`), avatarSvg(c))
}
writeFileSync(join(ROOT, 'public', 'images', 'hero-communication.svg'), HERO)
console.log(`已生成 ${CHARACTERS.length} 个头像与主图：${AVATAR_DIR}`)
