import { Link } from 'react-router-dom'
import { Heart, NotebookPen, Trash2 } from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import { getScenario } from '@/content'
import { aggregateSkillScores, boundaryAccuracy } from '@/lib/skills/skills'
import { SkillBars } from '@/components/ui/SkillBars'
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

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">进度与复盘</h1>
        <p className="page-sub">
          这里只统计沟通能力与边界判断，不统计回复率、邀约数、恋爱数或任何关系结果。
        </p>
      </header>

      <section className="section" aria-labelledby="skill-title">
        <h2 className="section-title" id="skill-title">
          五维能力
        </h2>
        <div className="card mt-16">
          {data.progress.length === 0 ? (
            <p className="muted">
              完成第一个情境练习后，这里才会出现你的能力概况。没有数据时不显示默认分数。
            </p>
          ) : (
            <SkillBars scores={skills} />
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="boundary-title">
        <h2 className="section-title" id="boundary-title">
          边界判断
        </h2>
        <div className="card mt-16">
          {accuracy === null ? (
            <p className="muted">还没有可统计的完成记录。</p>
          ) : (
            <>
              <p className="bold" style={{ fontSize: 28 }}>
                {accuracy}%
              </p>
              <p className="small muted">
                已完成 {data.progress.length} 个情境，其中边界检查通过的比例。选择有压力的表达不意味着失败——它是练习的一部分。
              </p>
            </>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="records-title">
        <h2 className="section-title" id="records-title">
          完成记录
        </h2>
        {completedScenarios.length === 0 ? (
          <div className="empty mt-16">
            <p>还没有完成过情境练习。</p>
            <Link to="/practice" className="btn btn-secondary">
              进入情境库
            </Link>
          </div>
        ) : (
          <div className="card mt-16">
            {completedScenarios.map(({ record, scenario }) => (
              <div className="list-row" key={record.scenarioId}>
                <div>
                  <p className="bold">
                    <Link to={`/practice/${record.scenarioId}`}>{scenario?.title ?? record.scenarioId}</Link>
                  </p>
                  <p className="small muted">
                    {new Date(record.completedAt).toLocaleDateString('zh-CN')} · 提交{' '}
                    {record.attempts} 次回应
                    {(record.retryCount ?? 0) > 0 && ` · 重试 ${record.retryCount} 次`}
                  </p>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
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
                  aria-label={data.favorites.includes(record.scenarioId) ? '取消收藏' : '收藏'}
                  onClick={() => toggleFavorite(record.scenarioId)}
                >
                  <Heart
                    size={18}
                    fill={data.favorites.includes(record.scenarioId) ? 'currentColor' : 'none'}
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
          <h2 className="section-title" id="favorites-title">
            收藏
          </h2>
          <div className="card mt-16">
            {favoriteScenarios.map((scenario) => (
              <div className="list-row" key={scenario.id}>
                <div>
                  <p className="bold">
                    <Link to={`/practice/${scenario.id}`}>{scenario.title}</Link>
                  </p>
                  <p className="small muted">
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
        <h2 className="section-title" id="reflections-title">
          私密复盘
        </h2>
        {data.reflections.length === 0 ? (
          <div className="empty mt-16">
            <NotebookPen size={28} aria-hidden="true" />
            <p>还没有保存过复盘。完成练习时写下的复盘只保存在本浏览器。</p>
          </div>
        ) : (
          <div className="card mt-16">
            {data.reflections.map((reflection) => (
              <div className="list-row" key={reflection.id}>
                <div>
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
    </>
  )
}
