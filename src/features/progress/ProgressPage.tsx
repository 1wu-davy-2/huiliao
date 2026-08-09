import { Link } from 'react-router-dom'
import { Heart, History, NotebookPen, Trash2 } from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import { getScenario } from '@/content'
import { aggregateSkillScores, boundaryAccuracy } from '@/lib/skills/skills'
import { SkillRadar } from '@/components/ui/SkillRadar'
import { SkillMetricCards } from '@/components/ui/SkillMetricCards'
import { SKILL_LABELS, type SkillKey } from '@/types'

export default function ProgressPage() {
  const { data, toggleFavorite, deleteReflection } = useAppData()

  const skills = aggregateSkillScores(data.progress)
  const accuracy = boundaryAccuracy(data.progress)
  const completedScenarios = data.progress.map((r) => ({
    record: r,
    scenario: getScenario(r.scenarioId),
  }))
  const favoriteScenarios = data.favorites
    .map((id) => getScenario(id))
    .filter((s) => s !== undefined)
  const hasProgress = data.progress.length > 0
  // 名义时长：累加已完成情境的 durationMinutes，不代表真实用时。
  const nominalMinutes = data.progress.reduce((sum, r) => {
    const s = getScenario(r.scenarioId)
    return s ? sum + s.durationMinutes : sum
  }, 0)

  return (
    <div className="page-with-aside">
      <div>
        <header className="page-head">
          <div
            className="eyebrow"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
          >
            <History size={14} aria-hidden="true" />
            <span>结果复盘</span>
          </div>
          <h1 className="page-title">进度与复盘</h1>
          <p className="page-sub">
            这里只统计沟通能力与边界判断，不统计回复率、邀约数、恋爱数或任何关系结果。
          </p>
        </header>

        <section className="section" aria-labelledby="skill-title">
          <div className="section-head">
            <h2 className="section-title" id="skill-title">
              五维能力
            </h2>
          </div>
          {hasProgress ? (
            <>
              <div style={{ maxWidth: 320, margin: '0 auto' }}>
                <SkillRadar scores={skills} />
              </div>
              <div className="mt-24">
                <SkillMetricCards scores={skills} />
              </div>
            </>
          ) : (
            <p className="muted mt-16">
              完成第一个情境练习后，这里才会出现你的能力概况。没有数据时不显示默认分数。
            </p>
          )}
        </section>

        <section className="section" aria-labelledby="boundary-title">
          <div className="section-head">
            <h2 className="section-title" id="boundary-title">
              边界判断
            </h2>
          </div>
          {accuracy === null ? (
            <p className="muted">还没有可统计的完成记录。</p>
          ) : (
            <>
              <p
                className="bold"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(36px, 4vw, 48px)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  color: 'var(--primary-strong)',
                }}
              >
                {accuracy}%
              </p>
              <p className="small muted mt-8" style={{ maxWidth: '60ch' }}>
                已完成 {data.progress.length} 个情境，其中边界检查通过的比例。选择有压力的表达不意味着失败——它是练习的一部分。
              </p>
            </>
          )}
        </section>

        <section className="section" aria-labelledby="records-title">
          <div className="section-head">
            <h2 className="section-title" id="records-title">
              完成记录
            </h2>
          </div>
          {completedScenarios.length === 0 ? (
            <div className="empty">
              <p>还没有完成过情境练习。</p>
              <Link to="/practice" className="btn btn-secondary">
                进入情境库
              </Link>
            </div>
          ) : (
            <div>
              {completedScenarios.map(({ record, scenario }) => (
                <div className="list-row" key={record.scenarioId}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="bold">
                      <Link to={`/practice/${record.scenarioId}`}>
                        {scenario?.title ?? record.scenarioId}
                      </Link>
                    </p>
                    <p className="small muted mt-8">
                      {new Date(record.completedAt).toLocaleDateString('zh-CN')} · 提交{' '}
                      {record.attempts} 次回应
                      {(record.retryCount ?? 0) > 0 && ` · 重试 ${record.retryCount} 次`}
                    </p>
                    <div className="row" style={{ gap: 6, marginTop: 10 }}>
                      {(Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => (
                        <span className="tag" key={key}>
                          {SKILL_LABELS[key]} {record.scores[key]}
                        </span>
                      ))}
                      {record.boundaryCheckPassed ? (
                        <span className="tag tag-success">边界通过</span>
                      ) : (
                        <span className="tag tag-warning">有越界尝试</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-pressed={data.favorites.includes(record.scenarioId)}
                    aria-label={
                      data.favorites.includes(record.scenarioId) ? '取消收藏' : '收藏'
                    }
                    onClick={() => toggleFavorite(record.scenarioId)}
                  >
                    <Heart
                      size={18}
                      fill={
                        data.favorites.includes(record.scenarioId) ? 'currentColor' : 'none'
                      }
                      aria-hidden="true"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {favoriteScenarios.length > 0 && (
          <section className="section" aria-labelledby="favorites-title">
            <div className="section-head">
              <h2 className="section-title" id="favorites-title">
                收藏
              </h2>
            </div>
            <div>
              {favoriteScenarios.map((scenario) => (
                <div className="list-row" key={scenario.id}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="bold">
                      <Link to={`/practice/${scenario.id}`}>{scenario.title}</Link>
                    </p>
                    <p className="small muted mt-8">
                      {scenario.difficulty} · 约 {scenario.durationMinutes} 分钟
                    </p>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-pressed="true"
                    aria-label="取消收藏"
                    onClick={() => toggleFavorite(scenario.id)}
                  >
                    <Heart size={18} fill="currentColor" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section" aria-labelledby="reflections-title">
          <div className="section-head">
            <h2 className="section-title" id="reflections-title">
              私密复盘
            </h2>
          </div>
          {data.reflections.length === 0 ? (
            <div className="empty">
              <NotebookPen size={28} aria-hidden="true" />
              <p>还没有保存过复盘。完成练习时写下的复盘只保存在本浏览器。</p>
            </div>
          ) : (
            <div>
              {data.reflections.map((reflection) => (
                <div className="list-row" key={reflection.id}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="small muted">
                      {getScenario(reflection.scenarioId)?.title ?? '练习复盘'} ·{' '}
                      {new Date(reflection.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                    <p className="mt-8">{reflection.text}</p>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="删除这条复盘"
                    onClick={() => deleteReflection(reflection.id)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="page-aside" aria-labelledby="summary-title">
        <h2 className="section-title" id="summary-title" style={{ marginBottom: 8 }}>
          训练总览
        </h2>
        <div>
          <div className="aside-stat">
            <span className="aside-stat-label">完成情境</span>
            <span className="aside-stat-value">
              {hasProgress ? data.progress.length : <span className="muted">—</span>}
            </span>
          </div>
          <div className="aside-stat">
            <span className="aside-stat-label">边界通过率</span>
            <span className="aside-stat-value">
              {accuracy === null ? (
                <span className="muted">—</span>
              ) : (
                <>
                  {accuracy}
                  <span className="aside-stat-unit">%</span>
                </>
              )}
            </span>
          </div>
          <div className="aside-stat">
            <span className="aside-stat-label">名义训练时长</span>
            <span className="aside-stat-value">
              {hasProgress ? (
                <>
                  {nominalMinutes}
                  <span className="aside-stat-unit">min</span>
                </>
              ) : (
                <span className="muted">—</span>
              )}
            </span>
          </div>
          <div className="aside-stat">
            <span className="aside-stat-label">收藏情境</span>
            <span className="aside-stat-value">
              {favoriteScenarios.length > 0 ? (
                favoriteScenarios.length
              ) : (
                <span className="muted">—</span>
              )}
            </span>
          </div>
          <div className="aside-stat">
            <span className="aside-stat-label">复盘条数</span>
            <span className="aside-stat-value">
              {data.reflections.length > 0 ? (
                data.reflections.length
              ) : (
                <span className="muted">—</span>
              )}
            </span>
          </div>
        </div>
        <p className="small muted mt-16">
          名义训练时长按每个情境的推荐时长累加，并非真实计时。
        </p>
      </aside>
    </div>
  )
}
