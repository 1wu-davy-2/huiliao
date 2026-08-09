/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * 仅开发模式：将 /api/* 请求转发给 api/ 下的 Vercel Function 处理器。
 * 生产环境由 Vercel 运行时处理，此插件不影响 build。
 */
function devApiPlugin(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()

        // 读取请求体
        const chunks: Buffer[] = []
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: Buffer) => chunks.push(chunk))
          req.on('end', resolve)
          req.on('error', reject)
        })
        const rawBody = Buffer.concat(chunks).toString('utf-8')
        let body: unknown
        try {
          body = rawBody ? JSON.parse(rawBody) : {}
        } catch {
          body = {}
        }

        // 本地 curl / 开发调试通常不带 Origin；自动补全以通过同源校验
        const headers: Record<string, string | string[] | undefined> = { ...req.headers }
        if (!headers['origin']) {
          const host = (req.headers['host'] as string | undefined) ?? 'localhost:5173'
          headers['origin'] = `http://${host}`
        }

        // 模拟 VercelRequest（仅实现 handler 实际读取的字段）
        const vReq = { method: req.method ?? 'GET', headers, body, query: {}, cookies: {} }

        // 模拟 VercelResponse（支持 .status().json() 链式调用）
        let statusCode = 200
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vRes: Record<string, any> = {
          setHeader: (k: string, v: string | string[]) => { res.setHeader(k, v); return vRes },
          getHeader: (k: string) => res.getHeader(k),
          status: (code: number) => { statusCode = code; return vRes },
          json: (data: unknown) => {
            res.statusCode = statusCode
            if (!res.getHeader('content-type'))
              res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(data))
            return vRes
          },
          send: (payload: string | Buffer) => { res.statusCode = statusCode; res.end(payload); return vRes },
          end: (payload?: string | Buffer) => { res.statusCode = statusCode; res.end(payload) },
        }

        // /api/ai/turn → api/ai/turn.ts（ssrLoadModule 从项目根解析）
        const handlerPath = url.split('?')[0]
        try {
          const mod = await server.ssrLoadModule(`${handlerPath}.ts`)
          if (typeof mod['default'] === 'function') {
            await mod['default'](vReq, vRes)
          } else {
            res.statusCode = 404
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'HANDLER_NOT_FOUND' }))
          }
        } catch (err: unknown) {
          console.error('[dev-api]', err)
          if (!res.writableEnded) {
            res.statusCode = 502
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'UPSTREAM_UNAVAILABLE' }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,
    reporters: ['default'],
  },
})
