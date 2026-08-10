import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, FileText, NotebookPen } from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import { getPublishedScenarios, getScenario } from '@/content'
import { CHALLENGE_OPTIONS, recommendScenario } from '@/lib/skills/skills'
import { aggregateSkillScores } from '@/lib/skills/skills'
import { SkillRadar } from '@/components/ui/SkillRadar'
import { SkillBars } from '@/components/ui/SkillBars'

// 硬编码场景 ID：有效性由 home-page.test.tsx 从渲染结果的 href 守卫
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
  // 只从已审校情境中推荐：草稿场景在情境库里不可见，推荐它会给出一个点不进去的条目
  const published = getPublishedScenarios()
  const scenarioIds = published.map((s) => s.id)
  const recommendedId = recommendScenario(
    data.settings.selectedChallenges,
    completedIds,
    scenarioIds,
  )
  const recommended = recommendedId ? getScenario(recommendedId) : undefined
  // recommendScenario 在优先列表全部完成后会回退到已练过的场景（刻意行为，
  // 见 skills.test.ts）。此处据此把措辞从「今日训练任务」调整为重练，
  // 否则会把做过的情境当成新任务展示。
  const isReplay = recommendedId !== null && completedIds.includes(recommendedId)
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
  const totalMinutes = data.progress.reduce((sum, r) => {
    const s = getScenario(r.scenarioId)
    return s ? sum + s.durationMinutes : sum
  }, 0)
  const hasProgress = data.progress.length > 0

  return (
    <div className="page-with-aside">
      <div>
        <header className="page-head">
          <h1 className="page-title">
            今天练哪一场？
            {challengeLabels.length > 0 && (
              <span
                className="muted"
                style={{
                  fontSize: 'var(--text-label-md)',
                  fontWeight: 400,
                  marginLeft: 8,
                }}
              >
                训练目标：{challengeLabels.map((c) => c.label).join('、')}
              </span>
            )}
          </h1>
          <p className="page-sub">
            下一步不是取悦对方，而是把话说清楚。这里只评价你能控制的表达和行为。
          </p>
        </header>

        <section className="section" aria-labelledby="today-title">
          <div className="section-head">
            <h2 className="section-title" id="today-title">
              {isReplay ? '再练一次' : '今日训练任务'}
            </h2>
          </div>
          <div className="task-row" style={{ paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              {/* 设计稿 _1 今日任务标题 = headline-md */}
              <p
                className="bold"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-headline-md)',
                  lineHeight: 'var(--leading-headline-md)',
                }}
              >
                {recommended
                  ? recommended.title
                  : hasProgress
                  ? '所有练习都已游历，可以随时重练或进入消息实验室。'
                  : '还没有完成的练习，从第一个开始'}
              </p>
              {recommended && (
                <div className="task-meta">
                  <span className="row" style={{ gap: 4 }}>
                    <Clock size={14} aria-hidden="true" />
                    {recommended.durationMinutes} 分钟
                  </span>
                  <span className="meta-dot" aria-hidden="true">·</span>
                  <span className="tag">难度：{recommended.difficulty}</span>
                  {isReplay && (
                    <>
                      <span className="meta-dot" aria-hidden="true">·</span>
                      <span className="tag">已练过</span>
                    </>
                  )}
                </div>
              )}
              {isReplay && (
                <p className="small muted mt-8">
                  这个方向的情境你都走过一遍了。重练会覆盖上次成绩，也可以直接进情境库换一个。
                </p>
              )}
              {weekCompleted > 0 && (
                <p className="small muted mt-8">本周已完成 {weekCompleted} 个情境练习</p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(recommended ? `/practice/${recommended.id}` : '/practice')}
            >
              {isReplay ? '重新练习' : '继续练习'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="section" aria-labelledby="quick-title">
          <div className="section-head">
            <h2 className="section-title" id="quick-title">
              我现在卡在……
            </h2>
          </div>
          <div role="list">
            {QUICK_ENTRIES.map((entry) => (
              <Link
                key={entry.label}
                to={entry.target}
                className="explore-row"
                role="listitem"
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{entry.label}</span>
                  <span className="small muted">{entry.hint}</span>
                </span>
                <ArrowRight size={18} aria-hidden="true" style={{ color: 'var(--muted)', flex: 'none' }} />
              </Link>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="skill-title">
          <div className="section-head">
            <h2 className="section-title" id="skill-title">
              能力概况
            </h2>
            {hasProgress && (
              <Link to="/progress" className="small">
                查看详情
              </Link>
            )}
          </div>
          {hasProgress ? (
            <>
              <SkillBars scores={skills} />
              <p className="small muted mt-16">
                依据已完成练习的反馈汇总。这里只统计沟通能力与边界判断，不统计任何关系结果。
              </p>
            </>
          ) : (
            <p className="muted">
              完成第一个情境练习后，这里才会出现你的能力概况。没有数据时不显示默认分数。
            </p>
          )}
        </section>

        <section className="section" aria-labelledby="recent-title">
          <div className="section-head">
            {/* .eyebrow-row 提供 flex + gap + svg 配色，标题文本仍是唯一可及名称 */}
            <h2 className="section-title eyebrow-row" id="recent-title">
              <FileText size={16} aria-hidden="true" />
              最近复盘
            </h2>
            <Link to="/progress" className="small">
              全部
            </Link>
          </div>
          {recentReflection ? (
            <div style={{ paddingTop: 4 }}>
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
      </div>

      <aside className="page-aside" aria-labelledby="growth-title">
        <h2 className="section-title" id="growth-title" style={{ marginBottom: 24 }}>
          能力成长
        </h2>
        <div style={{ maxWidth: 280, margin: '0 auto' }}>
          {hasProgress ? (
            <SkillRadar scores={skills} />
          ) : (
            <p className="muted small" style={{ textAlign: 'center', padding: '24px 0' }}>
              完成第一次练习后，这里会显示能力雷达。
            </p>
          )}
        </div>
        <div className="mt-24">
          <div className="aside-stat">
            <span className="aside-stat-label">本周训练次数</span>
            <span className="aside-stat-value">
              {hasProgress ? weekCompleted : <span className="muted">—</span>}
            </span>
          </div>
          <div className="aside-stat">
            <span className="aside-stat-label">累计成长时长</span>
            <span className="aside-stat-value">
              {hasProgress ? (
                <>
                  {totalMinutes}
                  <span className="aside-stat-unit">min</span>
                </>
              ) : (
                <span className="muted">—</span>
              )}
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}
