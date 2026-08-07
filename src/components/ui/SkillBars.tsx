import type { SkillKey } from '@/types'
import { SKILL_LABELS } from '@/types'

export function SkillBars({ scores }: { scores: Record<SkillKey, number> }) {
  return (
    <div className="stack" role="group" aria-label="五维能力概况">
      {(Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => (
        <div className="skill-row" key={key}>
          <span className="small bold">{SKILL_LABELS[key]}</span>
          <div className="skill-track" aria-hidden="true">
            <div className="skill-fill" style={{ width: `${scores[key]}%` }} />
          </div>
          <span className="skill-value" aria-label={`${SKILL_LABELS[key]} ${scores[key]} 分`}>
            {scores[key]}
          </span>
        </div>
      ))}
    </div>
  )
}
