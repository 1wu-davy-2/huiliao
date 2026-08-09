import { Ear, Heart, Scale, ShieldCheck, Speech, type LucideIcon } from 'lucide-react'
import { SKILL_KEYS, SKILL_LABELS, type SkillKey } from '@/types'

/**
 * 五维能力评分卡。纯展示组件：只读 scores，不取数、无副作用，
 * 供 ProgressPage 与单次训练复盘页共用。
 *
 * 分值是 0–100 整数（与 schemaVersion 2 的落盘刻度一致），故按 /100 展示。
 * 不换算成设计稿 _5 的 X.X/10：应用内已有 /100 一套分制，不引入第二套。
 * 维度取 SKILL_KEYS/SKILL_LABELS，设计稿的 表达/策略 轴名视为已否决。
 */
const SKILL_GLYPHS: Record<SkillKey, LucideIcon> = {
  clarity: Speech,
  authenticity: Heart,
  listening: Ear,
  pace: Scale,
  boundaries: ShieldCheck,
}

export function SkillMetricCards({ scores }: { scores: Record<SkillKey, number> }) {
  return (
    <div className="metric-grid" role="group" aria-label="五维能力评分">
      {SKILL_KEYS.map((key) => {
        const Glyph = SKILL_GLYPHS[key]
        return (
          <div className="metric-card" key={key}>
            {/* space-between 使角标靠右（设计稿 _5）；.metric-label 只定义了 flex + gap */}
            <p className="metric-label" style={{ justifyContent: 'space-between' }}>
              <span>{SKILL_LABELS[key]}</span>
              <span className="metric-glyph">
                <Glyph size={18} aria-hidden="true" />
              </span>
            </p>
            {/* 可访问值 = 可见值：数值与 /100 都是普通文本，不另挂 aria-label 以免两者漂移 */}
            <p className="metric-value">
              <span>{scores[key]}</span>
              <span className="metric-suffix">/ 100</span>
            </p>
            <div className="meter-track mt-8" aria-hidden="true">
              <div className="meter-fill" style={{ width: `${scores[key]}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
