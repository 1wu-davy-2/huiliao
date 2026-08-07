import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')

const svgPath = resolve(publicDir, 'favicon.svg')
const svgBuffer = readFileSync(svgPath)

// 32px PNG
const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer()
writeFileSync(resolve(publicDir, 'favicon.png'), png32)
console.log('Created favicon.png (32×32)')

// 180px Apple touch icon
const apple180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer()
writeFileSync(resolve(publicDir, 'apple-touch-icon.png'), apple180)
console.log('Created apple-touch-icon.png (180×180)')

// ICO with PNG data (standard ICO container: 6-byte header + 16-byte directory entry + PNG payload)
const pngData = png32
const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)   // reserved
icoHeader.writeUInt16LE(1, 2)   // type: ICO
icoHeader.writeUInt16LE(1, 4)   // count: 1 image

const dirEntry = Buffer.alloc(16)
dirEntry.writeUInt8(32, 0)       // width (0 = 256)
dirEntry.writeUInt8(32, 1)       // height (0 = 256)
dirEntry.writeUInt8(0, 2)        // palette colors
dirEntry.writeUInt8(0, 3)        // reserved
dirEntry.writeUInt16LE(1, 4)     // color planes
dirEntry.writeUInt16LE(32, 6)    // bits per pixel
const bitmapSize = pngData.length
dirEntry.writeUInt32LE(bitmapSize, 8)   // image size
dirEntry.writeUInt32LE(22, 12)          // offset to image data (6 + 16 = 22)

const ico = Buffer.concat([icoHeader, dirEntry, pngData])
writeFileSync(resolve(publicDir, 'favicon.ico'), ico)
console.log(`Created favicon.ico (32×32, ${ico.length} bytes)`)

console.log('All favicon assets generated.')
