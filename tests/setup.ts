import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

// jsdom 未实现 URL.createObjectURL，为导出功能测试提供桩
if (typeof URL.createObjectURL === 'undefined') {
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
  cleanup()
  window.localStorage.clear()
})
