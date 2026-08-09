import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  FlaskConical,
  ShieldAlert,
} from 'lucide-react'
import { analyzeMessage } from '@/lib/analysis/analyze'
import { SkillBars } from '@/components/ui/SkillBars'
import {
  PURPOSE_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
  type LabContext,
  type PurposeKey,
  type StageKey,
  type StatusKey,
} from '@/types'

const MAX_LENGTH = 600

interface Sample {
  label: string
  context: LabContext
  text: string
}

const SAMPLES: Sample[] = [
  {
    label: '低压力邀约',
    context: { stage: 'chatting', purpose: 'invite', responseStatus: 'positive' },
    text: '周末天气不错，听说公园的花开了。你有空的话可以一起走走，没空就下次。',
  },
  {
    label: '回应对方上次的话题',
    context: { stage: 'matched', purpose: 'continue', responseStatus: 'positive' },
    text: '你上次说的那家店，我后来去试了，还挺好。你说到的那道菜确实值得点。',
  },
  {
    label: '体面接受拒绝',
    context: { stage: 'chatting', purpose: 'end', responseStatus: 'rejection' },
    text: '明白了，我尊重你的决定。我不会再联系你，祝你以后顺利。',
  },
]

// 顶部返回链接。原先是 LabTabs 两页签，/lab 改为入口页后语义不再成立，
// 改为单向面包屑：本页是 /lab 的下一级。
const breadcrumbStyle: React.CSSProperties = {
  marginBottom: 24,
}

// Stitch _2 的编辑式节奏：小号大写 eyebrow + 大标题 + 长呼吸段
const sectionShellStyle: React.CSSProperties = {
  borderTop: '1px solid var(--line)',
  paddingTop: 40,
  marginTop: 48,
}

const fieldGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 20,
}

export default function MessageLabPage() {
  const [stage, setStage] = useState<StageKey | ''>('')
  const [purpose, setPurpose] = useState<PurposeKey | ''>('')
  const [responseStatus, setResponseStatus] = useState<StatusKey | ''>('')
  const [text, setText] = useState('')
  const [result, setResult] = useState<ReturnType<typeof analyzeMessage> | null>(null)
  const [rewritten, setRewritten] = useState('')
  const [rewrittenDone, setRewrittenDone] = useState(false)
  const [error, setError] = useState('')

  const remaining = MAX_LENGTH - text.length

  const loadSample = (sample: Sample) => {
    setStage(sample.context.stage)
    setPurpose(sample.context.purpose)
    setResponseStatus(sample.context.responseStatus)
    setText(sample.text)
    setResult(null)
    setRewritten('')
    setRewrittenDone(false)
    setError('')
  }

  const submit = () => {
    if (!stage || !purpose || !responseStatus) {
      setError('请先选择关系阶段、沟通目的和对方回应状态。')
      return
    }
    if (text.trim().length === 0) {
      setError('请粘贴或输入你想诊断的草稿。')
      return
    }
    setError('')
    setResult(
      analyzeMessage(
        { stage, purpose, responseStatus },
        text.trim(),
      ),
    )
    setRewritten('')
    setRewrittenDone(false)
  }

  const submitRewrite = () => {
    if (rewritten.trim().length === 0) {
      setError('请先写下你自己的版本，再保存。')
      return
    }
    setError('')
    setRewrittenDone(true)
  }

  return (
    <>
      <nav aria-label="面包屑" style={breadcrumbStyle}>
        <Link to="/lab" className="entry-link">
          <ArrowLeft size={16} aria-hidden="true" />
          返回训练中心
        </Link>
      </nav>
      <header className="page-head" style={{ maxWidth: '52rem' }}>
        <span className="eyebrow">诊断工具</span>
        <h1 className="page-title mt-16">消息实验室</h1>
        <p className="page-sub">
          粘贴一条真实草稿，查看它的清晰度、真诚、倾听、分寸和边界诊断。诊断只基于本地规则，不承诺预测对方反应。
        </p>
      </header>

      <div className="feedback feedback-warning mt-24" style={{ maxWidth: '52rem' }}>
        <p className="bold">
          <EyeOff size={16} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
          先做脱敏，再粘贴
        </p>
        <p className="small mt-8">
          不要输入真实姓名、电话号码、账号、地址或任何能识别到第三方的信息。原始草稿诊断后不会保存，也不会上传任何内容。
        </p>
      </div>

      <section aria-labelledby="draft-title" style={sectionShellStyle}>
        <div className="section-head">
          <h2 className="section-title" id="draft-title">
            1. 选择上下文
          </h2>
        </div>
        <div style={fieldGridStyle}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="lab-stage">
              关系阶段
            </label>
            <select
              id="lab-stage"
              className="select"
              value={stage}
              onChange={(e) => setStage(e.target.value as StageKey | '')}
            >
              <option value="">请选择</option>
              {(Object.keys(STAGE_LABELS) as StageKey[]).map((k) => (
                <option key={k} value={k}>
                  {STAGE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="lab-purpose">
              沟通目的
            </label>
            <select
              id="lab-purpose"
              className="select"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as PurposeKey | '')}
            >
              <option value="">请选择</option>
              {(Object.keys(PURPOSE_LABELS) as PurposeKey[]).map((k) => (
                <option key={k} value={k}>
                  {PURPOSE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="lab-status">
              对方回应状态
            </label>
            <select
              id="lab-status"
              className="select"
              value={responseStatus}
              onChange={(e) => setResponseStatus(e.target.value as StatusKey | '')}
            >
              <option value="">请选择</option>
              {(Object.keys(STATUS_LABELS) as StatusKey[]).map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section aria-labelledby="draft-input-title" style={sectionShellStyle}>
        <div className="section-head">
          <h2 className="section-title" id="draft-input-title">
            2. 粘贴草稿
          </h2>
          <span className="small muted">上限 {MAX_LENGTH} 字</span>
        </div>
        <label className="field" htmlFor="lab-draft" style={{ marginBottom: 16 }}>
          <span className="field-label">你的草稿</span>
          <textarea
            id="lab-draft"
            className="textarea"
            rows={6}
            maxLength={MAX_LENGTH}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setResult(null)
              setError('')
            }}
            placeholder="粘贴或输入你想诊断的消息草稿……"
          />
          <span className="char-count">剩余 {remaining} 字</span>
        </label>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            {SAMPLES.map((sample) => (
              <button
                type="button"
                key={sample.label}
                className="btn btn-ghost btn-sm"
                onClick={() => loadSample(sample)}
              >
                <FlaskConical size={14} aria-hidden="true" />
                {sample.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={submit}>
            开始诊断
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        {error && (
          <p className="field-error mt-16" role="alert">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section aria-labelledby="result-title" style={sectionShellStyle}>
          <div className="section-head">
            <h2 className="section-title" id="result-title">
              3. 诊断结果
            </h2>
            {result.status === 'ok' && (
              <span className="tag tag-success">
                <CheckCircle2 size={12} aria-hidden="true" /> 正常
              </span>
            )}
            {result.status === 'caution' && (
              <span className="tag tag-warning">
                <AlertTriangle size={12} aria-hidden="true" /> 谨慎
              </span>
            )}
            {result.status === 'blocked' && (
              <span className="tag tag-warning">
                <ShieldAlert size={12} aria-hidden="true" /> 已拦截
              </span>
            )}
          </div>

          {result.status === 'blocked' ? (
            <div className="feedback feedback-warning">
              <h3>这条内容不会被继续处理</h3>
              {result.concerns.map((c) => (
                <p key={c}>{c}</p>
              ))}
              <p className="small muted">
                产品不提供操控、欺骗、强迫、纠缠或伤害他人的做法，也不会输出这类改写。
              </p>
              <p className="bold mt-16">安全替代：{result.stopCondition}</p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 32 }}>
              {result.status === 'caution' && result.concerns.length > 0 && (
                <div className="feedback feedback-warning">
                  <h3>先看一下这两个风险</h3>
                  <ul className="stack">
                    {result.concerns.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.strengths.length > 0 && (
                <div>
                  <span className="eyebrow">做得好的地方</span>
                  <ul className="stack mt-16">
                    {result.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.status === 'ok' && result.concerns.length > 0 && (
                <div>
                  <span className="eyebrow">值得注意</span>
                  <ul className="stack mt-16">
                    {result.concerns.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <span className="eyebrow">五维诊断</span>
                <div className="mt-16">
                  <SkillBars scores={result.scores} />
                </div>
              </div>

              <div>
                <span className="eyebrow">改写原则</span>
                <p className="mt-16">{result.rewritePrinciple}</p>
              </div>

              <div>
                <span className="eyebrow">三种自然版本</span>
                <div className="stack mt-16" style={{ gap: 16 }}>
                  {result.examples.map((example) => (
                    <div key={example.tone} className="feedback">
                      <div className="row">
                        <span className="tag tag-primary">{example.tone}</span>
                        <span className="small muted">为什么这样改：{example.why}</span>
                      </div>
                      <p className="mt-8">{example.text}</p>
                    </div>
                  ))}
                </div>
                <p className="small muted mt-16">
                  何时不该继续：{result.stopCondition}
                </p>
                <p className="small mt-8" style={{ color: 'var(--warning)' }}>
                  每个示例都要按自己的真实语气重写，不要照抄。
                </p>
              </div>

              <div>
                <span className="eyebrow">用自己的话重写</span>
                <label className="field mt-16" htmlFor="lab-rewrite">
                  <span className="field-label">你的重写版本</span>
                  <textarea
                    id="lab-rewrite"
                    className="textarea"
                    rows={4}
                    value={rewritten}
                    onChange={(e) => {
                      setRewritten(e.target.value)
                      setRewrittenDone(false)
                    }}
                    placeholder="看完示例后，写一个属于你自己的版本……"
                  />
                </label>
                <div className="row">
                  <button type="button" className="btn btn-primary" onClick={submitRewrite}>
                    保存我的版本
                  </button>
                  {rewrittenDone && (
                    <span className="small muted" role="status">
                      已记录（仅本次页面内，不会保存到本地数据）
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
