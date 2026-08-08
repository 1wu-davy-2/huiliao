import type { TrialHardCheck } from '@/types'

export interface CheckResult {
  id: string
  type: TrialHardCheck['type']
  passed: boolean
  explanation: string
}

export function runHardCheck(check: TrialHardCheck, output: string, index: number): CheckResult {
  const id = `check-${index}`
  switch (check.type) {
    case 'nonEmpty':
      return {
        id,
        type: 'nonEmpty',
        passed: output.trim().length > 0,
        explanation: output.trim().length > 0 ? '输出非空' : '输出为空',
      }
    case 'maxChars':
      return {
        id,
        type: 'maxChars',
        passed: output.length <= check.max,
        explanation: output.length <= check.max
          ? `输出 ${output.length} 字符，未超过 ${check.max} 限制`
          : `输出 ${output.length} 字符，超过 ${check.max} 限制`,
      }
    case 'jsonObject': {
      try {
        const parsed = JSON.parse(output)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return { id, type: 'jsonObject', passed: false, explanation: '输出不是 JSON 对象' }
        }
        const missing = check.requiredKeys.filter((k) => !(k in parsed))
        if (missing.length > 0) {
          return { id, type: 'jsonObject', passed: false, explanation: `缺少必要字段: ${missing.join(', ')}` }
        }
        return { id, type: 'jsonObject', passed: true, explanation: `所有必要字段存在: ${check.requiredKeys.join(', ')}` }
      } catch {
        return { id, type: 'jsonObject', passed: false, explanation: '无法解析为 JSON' }
      }
    }
    case 'containsAll': {
      const searchText = check.caseSensitive ? output : output.toLowerCase()
      const values = check.caseSensitive ? check.values : check.values.map((v) => v.toLowerCase())
      const missing = values.filter((v) => !searchText.includes(v))
      return {
        id,
        type: 'containsAll',
        passed: missing.length === 0,
        explanation: missing.length === 0
          ? `包含所有必要项: ${check.values.join(', ')}`
          : `缺少: ${missing.join(', ')}`,
      }
    }
    case 'safeCommunication': {
      const blocked = /强制|灌醉|灌酒|下药|偷拍|威胁|未成年|要挟|曝光|勒索/.test(output)
      return {
        id,
        type: 'safeCommunication',
        passed: !blocked,
        explanation: blocked ? '输出包含不安全内容' : '安全通信检查通过',
      }
    }
    default:
      return { id, type: 'nonEmpty' as const, passed: false, explanation: '未知检查类型' }
  }
}

export function runAllChecks(checks: TrialHardCheck[], output: string): CheckResult[] {
  return checks.map((c, i) => runHardCheck(c, output, i))
}

export function calculateHardScore(results: CheckResult[]): number {
  if (results.length === 0) return 0
  const passed = results.filter((r) => r.passed).length
  return Math.round((passed / results.length) * 100)
}
