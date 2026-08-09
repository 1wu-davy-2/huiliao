import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import { CHALLENGE_OPTIONS } from '@/lib/skills/skills'

// 4 步合并为 2 步：步骤 0 = 成年确认 + 当前困难；步骤 1 = 基线判断 + 互动原则
const STEPS = ['了解与选择', '基线确认']

const BASELINE_QUESTIONS = [
  {
    id: 'q1',
    label: '对方回复明显变短、变慢时，更合适的做法是：',
    options: [
      { value: 'a', label: '追问"为什么不理我"，把话说开', good: false },
      { value: 'b', label: '退一步停止追问，把注意力放回自己的事', good: true },
      { value: 'c', label: '发更多消息，用热情把对话拉回来', good: false },
    ],
  },
  {
    id: 'q2',
    label: '发出邀约时，信息完整度最重要的一项是：',
    options: [
      { value: 'a', label: '具体的时间、地点，以及"没空也没关系"的出口', good: true },
      { value: 'b', label: '强烈的语气和充分的热情', good: false },
      { value: 'c', label: '提前替对方安排好全部行程', good: false },
    ],
  },
  {
    id: 'q3',
    label: '对方在亲密互动中迟疑、沉默或说"慢一点"时，正确的是：',
    options: [
      { value: 'a', label: '暂停并确认，把迟疑当作"不是同意"', good: true },
      { value: 'b', label: '再试一次，她没说"不"就是还可以', good: false },
      { value: 'c', label: '用"气氛这么好"说服她继续', good: false },
    ],
  },
]

const PRINCIPLES = [
  '真实表达：用自己的语言说真实的想法，不复制套路',
  '让对方容易拒绝：每句表达都留出轻松的退出空间',
  '拒绝后停止：收到拒绝或停止信号后，不再推进',
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { updateSettings } = useAppData()
  const [step, setStep] = useState(0)
  const [adultConfirmed, setAdultConfirmed] = useState(false)
  const [challenges, setChallenges] = useState<string[]>([])
  const [baseline, setBaseline] = useState<Record<string, string>>({})
  const [principles, setPrinciples] = useState<string[]>([])
  const [error, setError] = useState('')

  const canContinue = () => {
    if (step === 0) return adultConfirmed && challenges.length > 0
    return Object.keys(baseline).length === BASELINE_QUESTIONS.length && principles.length === PRINCIPLES.length
  }

  const handleNext = () => {
    if (!canContinue()) {
      setError(step === 0 ? '请确认年满 18 岁并至少选择一项困难' : '请完成全部题目并逐条确认原则')
      return
    }
    setError('')
    if (step === 1) {
      updateSettings({ isAdultConfirmed: true, selectedChallenges: challenges, onboardingCompleted: true })
      navigate('/home', { replace: true })
      return
    }
    setStep(1)
  }

  const toggleChallenge = (id: string) => {
    setChallenges((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  const togglePrinciple = (label: string) => {
    setPrinciples((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label],
    )
  }

  return (
    <div className="content" style={{ maxWidth: 680 }}>
      <header className="page-head">
        <h1 className="page-title">首次设置</h1>
        <p className="page-sub">完成 2 个步骤（约 60 秒），我们将为你推荐第一个练习。</p>
      </header>

      <nav aria-label="设置步骤" className="row" style={{ marginBottom: 24 }}>
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`progress-step ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="step-dot" aria-hidden="true">
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </span>
            {label}
          </span>
        ))}
      </nav>

      {/* ── 步骤 1：基线判断 + 互动原则 ── */}
      {step === 1 && (
        <>
          <section className="card" aria-label="基线判断">
            <p className="section-title" style={{ marginBottom: 4 }}>快速校准一下</p>
            <p className="small muted" style={{ marginBottom: 16 }}>三道情境题，帮我们了解你目前的沟通习惯。</p>
            <div className="stack">
              {BASELINE_QUESTIONS.map((q) => (
                <fieldset key={q.id} className="field" style={{ marginBottom: 0 }}>
                  <legend className="field-label">{q.label}</legend>
                  <div className="radio-group">
                    {q.options.map((opt) => (
                      <label className="radio-card" key={opt.value}>
                        <input
                          type="radio"
                          name={q.id}
                          value={opt.value}
                          checked={baseline[q.id] === opt.value}
                          onChange={() => setBaseline((prev) => ({ ...prev, [q.id]: opt.value }))}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section className="card mt-16" aria-label="确认互动原则">
            <p className="section-title" style={{ marginBottom: 4 }}>三条互动原则</p>
            <p className="small muted" style={{ marginBottom: 12 }}>
              贯穿全部练习，请逐条确认理解：
            </p>
            <div className="check-grid">
              {PRINCIPLES.map((label) => (
                <label className="check-card" key={label}>
                  <input
                    type="checkbox"
                    checked={principles.includes(label)}
                    onChange={() => togglePrinciple(label)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="small muted mt-16" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <ShieldAlert size={16} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
              涉及强迫、灌酒、纠缠、偷拍、未成年人或明显权力差的意图，将不会被提供执行建议。
            </p>
          </section>
        </>
      )}

      {/* ── 步骤 0：成年确认 + 当前困难 ── */}
      {step === 0 && (
        <>
          <section className="card" aria-label="成年确认">
            <p>
              会聊只面向 <strong>18 岁以上成年人</strong>，提供尊重、真诚、有边界的关系沟通练习。
            </p>
            <p className="muted small" style={{ marginTop: 8 }}>
              这里不会教你操控、欺骗、施压或绕过拒绝的做法，也不承诺任何恋爱结果。
            </p>
            <label className="check-card mt-16" htmlFor="adult-check">
              <input
                id="adult-check"
                type="checkbox"
                checked={adultConfirmed}
                onChange={(e) => setAdultConfirmed(e.target.checked)}
              />
              <span>我已年满 18 岁，理解产品不提供操控或绕过拒绝的做法</span>
            </label>
          </section>

          <section className="card mt-16" aria-label="选择当前困难">
            <p className="section-title" style={{ marginBottom: 4 }}>你现在卡在哪里？</p>
            <p className="small muted" style={{ marginBottom: 12 }}>
              最多选两项，用于推荐第一个练习顺序。
            </p>
            <div className="check-grid" role="group" aria-label="当前困难">
              {CHALLENGE_OPTIONS.map((option) => (
                <label className="check-card" key={option.id}>
                  <input
                    type="checkbox"
                    checked={challenges.includes(option.id)}
                    onChange={() => toggleChallenge(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      {error && (
        <p className="field-error mt-16" role="alert">{error}</p>
      )}

      <div className="row mt-24" style={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => { setError(''); setStep(0) }}
          disabled={step === 0}
        >
          上一步
        </button>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          {step === 1 ? '完成并进入首页' : '继续'}
        </button>
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>
        设置与进度仅保存在当前站点的浏览器中，不要求注册；练习输入不上传。AI 试炼场例外，需你在该页单独勾选同意后，才会把输入发往你自己配置的模型服务。
      </p>
    </div>
  )
}
