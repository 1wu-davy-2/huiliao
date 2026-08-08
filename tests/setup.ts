import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

// API 层测试以 `@vitest-environment node` 运行（它们测试服务端代码，没有 DOM）。
// 该 setup 文件对全部测试生效，因此所有 DOM 相关操作必须先探测环境。
const hasDom = typeof window !== 'undefined'

// jsdom 未实现 URL.createObjectURL，为导出功能测试提供桩
if (hasDom && typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock'),
    configurable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(() => {}),
    configurable: true,
  })
}

afterEach(() => {
  if (!hasDom) return
  cleanup()
  window.localStorage.clear()
})
