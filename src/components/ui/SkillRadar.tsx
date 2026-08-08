import { SKILL_KEYS, SKILL_LABELS, type SkillKey } from '@/types'

// 五维雷达图：只描边 + primary 10% 填充，顶点小圆点。
// 维度顺序与标签复用 SKILL_KEYS / SKILL_LABELS，不引入设计稿里的另一套命名。
const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = 84
const LABEL_OFFSET = 20
const RINGS = [0.25, 0.5, 0.75, 1]
const STEP = 360 / SKILL_KEYS.length

function vertex(index: number, ratio: number): [number, number] {
  const angle = ((-90 + index * STEP) * Math.PI) / 180
  const r = RADIUS * ratio
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)]
}

function polygonPoints(ratios: number[]): string {
  return ratios
    .map((ratio, index) =>
      vertex(index, ratio)
        .map((n) => n.toFixed(1))
        .join(','),
    )
    .join(' ')
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

export function SkillRadar({ scores }: { scores: Record<SkillKey, number> }) {
  const ratios = SKILL_KEYS.map((key) => clamp(scores[key]) / 100)
  const summary = SKILL_KEYS.map((key) => `${SKILL_LABELS[key]} ${scores[key]} 分`).join('，')

  return (
    <svg
      className="radar-chart"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`五维能力雷达图：${summary}`}
    >
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={polygonPoints(SKILL_KEYS.map(() => ring))}
          fill="none"
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}
      {SKILL_KEYS.map((key, index) => {
        const [x, y] = vertex(index, 1)
        return (
          <line
            key={`axis-${key}`}
            x1={CENTER}
            y1={CENTER}
            x2={x.toFixed(1)}
            y2={y.toFixed(1)}
            stroke="var(--line)"
            strokeWidth="1"
          />
        )
      })}
      <polygon
        points={polygonPoints(ratios)}
        fill="var(--primary)"
        fillOpacity="0.1"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {ratios.map((ratio, index) => {
        const [x, y] = vertex(index, ratio)
        return (
          <circle
            key={`dot-${SKILL_KEYS[index]}`}
            cx={x.toFixed(1)}
            cy={y.toFixed(1)}
            r="3.5"
            fill="var(--surface)"
            stroke="var(--primary)"
            strokeWidth="2"
          />
        )
      })}
      {SKILL_KEYS.map((key, index) => {
        const [x, y] = vertex(index, 1)
        const scale = 1 + LABEL_OFFSET / RADIUS
        const lx = CENTER + (x - CENTER) * scale
        const ly = CENTER + (y - CENTER) * scale
        const anchor = Math.abs(lx - CENTER) < 4 ? 'middle' : lx > CENTER ? 'start' : 'end'
        return (
          <text
            key={`label-${key}`}
            x={lx.toFixed(1)}
            y={ly.toFixed(1)}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="12"
            fill="var(--muted)"
          >
            {SKILL_LABELS[key]}
          </text>
        )
      })}
    </svg>
  )
}
