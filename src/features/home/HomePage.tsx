import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, PlayCircle, NotebookPen } from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import { SCENARIOS, getScenario } from '@/content'
import { CHALLENGE_OPTIONS, recommendScenario } from '@/lib/skills/skills'
import { aggregateSkillScores } from '@/lib/skills/skills'
import { SkillBars } from '@/components/ui/SkillBars'

const QUICK_ENTRIES = [
  { label: '不知道怎么开口', target: '/practice/s02', hint: '刚加好友的第一轮聊天' },
  { label: '对方回复变短', target: '/practice/s04', hint: '识别低投入，适时结束' },
  { label: '想发出邀约', target: '/practice/s06', hint: '低压力邀约练习' },
  { label: '刚被拒绝', target: '/practice/s07', hint: '体面结束与情绪复盘' },
  { label: '不确定边界', target: '/practice/s08', hint: '同意与暂停练习' },
]

export default function HomePage() {
  const { data } = useAppData()
  const navigate = useNavigate()
  const completedIds = data.progress.map((r) => r.scenarioId)
  const scenarioIds = SCENARIOS.map((s) => s.id)
  const recommendedId = recommendScenario(
    data.settings.selectedChallenges,
    completedIds,
    scenarioIds,
  )
  const recommended = recommendedId ? getScenario(recommendedId) : undefined
  const skills = aggregateSkillScores(data.progress)
  const challengeLabels = CHALLENGE_OPTIONS.filter((c) =>
    data.settings.selectedChallenges.includes(c.id),
  )
  const recentReflection = data.reflections[0]
  const recentReflectionScenario = recentReflection
    ? getScenario(recentReflection.scenarioId)
    : undefined
  const weekCompleted = data.progress.filter(
    (r) => Date.now() - new Date(r.completedAt).getTime() < 7 * 24 * 3600 * 1000,
  ).length

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">
          今天想练点什么？
          {challengeLabels.length > 0 && (
            <span className="muted" style={{ fontSize: 14, fontWeight: 400, marginLeft: 8 }}>
              训练目标：{challengeLabels.map((c) => c.label).join('、')}
            </span>
          )}
        </h1>
        <p className="page-sub">
          这是一间练习场：只评价你能控制的表达和行为，不评价对方给你的结果。
        </p>
      </header>

      <div className="card" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="stack" style={{ gap: 4 }}>
            <p className="bold">
              {weekCompleted > 0
                ? `本周已完成 ${weekCompleted} 个情境练习`
                : '还没有完成的练习，从第一个开始'}
            </p>
            <p className="small muted">
              {recommended
                ? `今日推荐：${recommended.title}（约 ${recommended.durationMinutes} 分钟 · ${recommended.difficulty}）`
                : '所有练习都已游历，可以随时重练或进入消息实验室。'}
            </p>
          </div>
          <PlayCircle size={28} style={{ color: 'var(--primary-strong)' }} aria-hidden="true" />
        </div>
        <button
          type="button"
          className="btn btn-primary mt-16"
          onClick={() => navigate(recommended ? `/practice/${recommended.id}` : '/practice')}
        >
          继续练习
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>

      <section className="section" aria-labelledby="quick-title">
        <div className="section-head">
          <h2 className="section-title" id="quick-title">
            我现在卡在……
          </h2>
        </div>
        <div className="check-grid" role="list">
          {QUICK_ENTRIES.map((entry) => (
            <Link key={entry.label} to={entry.target} className="check-card" role="listitem">
              <span>
                <span className="bold">{entry.label}</span>
                <span className="small muted" style={{ display: 'block' }}>
                  {entry.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="skill-title">
        <div className="section-head">
          <h2 className="section-title" id="skill-title">
            能力概况
          </h2>
          {data.progress.length > 0 && (
            <Link to="/progress" className="small">
              查看详情
            </Link>
          )}
        </div>
        <div className="card">
          {data.progress.length === 0 ? (
            <p className="muted">
              完成第一个情境练习后，这里才会出现你的能力概况。没有数据时不显示默认分数。
            </p>
          ) : (
            <>
              <SkillBars scores={skills} />
              <p className="small muted mt-16">
                依据已完成练习的反馈汇总。这里只统计沟通能力与边界判断，不统计任何关系结果。
              </p>
            </>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="recent-title">
        <div className="section-head">
          <h2 className="section-title" id="recent-title">
            最近复盘
          </h2>
          <Link to="/progress" className="small">
            全部
          </Link>
        </div>
        {recentReflection ? (
          <div className="card">
            <p className="small muted">
              {recentReflectionScenario?.title ?? '练习复盘'} ·{' '}
              {new Date(recentReflection.createdAt).toLocaleDateString('zh-CN')}
            </p>
            <p className="mt-8">{recentReflection.text}</p>
          </div>
        ) : (
          <div className="empty">
            <NotebookPen size={28} aria-hidden="true" />
            <p>还没有保存过复盘。完成一次情境练习后，可以在结尾写下你的私密复盘。</p>
            <Link to="/practice" className="btn btn-secondary">
              进入情境库
            </Link>
          </div>
        )}
      </section>
    </>
  )
}
