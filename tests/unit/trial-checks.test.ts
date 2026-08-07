import { describe, expect, it } from 'vitest'
import { runHardCheck, runAllChecks, calculateHardScore } from '@/lib/ai/trialChecks'

describe('trialChecks', () => {
  it('nonEmpty: 空文本失败', () => {
    const r = runHardCheck({ type: 'nonEmpty' }, '', 0)
    expect(r.passed).toBe(false)
  })

  it('nonEmpty: 有文本通过', () => {
    const r = runHardCheck({ type: 'nonEmpty' }, 'hello', 0)
    expect(r.passed).toBe(true)
  })

  it('maxChars: 未超限通过', () => {
    const r = runHardCheck({ type: 'maxChars', max: 10 }, 'hello', 0)
    expect(r.passed).toBe(true)
  })

  it('maxChars: 超限失败', () => {
    const r = runHardCheck({ type: 'maxChars', max: 3 }, 'hello', 0)
    expect(r.passed).toBe(false)
  })

  it('jsonObject: 合法 JSON 且字段齐全通过', () => {
    const r = runHardCheck({ type: 'jsonObject', requiredKeys: ['a', 'b'] }, '{"a":1,"b":2}', 0)
    expect(r.passed).toBe(true)
  })

  it('jsonObject: 缺少字段失败', () => {
    const r = runHardCheck({ type: 'jsonObject', requiredKeys: ['a', 'c'] }, '{"a":1,"b":2}', 0)
    expect(r.passed).toBe(false)
  })

  it('jsonObject: 非 JSON 失败', () => {
    const r = runHardCheck({ type: 'jsonObject', requiredKeys: ['a'] }, 'not json', 0)
    expect(r.passed).toBe(false)
  })

  it('containsAll: 大小写不敏感', () => {
    const r = runHardCheck({ type: 'containsAll', values: ['hello'], caseSensitive: false }, 'HELLO world', 0)
    expect(r.passed).toBe(true)
  })

  it('containsAll: 大小写敏感缺失', () => {
    const r = runHardCheck({ type: 'containsAll', values: ['Hello'], caseSensitive: true }, 'hello world', 0)
    expect(r.passed).toBe(false)
  })

  it('safeCommunication: 安全通过', () => {
    const r = runHardCheck({ type: 'safeCommunication' }, '你好，很高兴认识你', 0)
    expect(r.passed).toBe(true)
  })

  it('safeCommunication: 不安全被拦截', () => {
    const r = runHardCheck({ type: 'safeCommunication' }, '把他灌醉然后带走', 0)
    expect(r.passed).toBe(false)
  })

  it('calculateHardScore: 全过 100', () => {
    const results = [
      { id: '1', type: 'nonEmpty' as const, passed: true, explanation: '' },
      { id: '2', type: 'nonEmpty' as const, passed: true, explanation: '' },
    ]
    expect(calculateHardScore(results)).toBe(100)
  })

  it('calculateHardScore: 一半 50', () => {
    const results = [
      { id: '1', type: 'nonEmpty' as const, passed: true, explanation: '' },
      { id: '2', type: 'nonEmpty' as const, passed: false, explanation: '' },
    ]
    expect(calculateHardScore(results)).toBe(50)
  })

  it('calculateHardScore: 无检查 0', () => {
    expect(calculateHardScore([])).toBe(0)
  })

  it('runAllChecks: 返回与检查数一致的结果', () => {
    const checks = [
      { type: 'nonEmpty' as const },
      { type: 'maxChars' as const, max: 100 },
      { type: 'safeCommunication' as const },
    ]
    const results = runAllChecks(checks, 'test output')
    expect(results).toHaveLength(3)
  })
})
