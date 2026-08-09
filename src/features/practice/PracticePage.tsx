import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Heart, SlidersHorizontal, X } from 'lucide-react'
import { getPublishedScenarios } from '@/content'

const SCENARIOS = getPublishedScenarios()
import {
  CHANNEL_LABELS,
  PURPOSE_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
  type ChannelKey,
  type PurposeKey,
  type StageKey,
  type StatusKey,
} from '@/types'
import { SKILL_LABELS } from '@/types'
import { useAppData } from '@/lib/settings/AppDataContext'
import { Modal } from '@/components/ui/Modal'

const EMPTY = 'all'

type TagFilter = 'privacy'

interface Filters {
  stage: StageKey | typeof EMPTY
  channel: ChannelKey | typeof EMPTY
  purpose: PurposeKey | typeof EMPTY
  status: StatusKey | typeof EMPTY
  tag: TagFilter | typeof EMPTY
}

const INITIAL_FILTERS: Filters = {
  stage: EMPTY,
  channel: EMPTY,
  purpose: EMPTY,
  status: EMPTY,
  tag: EMPTY,
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: Record<T, string>
  value: T | typeof EMPTY
  onChange: (v: T | typeof EMPTY) => void
  disabled?: boolean
}) {
  return (
    <div className={`filter-group${disabled ? ' filter-group-disabled' : ''}`}>
      <span className="filter-label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        <button
          type="button"
          className="seg-btn"
          aria-pressed={value === EMPTY}
          onClick={() => onChange(EMPTY)}
          disabled={disabled}
        >
          全部
        </button>
        {(Object.keys(options) as T[]).map((key) => (
          <button
            type="button"
            key={key}
            className="seg-btn"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            disabled={disabled}
          >
            {options[key]}
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterPanel({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (f: Filters) => void
}) {
  // 已选中的维度；只允许单维度激活，其他组禁用
  const activeGroup =
    filters.stage !== EMPTY ? 'stage' :
    filters.channel !== EMPTY ? 'channel' :
    filters.purpose !== EMPTY ? 'purpose' :
    filters.status !== EMPTY ? 'status' :
    filters.tag !== EMPTY ? 'tag' : null

  return (
    <div className="stack">
      <FilterGroup
        label="关系阶段"
        options={STAGE_LABELS}
        value={filters.stage}
        onChange={(v) => onChange({ ...filters, stage: v })}
        disabled={activeGroup !== null && activeGroup !== 'stage'}
      />
      <FilterGroup
        label="沟通渠道"
        options={CHANNEL_LABELS}
        value={filters.channel}
        onChange={(v) => onChange({ ...filters, channel: v })}
        disabled={activeGroup !== null && activeGroup !== 'channel'}
      />
      <FilterGroup
        label="目的"
        options={PURPOSE_LABELS}
        value={filters.purpose}
        onChange={(v) => onChange({ ...filters, purpose: v })}
        disabled={activeGroup !== null && activeGroup !== 'purpose'}
      />
      <FilterGroup
        label="互动状态"
        options={STATUS_LABELS}
        value={filters.status}
        onChange={(v) => onChange({ ...filters, status: v })}
        disabled={activeGroup !== null && activeGroup !== 'status'}
      />
      <FilterGroup
        label="专题标签"
        options={{ privacy: '隐私' } as Record<TagFilter, string>}
        value={filters.tag}
        onChange={(v) => onChange({ ...filters, tag: v })}
        disabled={activeGroup !== null && activeGroup !== 'tag'}
      />
    </div>
  )
}

export default function PracticePage() {
  const { data, toggleFavorite } = useAppData()
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filtered = useMemo(() => {
    return SCENARIOS.filter((s) => {
      if (filters.stage !== EMPTY && s.stage !== filters.stage) return false
      if (filters.channel !== EMPTY && s.channel !== filters.channel) return false
      if (filters.purpose !== EMPTY && s.purpose !== filters.purpose) return false
      if (filters.status !== EMPTY && s.status !== filters.status) return false
      if (filters.tag === 'privacy' && !s.riskTags.includes('隐私')) return false
      return true
    })
  }, [filters])

  const hasFilters = Object.values(filters).some((v) => v !== EMPTY)

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS)
  }

  return (
    <>
      <header className="page-head">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">情境库</h1>
            <p className="page-sub">按关系阶段、渠道、目的和互动状态筛选，找到你现在的处境。</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary filter-button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            筛选
          </button>
        </div>
      </header>

      <div className="practice-layout">
        <aside className="card practice-filter" aria-label="筛选条件">
          <FilterPanel filters={filters} onChange={setFilters} />
        </aside>

        <section aria-label="场景列表">
          <p className="small muted" style={{ marginBottom: 12 }} role="status">
            共 {filtered.length} 个场景
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={14} aria-hidden="true" />
                清除筛选
              </button>
            )}
          </p>

          {filtered.length === 0 ? (
            <div className="empty">
              <Filter size={28} aria-hidden="true" />
              <p>没有符合条件的场景。试试清除筛选，或调整组合。</p>
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                清除筛选
              </button>
            </div>
          ) : (
            <div className="stack">
              {filtered.map((scenario) => {
                const completed = data.progress.some((r) => r.scenarioId === scenario.id)
                const favorite = data.favorites.includes(scenario.id)
                return (
                  <article className="card" key={scenario.id} style={{ padding: 0 }}>
                    <div className="row" style={{ padding: '12px 16px 0', justifyContent: 'space-between' }}>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="tag tag-primary">{scenario.difficulty}</span>
                        <span className="tag">约 {scenario.durationMinutes} 分钟</span>
                        <span className="tag">{STAGE_LABELS[scenario.stage]}</span>
                        <span className="tag">{CHANNEL_LABELS[scenario.channel]}</span>
                        <span
                          className={`tag ${
                            scenario.status === 'rejection' || scenario.status === 'cooling'
                              ? 'tag-warning'
                              : ''
                          }`}
                        >
                          {STATUS_LABELS[scenario.status]}
                        </span>
                        {completed && <span className="tag tag-success">已完成</span>}
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-pressed={favorite}
                        aria-label={favorite ? '取消收藏' : '收藏'}
                        onClick={() => toggleFavorite(scenario.id)}
                      >
                        <Heart size={18} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
                      </button>
                    </div>
                    <div style={{ padding: '4px 16px 12px' }}>
                      <h2 style={{ fontSize: 17, margin: '8px 0 4px' }}>
                        <Link to={`/practice/${scenario.id}`}>{scenario.title}</Link>
                      </h2>
                      <p className="small muted">{scenario.summary}</p>
                      <div className="row" style={{ gap: 6, marginTop: 8 }}>
                        {scenario.skills.map((s) => (
                          <span className="tag" key={s}>
                            训练：{SKILL_LABELS[s]}
                          </span>
                        ))}
                        {scenario.riskTags.map((r) => (
                          <span className="tag tag-warning" key={r}>
                            边界：{r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <Modal open={drawerOpen} title="筛选场景" onClose={() => setDrawerOpen(false)}>
        <FilterPanel filters={filters} onChange={setFilters} />
        <button type="button" className="btn btn-primary btn-block mt-16" onClick={() => setDrawerOpen(false)}>
          查看 {filtered.length} 个结果
        </button>
      </Modal>
    </>
  )
}
