import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, NotebookPen, RotateCcw, ShieldAlert, Target } from 'lucide-react'
import { getScenario } from '@/content'
import { useAppData } from '@/lib/settings/AppDataContext'
import { safetyCheck } from '@/lib/safety/safety'
import { applyDeltas, emptySkillMap } from '@/lib/skills/skills'
import {
  SKILL_LABELS,
  type OptionQuality,
  type Scenario,
  type ScenarioChoice,
  type SkillKey,
} from '@/types'

const QUALITY_LABELS: Record<OptionQuality, string> = {
  good: '合理表达',
  ok: '信息不足',
  risky: '有压力',
}

interface ChatMessage {
  from: 'character' | 'user'
  text: string
}

interface FeedbackState {
  kind: 'choice' | 'free' | 'blocked'
  choice?: ScenarioChoice
  freeText?: string
  suggested?: ScenarioChoice
  concern?: string
}

const pickSuggested = (choices: ScenarioChoice[]): ScenarioChoice =>
  choices.find((c) => c.quality === 'good') ?? choices[0]

function relevantDeltas(deltas: Partial<Record<SkillKey, number>>): [SkillKey, number][] {
  return (Object.entries(deltas) as [SkillKey, number][])
    .filter(([, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
}

export default function ScenarioPage() {
  const { id } = useParams<{ id: string }>()
  const { completeScenario, saveReflection } = useAppData()
  const scenario: Scenario | undefined = id ? getScenario(id) : undefined

  const [phase, setPhase] = useState<'play' | 'ending'>('play')
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deltas, setDeltas] = useState<Partial<Record<SkillKey, number>>>({})
  const [attempts, setAttempts] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [hadBoundaryViolation, setHadBoundaryViolation] = useState(false)
  const [inputMode, setInputMode] = useState<'choice' | 'free'>('choice')
  const [freeText, setFreeText] = useState('')
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const [recordSaved, setRecordSaved] = useState(false)
  const [error, setError] = useState('')

  // 选择或提交后自动将反馈区滚入视口
  // jsdom 未实现 scrollIntoView，需显式判断方法存在（?. 只挡 current 为 null）
  const feedbackRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (feedback === null) return
    const timer = setTimeout(() => {
      const node = feedbackRef.current
      if (typeof node?.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 60)
    return () => clearTimeout(timer)
  }, [feedback])

  const startScenario = useCallback(() => {
    if (!scenario) return
    const startNode = scenario.nodes.find((n) => n.id === scenario.startNodeId)
    setPhase('play')
    setNodeId(scenario.startNodeId)
    setEndingId(null)
    setMessages(startNode ? [{ from: 'character', text: startNode.characterMessage }] : [])
    setFeedback(null)
    setDeltas({})
    setAttempts(0)
    setRetryCount(0)
    setHadBoundaryViolation(false)
    setFreeText('')
    setReflectionText('')
    setReflectionSaved(false)
    setRecordSaved(false)
    setError('')
  }, [scenario])

  useEffect(() => {
    startScenario()
  }, [startScenario])

  const node = scenario ? scenario.nodes.find((n) => n.id === nodeId) : undefined
  const nodeIndex = scenario && nodeId ? scenario.nodes.findIndex((n) => n.id === nodeId) : -1
  const ending = scenario ? scenario.endings.find((e) => e.id === endingId) : undefined

  const finishScenario = () => {
    if (!scenario || recordSaved) return
    setRecordSaved(true)
    // 边界检查基于本局是否曾出现越界（危险选项或被拦截的自由输入），重试与改写不消除
    const passed = !hadBoundaryViolation
    // 曾越界但最终到达非拒绝结局，视为在反馈后完成修复（不覆盖越界事实）
    const endingTone = scenario.endings.find((e) => e.id === endingId)?.tone
    completeScenario({
      scenarioId: scenario.id,
      completedAt: new Date().toISOString(),
      attempts,
      retryCount,
      scores: applyDeltas(emptySkillMap(), deltas),
      boundaryCheckPassed: passed,
      resolvedAfterFeedback: hadBoundaryViolation && endingTone !== 'rejection' ? true : undefined,
    })
  }

  const choose = (choice: ScenarioChoice, countAttempt = true) => {
    if (!node) return
    setMessages((m) => [
      ...m,
      { from: 'user', text: choice.text },
      { from: 'character', text: choice.response },
    ])
    setDeltas((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(choice.deltas ?? {})) {
        next[k as SkillKey] = (next[k as SkillKey] ?? 0) + (v ?? 0)
      }
      return next
    })
    if (choice.quality === 'risky') setHadBoundaryViolation(true)
    if (countAttempt) setAttempts((a) => a + 1)
    setFeedback({ kind: 'choice', choice })
    setError('')
  }

  const retryNode = () => {
    if (!feedback || feedback.kind !== 'choice' || !feedback.choice) return
    const choice = feedback.choice
    // 重试：消息、分数与质量历史回退到选择前；attempts（已提交回应数）不回退
    setMessages((m) => m.slice(0, -2))
    setDeltas((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(choice.deltas ?? {})) {
        const key = k as SkillKey
        next[key] = (next[key] ?? 0) - (v ?? 0)
        if (next[key] === 0) delete next[key]
      }
      return next
    })
    setRetryCount((c) => c + 1)
    setFeedback(null)
  }

  const continueFrom = (choice: ScenarioChoice) => {
    const targetEnding = scenario?.endings.find((e) => e.id === choice.goesTo)
    if (targetEnding) {
      finishScenario()
      setEndingId(targetEnding.id)
      setPhase('ending')
      setFeedback(null)
      return
    }
    if (!scenario) return
    const target = scenario.nodes.find((n) => n.id === choice.goesTo)
    if (!target) return
    setNodeId(target.id)
    setMessages((m) => [...m, { from: 'character', text: target.characterMessage }])
    setFeedback(null)
  }

  const submitFree = () => {
    const text = freeText.trim()
    if (!node) return
    if (text.length === 0) {
      setError('请先写下你的回应，或回到预设选项。')
      return
    }
    const safety = safetyCheck(text)
    // 提交计一次回应；草稿先作为待评估内容保留在组件状态，不写入正式聊天历史
    setAttempts((a) => a + 1)
    setError('')
    if (safety.level === 'blocked') {
      setHadBoundaryViolation(true)
      setFeedback({ kind: 'blocked', freeText: text, concern: safety.explanation })
      return
    }
    setFeedback({
      kind: 'free',
      freeText: text,
      suggested: pickSuggested(node.choices),
      concern: safety.level === 'caution' ? safety.explanation : undefined,
    })
  }

  const adoptSuggested = () => {
    if (!feedback || feedback.kind !== 'free' || !feedback.suggested) return
    // 自由输入已计一次回应，采纳推荐表达不重复计次，并清空旧输入回到选项模式
    choose(feedback.suggested, false)
    setFreeText('')
    setInputMode('choice')
  }

  const saveReflectionNow = () => {
    if (!scenario || reflectionText.trim().length === 0) return
    saveReflection({
      id: `r-${Date.now()}`,
      scenarioId: scenario.id,
      createdAt: new Date().toISOString(),
      text: reflectionText.trim(),
    })
    setReflectionSaved(true)
  }

  if (!scenario || scenario.reviewStatus === 'draft') {
    return (
      <div className="empty">
        <ShieldAlert size={28} aria-hidden="true" />
        <p>没有找到这个练习场景，它可能已被调整或尚未发布。</p>
        <Link to="/practice" className="btn btn-secondary">
          返回情境库
        </Link>
      </div>
    )
  }

  if (phase === 'ending') {
    const finalEnding = ending ?? scenario.endings[0]
    return (
      <>
        <header className="page-head">
          <h1 className="page-title">{scenario.title}</h1>
          <p className="page-sub">练习结束。这不是打分，是帮你看到自己可以控制的部分。</p>
        </header>

        <div className="card">
          <div className="row">
            <span className="tag tag-primary">{finalEnding.title}</span>
            <span className="tag">提交 {attempts} 次回应</span>
            {retryCount > 0 && <span className="tag">重试 {retryCount} 次</span>}
            {!hadBoundaryViolation ? (
              <span className="tag tag-success">边界检查通过</span>
            ) : (
              <span className="tag tag-warning">本次有越界尝试，已标注</span>
            )}
          </div>
          <p className="mt-16">{finalEnding.summary}</p>
          <p className="small muted mt-8">{finalEnding.boundarySummary}</p>
        </div>

        <section className="section" aria-labelledby="review-title">
          <h2 className="section-title" id="review-title">
            复盘
          </h2>
          <div className="card mt-16">
            <ul className="stack">
              {finalEnding.reviewQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <label className="field mt-16" htmlFor="reflection-input">
              <span className="field-label">私密复盘（可选，默认只保存在本浏览器）</span>
              <textarea
                id="reflection-input"
                className="textarea"
                rows={4}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="写下这次练习中你注意到的想法或感受……"
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={saveReflectionNow}
                disabled={reflectionText.trim().length === 0 || reflectionSaved}
              >
                <NotebookPen size={16} aria-hidden="true" />
                {reflectionSaved ? '已保存' : '保存复盘'}
              </button>
              {reflectionSaved && (
                <span className="small muted" role="status">
                  <CheckCircle2 size={14} style={{ display: 'inline' }} aria-hidden="true" />{' '}
                  已保存在本浏览器，可在“进度”中查看或删除
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="task-title">
          <h2 className="section-title" id="task-title">
            现实小任务
          </h2>
          <div className="card mt-16">
            <p>{finalEnding.realTask}</p>
            <p className="small muted mt-8">
              只评价你自己能控制的行动，不评价对方给了你什么结果。
            </p>
          </div>
        </section>

        {scenario.id === 's09' && (
          <section className="section" aria-labelledby="privacy-entry-title">
            <h2 className="section-title" id="privacy-entry-title">
              延伸学习
            </h2>
            <div className="card mt-16">
              <p className="small muted">
                关于影像、录音、聊天与身份等边界，可以继续查看隐私与边界手册。
              </p>
              <Link to="/privacy" className="btn btn-secondary mt-16">
                查看隐私与边界手册
              </Link>
            </div>
          </section>
        )}

        <div className="row mt-24">
          <button type="button" className="btn btn-primary" onClick={startScenario}>
            <RotateCcw size={16} aria-hidden="true" />
            再练一次
          </button>
          <Link to="/practice" className="btn btn-secondary">
            返回情境库
          </Link>
        </div>
      </>
    )
  }

  const freeRemaining = 240 - freeText.length

  return (
    <>
      {/* ── 紧凑顶部：标题 + 退出 ── */}
      <header className="page-head sp-header">
        <div>
          <h1 className="page-title">{scenario.title}</h1>
          <p className="page-sub">{scenario.goal}</p>
        </div>
        <Link to="/practice" className="btn btn-ghost btn-sm sp-exit">
          退出
        </Link>
      </header>

      {/* ── 紧凑信息条：角色 + 场景介绍 + 训练目标 合并为一块 ── */}
      <div className="sp-info">
        <div className="sp-info-char">
          <img className="sp-avatar" src={scenario.character.avatar} alt="" aria-hidden="true" />
          <span className="sp-char-name">{scenario.character.name} · {scenario.character.age} 岁</span>
          <span className="tag tag-primary sp-char-tag">虚构练习角色</span>
          <span className="sp-char-tagline">{scenario.character.tagline}</span>
        </div>
        <p className="sp-intro">{scenario.intro}</p>
        <div className="sp-goals" aria-label="训练目标">
          <Target size={13} aria-hidden="true" />
          {scenario.principles.map((p, i) => (
            <span key={p}>{i > 0 && <span className="sp-dot" aria-hidden="true">·</span>}{p}</span>
          ))}
        </div>
      </div>

      <section className="section" aria-labelledby="dialog-title">
        <div className="section-head">
          <h2 className="section-title" id="dialog-title">
            模拟对话
          </h2>
          {nodeIndex >= 0 && (
            <span className="node-chip">
              节点 {nodeIndex + 1} / {scenario.nodes.length}
            </span>
          )}
        </div>
        <div className="card">
          <div className="dialog-list" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from === 'user' ? 'msg-user' : ''}`}>
                {m.from === 'character' && (
                  <div className="msg-avatar">
                    <img className="avatar-img" src={scenario.character.avatar} alt="" aria-hidden="true" />
                  </div>
                )}
                <div className="msg-bubble">{m.text}</div>
              </div>
            ))}
            {messages.length === 0 && <p className="small muted">对话加载中……</p>}
          </div>
        </div>
      </section>

      {node && (
        <section className="section" aria-labelledby="respond-title">
          <div className="section-head">
            <h2 className="section-title" id="respond-title">
              你的回应
            </h2>
            <span className="small muted">{scenario.character.name} 在等你回话</span>
          </div>

          {node.note && <p className="small muted">{node.note}</p>}

          {inputMode === 'choice' ? (
            <>
              <div className="choice-list" role="radiogroup" aria-label="预设回应">
                {node.choices.map((choice) => (
                  <button
                    type="button"
                    key={choice.id}
                    className={`choice-card card ${choice.quality === 'risky' ? 'choice-risky' : ''}`}
                    onClick={() => choose(choice)}
                    disabled={feedback !== null}
                  >
                    <span
                      className={`tag ${
                        choice.quality === 'good'
                          ? 'tag-success'
                          : choice.quality === 'risky'
                            ? 'tag-warning'
                            : ''
                      }`}
                    >
                      {QUALITY_LABELS[choice.quality]}
                    </span>
                    <span>{choice.text}</span>
                    {choice.quality === 'risky' && choice.boundaryNote && (
                      <span className="small" style={{ color: 'var(--warning)' }}>
                        {choice.boundaryNote}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-16"
                onClick={() => setInputMode('free')}
              >
                想用自己话写？切换到自由输入
              </button>
            </>
          ) : (
            <div className="card">
              <label className="field" htmlFor="free-input">
                <span className="field-label">用自己的话回应（最多 240 字）</span>
                <textarea
                  id="free-input"
                  className="textarea"
                  rows={4}
                  value={freeText}
                  maxLength={240}
                  onChange={(e) => {
                    setFreeText(e.target.value)
                    setError('')
                  }}
                  placeholder={`用你自己的真实语气，回应${scenario.character.name}刚才的话……`}
                />
                <span className="char-count">剩余 {freeRemaining} 字</span>
              </label>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={submitFree}>
                  提交回应
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setInputMode('choice')
                    setFeedback(null)
                    setError('')
                  }}
                >
                  返回预设选项
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {feedback && (
        <section ref={feedbackRef} className="section" aria-labelledby="feedback-title">
          <div className={feedback.kind === 'blocked' ? 'feedback feedback-warning' : 'feedback'}>
            <h3 id="feedback-title">
              {feedback.kind === 'blocked'
                ? '这条回应需要停下来'
                : feedback.kind === 'choice'
                  ? '反馈'
                  : '关于你这句话'}
            </h3>

            {feedback.kind === 'choice' && feedback.choice && (
              <div className="stack">
                <p className="small muted">
                  {scenario.character.name} 可能的回应（只是其中一种可能）：
                </p>
                <div className="msg">
                  <div className="msg-avatar">
                    <img className="avatar-img" src={scenario.character.avatar} alt="" aria-hidden="true" />
                  </div>
                  <div className="msg-bubble">{feedback.choice.response}</div>
                </div>
                {feedback.choice.strengths.length > 0 && (
                  <p>
                    <span className="bold">做得好的地方：</span>
                    {feedback.choice.strengths.join('；')}
                  </p>
                )}
                <p>
                  <span className="bold">可能带来的感受：</span>
                  {feedback.choice.feelings}
                </p>
                {relevantDeltas(feedback.choice.deltas ?? {}).length > 0 && (
                  <p>
                    <span className="bold">能力变化：</span>
                    {relevantDeltas(feedback.choice.deltas ?? {}).map(([key, value]) => (
                      <span key={key} className="tag" style={{ marginRight: 6 }}>
                        {SKILL_LABELS[key]} {value > 0 ? `+${value}` : value}
                      </span>
                    ))}
                  </p>
                )}
                <p>
                  <span className="bold">一个关键修改：</span>
                  {feedback.choice.keyChange}
                </p>
                {feedback.choice.quality === 'risky' && feedback.choice.boundaryNote && (
                  <p className="small" style={{ color: 'var(--warning)' }}>
                    <ShieldAlert size={14} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
                    边界提示：{feedback.choice.boundaryNote}
                  </p>
                )}
                <div className="row">
                  <button type="button" className="btn btn-secondary" onClick={retryNode}>
                    <RotateCcw size={16} aria-hidden="true" />
                    重试此节点
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => continueFrom(feedback.choice!)}
                  >
                    继续
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {feedback.kind === 'free' && feedback.suggested && (
              <div className="stack">
                {feedback.concern && (
                  <p className="small" style={{ color: 'var(--warning)' }}>
                    <ShieldAlert size={14} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
                    {feedback.concern}
                  </p>
                )}
                <p>
                  <span className="bold">本节点参考表达：</span>
                  {feedback.suggested.keyChange}
                </p>
                <div className="msg">
                  <div className="msg-bubble">{feedback.suggested.text}</div>
                </div>
                <p className="small muted">
                  这里不做个性化判断：它只是这个节点更合适的表达结构，供你参考。采纳后会以这条参考表达继续，不评价你原文的内容。
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setFeedback(null)
                      setFreeText('')
                    }}
                  >
                    再改一次
                  </button>
                  <button type="button" className="btn btn-primary" onClick={adoptSuggested}>
                    采纳参考表达继续
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {feedback.kind === 'blocked' && (
              <div className="stack">
                <p>
                  <span className="bold">为什么停下：</span>
                  {feedback.concern}
                </p>
                <p className="small muted">
                  产品不提供绕过拒绝、施压或伤害他人的表达。请改写后再继续练习，或返回预设选项。
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setFeedback(null)
                      setInputMode('free')
                    }}
                  >
                    改写后再试
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setFeedback(null)
                      setInputMode('choice')
                    }}
                  >
                    返回预设选项
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
