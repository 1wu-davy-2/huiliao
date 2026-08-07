import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { SCENARIOS } from '@/content'

const ROOT = join(process.cwd())

function readJson(relative: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, relative), 'utf8'))
}

interface VercelConfig {
  framework?: string
  installCommand?: string
  buildCommand?: string
  outputDirectory?: string
  trailingSlash?: boolean
  rewrites?: Array<{ source: string; destination: string }>
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
}

describe('Vercel 部署配置', () => {
  it('vercel.json 存在且可解析', () => {
    expect(existsSync(join(ROOT, 'vercel.json'))).toBe(true)
    const config = readJson('vercel.json') as VercelConfig
    expect(config.framework).toBe('vite')
    expect(config.installCommand).toBe('npm ci')
    expect(config.buildCommand).toContain('verify:deploy')
    expect(config.outputDirectory).toBe('dist')
    expect(config.trailingSlash).toBe(false)
  })

  it('SPA 深层路由 rewrite 指向 index.html', () => {
    const config = readJson('vercel.json') as VercelConfig
    const catchAll = config.rewrites?.find((r) => r.source === '/(.*)')
    expect(catchAll).toBeDefined()
    expect(catchAll?.destination).toBe('/index.html')
  })

  it('安全响应头完整（CSP/nosniff/DENY/no-referrer/Permissions-Policy）', () => {
    const config = readJson('vercel.json') as VercelConfig
    const pageHeaders = config.headers?.find((h) => h.source === '/(.*)')?.headers ?? []
    const keys = pageHeaders.map((h) => h.key)
    expect(keys).toContain('Content-Security-Policy')
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
    expect(keys).toContain('Referrer-Policy')
    expect(keys).toContain('Permissions-Policy')

    const csp = pageHeaders.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("img-src 'self' data:")
    // 当前代码使用 React 内联样式，保留 style-src 'unsafe-inline'
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('assets 目录带内容哈希的资源使用一年 immutable 缓存', () => {
    const config = readJson('vercel.json') as VercelConfig
    const assetHeaders = config.headers?.find((h) => h.source === '/assets/(.*)')?.headers ?? []
    const cache = assetHeaders.find((h) => h.key === 'Cache-Control')?.value
    expect(cache).toBe('public, max-age=31536000, immutable')
  })

  it('package.json 锁定 Node 22.x 且保留全部现有脚本', () => {
    const pkg = readJson('package.json') as {
      engines?: { node?: string }
      scripts?: Record<string, string>
    }
    expect(pkg.engines?.node).toBe('22.x')
    for (const script of ['dev', 'build', 'preview', 'test', 'lint', 'e2e']) {
      expect(pkg.scripts?.[script], script).toBeDefined()
    }
    expect(pkg.scripts?.['verify:deploy']).toContain('lint')
    expect(pkg.scripts?.['verify:deploy']).toContain('test')
    expect(pkg.scripts?.['verify:deploy']).toContain('build')
  })

  it('.vercelignore 存在且忽略 dist，.gitignore 忽略 .vercel', () => {
    expect(existsSync(join(ROOT, '.vercelignore'))).toBe(true)
    const ignore = readFileSync(join(ROOT, '.vercelignore'), 'utf8')
    expect(ignore).toContain('dist/')
    expect(ignore).toContain('test-results/')
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8')
    expect(gitignore).toContain('.vercel/')
  })

  it('主内容入口不含 draft 场景（draft 不进生产 bundle）', () => {
    expect(SCENARIOS.some((s) => s.reviewStatus === 'draft')).toBe(false)
  })

  it('index.html 引用了 favicon.svg 和 favicon.ico', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
    expect(html).toContain('/favicon.svg')
    expect(html).toContain('/favicon.ico')
  })

  it('public/favicon.ico 包含合法 ICO 魔数', () => {
    const icoPath = join(ROOT, 'public', 'favicon.ico')
    expect(existsSync(icoPath)).toBe(true)
    const buf = readFileSync(icoPath)
    expect(buf.length).toBeGreaterThanOrEqual(22)
    expect(buf[0]).toBe(0)
    expect(buf[1]).toBe(0)
    expect(buf[2]).toBe(1)
    expect(buf[3]).toBe(0)
  })

  it('public/apple-touch-icon.png 为 180×180 PNG', () => {
    const pngPath = join(ROOT, 'public', 'apple-touch-icon.png')
    expect(existsSync(pngPath)).toBe(true)
    const buf = readFileSync(pngPath)
    expect(buf.length).toBeGreaterThanOrEqual(29)
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    expect(width).toBe(180)
    expect(height).toBe(180)
  })
})
