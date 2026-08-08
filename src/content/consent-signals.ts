import type { ConsentSignal } from '@/types'
import { consentSignalSchema } from '@/schemas'

// 绿黄红信号体系：项目内预先约定的辅助沟通协议，不是普遍默认规则，也不能取代持续同意。
// 普通语言中的「不要、停止、不舒服」优先级不低于颜色词；沉默、僵住、无法回应一律按红色处理。
export const CONSENT_SIGNALS: ConsentSignal[] = [
  {
    id: 'green',
    label: '绿色',
    meaning:
      '在双方事先确认过的具体范围内，我此刻仍然清醒、主动、愿意继续；这只覆盖「已经点名同意」的行为，不覆盖任何尚未谈过的新行为（包括加码、从抚摸升级到口交或插入、加入击打/束缚/羞辱等）。',
    requiredResponse:
      '只维持当前已同意的范围；想增加任何一项，必须停下用完整句子重新询问，并得到清晰、自由的新同意。过去的绿色不等于现在的绿色。',
    icon: 'check',
  },
  {
    id: 'yellow',
    label: '黄色',
    meaning:
      '我需要立刻暂停：可能是身体不适、情绪涌上来、节奏太快、某句话或某个触碰越界边缘，或我需要确认下一步。黄色不是「再轻一点就能自动继续」。',
    requiredResponse:
      '立即完全停下正在进行的性接触或角色扮演；问对方需要什么（水、休息、换事先同意的更轻量接触，还是结束今晚）。在得到新的、具体的、自由的确认前，不恢复。',
    icon: 'alert',
  },
  {
    id: 'red',
    label: '红色',
    meaning:
      '立即结束当前一切性接触与角色扮演。普通语言里的「停、不要、不舒服、回家、做到这里」与红色同级，不需要说出色词才算数。',
    requiredResponse:
      '立即停止；解除任何限制行动的约束（若有）以恢复对方自由活动；确认基本安全（能否顺畅呼吸、能否坐起、要不要水或毯子）；留出空间；不争辩、不追问「为什么突然」、不讨价还价「再一分钟」。事后照护按对方当下偏好，可稍后另约时间复盘。',
    icon: 'stop',
  },
].map((signal) => consentSignalSchema.parse(signal))

export function getConsentSignal(id: ConsentSignal['id']): ConsentSignal {
  const found = CONSENT_SIGNALS.find((s) => s.id === id)
  if (!found) throw new Error(`未知的信号：${id}`)
  return found
}
