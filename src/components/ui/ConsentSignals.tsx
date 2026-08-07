import { AlertTriangle, CheckCircle2, OctagonX } from 'lucide-react'
import { CONSENT_SIGNALS } from '@/content/consent-signals'
import type { ConsentSignalKey } from '@/types'

const ICONS: Record<ConsentSignalKey, typeof CheckCircle2> = {
  green: CheckCircle2,
  yellow: AlertTriangle,
  red: OctagonX,
}

const CSS_VAR: Record<ConsentSignalKey, string> = {
  green: 'var(--success)',
  yellow: 'var(--progress)',
  red: 'var(--warning)',
}

const CSS_BG: Record<ConsentSignalKey, string> = {
  green: 'var(--success-soft)',
  yellow: 'var(--progress-soft)',
  red: 'var(--warning-soft)',
}

/** 绿黄红信号卡：颜色、图标、文字三者齐备，不依赖颜色单独传达信息。 */
export function ConsentSignals() {
  return (
    <div className="stack" role="group" aria-label="绿黄红信号体系">
      {CONSENT_SIGNALS.map((signal) => {
        const Icon = ICONS[signal.id]
        return (
          <div
            key={signal.id}
            className="consent-signal"
            style={{ background: CSS_BG[signal.id], borderColor: CSS_VAR[signal.id] }}
          >
            <div className="row" style={{ gap: 8 }}>
              <Icon size={20} style={{ color: CSS_VAR[signal.id] }} aria-hidden="true" />
              <span className="bold" style={{ color: CSS_VAR[signal.id] }}>
                {signal.label}
              </span>
              <span className="small muted">{signal.meaning}</span>
            </div>
            <p className="small mt-8" style={{ color: 'var(--ink)' }}>
              必须的回应：{signal.requiredResponse}
            </p>
          </div>
        )
      })}
      <p className="small muted">
        额外规则：“停止、不要、不舒服、回家”等普通表达优先级不低于颜色词；沉默、僵住、哭泣、明显混乱或无法回应，一律按红色停止处理。过去说过绿色，不代表现在仍是绿色。
      </p>
    </div>
  )
}
