import type { ConsentSignal } from '@/types'
import { consentSignalSchema } from '@/schemas'

// 绿黄红信号体系：项目内预先约定的辅助沟通协议，不是普遍默认规则，也不能取代持续同意。
// 普通语言中的“不要、停止、不舒服”优先级不低于颜色词；沉默、僵住、无法回应一律按红色处理。
export const CONSENT_SIGNALS: ConsentSignal[] = [
  {
    id: 'green',
    label: '绿色',
    meaning: '当前状态明确舒适，愿意维持已经确认的范围。',
    requiredResponse: '只维持当前已同意的范围；任何新内容仍需重新询问。',
    icon: 'check',
  },
  {
    id: 'yellow',
    label: '黄色',
    meaning: '需要立即暂停、放慢或澄清。',
    requiredResponse: '立刻暂停并询问对方需要什么；得到新的明确确认前，不恢复。',
    icon: 'alert',
  },
  {
    id: 'red',
    label: '红色',
    meaning: '立即停止当前互动。',
    requiredResponse: '立即停止、留出空间、确认基本安全；不争辩、不追问理由、不尝试说服恢复。',
    icon: 'stop',
  },
].map((signal) => consentSignalSchema.parse(signal))

export function getConsentSignal(id: ConsentSignal['id']): ConsentSignal {
  const found = CONSENT_SIGNALS.find((s) => s.id === id)
  if (!found) throw new Error(`未知的信号：${id}`)
  return found
}
