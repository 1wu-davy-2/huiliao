import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { ApiProtocol, TrialChallenge, TrialDifficulty, TrialMode, TrialEvaluation, TrialSessionRecord, TrialSummary } from '@/types'
import { createInitialState, trialReducer } from '@/lib/ai/trialReducer'
import { selectChallenge } from '@/lib/ai/selectChallenge'
import { sendTurn, requestEvaluation, testConnection } from '@/lib/ai/trialClient'
import type { EvaluationResponse } from '@/lib/ai/trialClient'
import { runAllChecks, calculateHardScore } from '@/lib/ai/trialChecks'
import { saveTrialSession, listTrialSessions, deleteTrialSession, clearTrialSessions, exportTrialSession } from '@/lib/ai/trialDb'
import { useAppData } from '@/lib/settings/AppDataContext'
import { safetyCheck } from '@/lib/safety/safety'
import { getPublishedTrials } from '@/content/ai-trials'
import LabTabs from './LabTabs'
import './aiTrial.css'

type ViewPage = 'setup' | 'active' | 'history'

function generateId(): string {
  return `trial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function AiTrialPage() {
  const { saveTrialSummary, removeTrialSummary, reconcileSummaries } = useAppData()
  const [view, setView] = useState<ViewPage>('setup')
  const [state, dispatch] = useReducer(trialReducer, null, createInitialState)

  // Setup
  const [mode, setMode] = useState<TrialMode>('communication')
  const [difficulty, setDifficulty] = useState<TrialDifficulty>('simple')
  const [protocol, setProtocol] = useState<ApiProtocol>('openai-compatible')
  const [targetKind, setTargetKind] = useState<'preset' | 'custom'>('preset')
  const [presetId, setPresetId] = useState('openai')
  const [customUrl, setCustomUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [roundLimit, setRoundLimit] = useState(10)
  const [consent, setConsent] = useState(false)
  const [challenge, setChallenge] = useState<TrialChallenge | undefined>()
  const [connStatus, setConnStatus] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [historySessions, setHistorySessions] = useState<TrialSessionRecord[]>([])
  const [evalResult, setEvalResult] = useState<TrialEvaluation | null>(null)

  const apiKeyRef = useRef(apiKey)
  apiKeyRef.current = apiKey

  // 清空 API key 当协议或目标变化
  const clearKey = useCallback(() => {
    setApiKey('')
    setConsent(false)
  }, [])

  useEffect(() => {
    clearKey()
  }, [protocol, targetKind, presetId, customUrl, clearKey])

  // 清空 key on unmount
  useEffect(() => {
    return () => setApiKey('')
  }, [])

  const pool = getPublishedTrials()

  const handleRandomChallenge = useCallback(() => {
    const picked = selectChallenge(mode, difficulty, [], Math.random)
    setChallenge(picked)
  }, [mode, difficulty])

  const handleTestConnection = useCallback(async () => {
    if (!apiKey || !model) {
      setConnStatus('请先填写 API Key 和模型 ID')
      return
    }
    // 同意门禁：测试连接同样会把 API Key 与题目提示词发往目标服务，
    // 因此必须在勾选确认之后才允许发送，不能早于披露。
    if (!consent) {
      setConnStatus('请先勾选确认：测试连接同样会把内容发送到你填写的模型服务')
      return
    }
    // 服务端题目审核门会拒绝任何未审校 challengeId，因此连接测试必须携带
    // 一道真实的已审校题目，不能用占位串。
    if (!challenge) {
      setConnStatus('请先随机选题：连接测试需要一道已审校题目')
      return
    }
    setConnStatus('连接中...')
    const target = targetKind === 'preset'
      ? { kind: 'preset' as const, presetId }
      : { kind: 'custom' as const, baseUrl: customUrl }
    const result = await testConnection(apiKey, {
      mode,
      difficulty,
      challengeId: challenge.id,
      protocol,
      target,
      model,
    })
    setConnStatus(result.message)
  }, [apiKey, model, consent, challenge, mode, difficulty, targetKind, presetId, customUrl, protocol])

  const handleStartChallenge = useCallback(() => {
    if (!challenge || !apiKey || !model || !consent) return
    dispatch({ type: 'START', roundLimit })
    setView('active')
    setErrorMsg(null)
  }, [challenge, apiKey, model, consent, roundLimit])

  const handleSubmit = useCallback(async (content: string) => {
    if (!challenge || !apiKeyRef.current) return
    // 安全检查
    const safety = safetyCheck(content)
    if (safety.level === 'blocked') {
      setErrorMsg(safety.explanation)
      return
    }

    const requestId = generateId()
    dispatch({ type: 'SUBMIT', requestId, content })

    const target = targetKind === 'preset'
      ? { kind: 'preset' as const, presetId }
      : { kind: 'custom' as const, baseUrl: customUrl }

    try {
      const resp = await sendTurn(apiKeyRef.current, {
        mode,
        difficulty,
        challengeId: challenge.id,
        protocol,
        target,
        model,
        roundLimit,
        roundsUsed: state.roundsUsed,
        messages: [
          ...state.messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content },
        ],
      })
      dispatch({ type: 'MODEL_RESPONSE', requestId, content: resp.text })
      setErrorMsg(null)
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      dispatch({ type: 'REQUEST_FAILED', requestId, errorCode: e.code || 'NETWORK' })
      setErrorMsg(e.message || '请求失败')
    }
  }, [challenge, mode, difficulty, protocol, targetKind, presetId, customUrl, model, roundLimit, state.roundsUsed, state.messages])

  const handleFinish = useCallback(async () => {
    dispatch({ type: 'FINISH' })
  }, [])

  // 评估
  useEffect(() => {
    if (state.phase !== 'evaluating' || !challenge || !apiKeyRef.current) return

    const doEvaluate = async () => {
      // 硬规则检查
      const output = state.messages
        .filter((m) => m.role === 'assistant')
        .map((m) => m.content)
        .join('\n')
      // 本地先算一份，仅用于服务端不可用时的兜底展示
      const localChecks = runAllChecks(challenge.hardChecks, output)
      let checkResults: TrialSessionRecord['hardCheckResults'] = localChecks
      let hardScore = calculateHardScore(localChecks)
      dispatch({ type: 'SET_HARD_SCORE', score: hardScore })

      // 调用模型自评
      const target = targetKind === 'preset'
        ? { kind: 'preset' as const, presetId }
        : { kind: 'custom' as const, baseUrl: customUrl }

      let envelope: EvaluationResponse | null = null
      try {
        envelope = await requestEvaluation(apiKeyRef.current, {
          mode,
          difficulty,
          challengeId: challenge.id,
          protocol,
          target,
          model,
          roundLimit,
          roundsUsed: state.roundsUsed,
          messages: state.messages.map((m) => ({ role: m.role, content: m.content })),
        })
      } catch {
        // 自评失败不阻塞收尾：保留本地硬规则结果并给出不可用状态
        envelope = null
      }

      // 服务端按已审校题目重新计算硬规则，具有权威性，覆盖本地结果。
      // 绝不用浏览器算出的分数替代服务端结论。
      if (envelope) {
        checkResults = envelope.hardCheckResults
        hardScore = envelope.hardScore
        dispatch({ type: 'SET_HARD_SCORE', score: hardScore })
      }

      const evaluation = envelope?.evaluation ?? null
      if (evaluation) {
        setEvalResult(evaluation)
      } else {
        dispatch({ type: 'EVALUATION_ERROR' })
      }

      // 保存会话
      const presetHosts: Record<string, string> = { openai: 'api.openai.com', anthropic: 'api.anthropic.com', gemini: 'generativelanguage.googleapis.com' }
      const upstreamHost = targetKind === 'preset'
        ? (presetHosts[presetId] || presetId)
        : new URL(customUrl).hostname

      const sessionRecord: TrialSessionRecord = {
        id: generateId(),
        challengeId: challenge.id,
        mode,
        difficulty,
        protocol,
        model,
        upstreamHost,
        roundLimit,
        roundsUsed: state.roundsUsed,
        hardScore,
        selfScore: evaluation?.score ?? null,
        completedAt: new Date().toISOString(),
        challengeSnapshot: {
          id: challenge.id,
          mode: challenge.mode,
          difficulty: challenge.difficulty,
          title: challenge.title,
          brief: challenge.brief,
          objective: challenge.objective,
          initialPrompt: challenge.initialPrompt,
          testInput: challenge.testInput,
          acceptanceCriteria: challenge.acceptanceCriteria,
          hardChecks: challenge.hardChecks,
        },
        messages: state.messages,
        hardCheckResults: checkResults,
        evaluation,
      }

      // 顺序：先写 IndexedDB 完整记录（真相源），再更新 localStorage 摘要索引
      const saveResult = await saveTrialSession(sessionRecord)
      if (!saveResult.saved) {
        setErrorMsg(saveResult.error ?? '对话保存失败，本次记录未写入本地历史。')
        return
      }

      const summary: TrialSummary = {
        id: sessionRecord.id,
        challengeId: sessionRecord.challengeId,
        mode: sessionRecord.mode,
        difficulty: sessionRecord.difficulty,
        protocol: sessionRecord.protocol,
        model: sessionRecord.model,
        roundLimit: sessionRecord.roundLimit,
        roundsUsed: sessionRecord.roundsUsed,
        hardScore: sessionRecord.hardScore,
        selfScore: sessionRecord.selfScore,
        completedAt: sessionRecord.completedAt,
      }

      try {
        // 配额淘汰掉的记录已从 IndexedDB 移除，对应摘要必须同步删除，否则留下孤儿索引
        for (const evictedId of saveResult.evictedIds) {
          removeTrialSummary(evictedId)
        }
        saveTrialSummary(summary)
      } catch {
        // 完整对话已保存，仅索引写入失败：保留对话，下次加载历史时 reconcile 重建
        setErrorMsg('对话已保存，但历史索引更新失败。下次打开试炼历史会自动重建索引。')
      }
    }

    doEvaluate()
  }, [state.phase])

  const loadHistory = useCallback(async () => {
    const sessions = await listTrialSessions()
    setHistorySessions(sessions)
    // 以 IndexedDB 为真相源重建摘要索引，清掉保存/删除失败留下的孤儿摘要
    reconcileSummaries(sessions.map((s) => s.id))
    setView('history')
  }, [reconcileSummaries])

  if (pool.length === 0 && view === 'setup') {
    return (
      <main className="ai-trial-page">
        <LabTabs />
        <div className="ai-empty">
          <h2>AI 试炼场</h2>
          <p>暂无已审核题目。题目池正在专业审校中，通过后将自动开放。</p>
        </div>
      </main>
    )
  }

  return (
    <main className="ai-trial-page">
      <LabTabs />

      {view === 'setup' && (
        <div className="ai-setup">
          <h2>AI 试炼场</h2>
          <p className="ai-subtitle">使用你自己的模型连接，进行可重复的随机挑战</p>

          {/* 模式 & 难度 */}
          <div className="ai-field-group">
            <span className="ai-label" id="ai-mode-label">模式</span>
            <div className="ai-segmented" role="group" aria-labelledby="ai-mode-label">
              {(['communication', 'promptcraft'] as const).map((m) => (
                <button key={m} className={`ai-seg-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
                  {m === 'communication' ? '沟通试炼' : 'Prompt 工程试炼'}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-field-group">
            <span className="ai-label" id="ai-difficulty-label">难度</span>
            <div className="ai-segmented" role="group" aria-labelledby="ai-difficulty-label">
              {(['simple', 'normal', 'hard'] as const).map((d) => (
                <button key={d} className={`ai-seg-btn ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
                  {{ simple: '简单', normal: '一般', hard: '困难' }[d]}
                </button>
              ))}
            </div>
          </div>

          {/* 协议 */}
          <div className="ai-field-group">
            <label className="ai-label" htmlFor="ai-protocol">协议</label>
            <select id="ai-protocol" className="ai-select" value={protocol} onChange={(e) => setProtocol(e.target.value as ApiProtocol)}>
              <option value="openai-compatible">OpenAI-compatible</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {/* 连接目标 */}
          <div className="ai-field-group">
            <span className="ai-label" id="ai-target-label">连接目标</span>
            <div className="ai-segmented" role="group" aria-labelledby="ai-target-label">
              <button className={`ai-seg-btn ${targetKind === 'preset' ? 'active' : ''}`} onClick={() => setTargetKind('preset')}>官方预设</button>
              <button className={`ai-seg-btn ${targetKind === 'custom' ? 'active' : ''}`} onClick={() => setTargetKind('custom')}>自定义地址</button>
            </div>
          </div>

          {targetKind === 'preset' ? (
            <div className="ai-field-group">
              <label className="ai-label" htmlFor="ai-preset">预设服务</label>
              <select id="ai-preset" className="ai-select" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                <option value="openai">api.openai.com</option>
                <option value="anthropic">api.anthropic.com</option>
                <option value="gemini">generativelanguage.googleapis.com</option>
              </select>
            </div>
          ) : (
            <div className="ai-field-group">
              <label className="ai-label" htmlFor="ai-base-url">Base URL (HTTPS)</label>
              <input id="ai-base-url" className="ai-input" type="url" placeholder="https://your-proxy.example.com/v1" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} />
            </div>
          )}

          {/* 模型 ID */}
          <div className="ai-field-group">
            <label className="ai-label" htmlFor="ai-model">模型 ID</label>
            <input id="ai-model" className="ai-input" type="text" placeholder="gpt-4o-mini / claude-haiku-4-5 / gemini-2.0-flash" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>

          {/* API Key */}
          <div className="ai-field-group">
            <label className="ai-label" htmlFor="ai-api-key">API Key</label>
            <input id="ai-api-key" className="ai-input" type="password" placeholder="sk-... / xai-... / AIza..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <p className="ai-hint">只在本次页面内存中使用，不会保存；浏览器扩展、开发者工具和中转服务仍可能看到它。</p>
          </div>

          {/* 最大轮数 */}
          <div className="ai-field-group">
            <label className="ai-label" htmlFor="ai-round-limit">最大轮数 ({roundLimit})</label>
            <input id="ai-round-limit" className="ai-range" type="range" min={5} max={30} value={roundLimit} onChange={(e) => setRoundLimit(Number(e.target.value))} />
          </div>

          {/* 随机选题 */}
          <button className="btn btn-secondary" onClick={handleRandomChallenge}>随机换一题</button>

          {/* 连接测试 */}
          <button className="btn btn-ghost mt-8" onClick={handleTestConnection} disabled={!apiKey || !model}>测试连接</button>
          {connStatus && <p className="ai-status">{connStatus}</p>}

          {/* 挑战预览 */}
          {challenge && (
            <div className="ai-challenge-preview card">
              <h3>{challenge.title}</h3>
              <p>{challenge.objective}</p>
              <p className="muted">预计轮数: {challenge.difficulty === 'simple' ? '5-10' : challenge.difficulty === 'normal' ? '10-20' : '15-30'}</p>
              <p className="muted">验收条件: {challenge.acceptanceCriteria.join('、')}</p>
            </div>
          )}

          {/* 同意 */}
          <label className="ai-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            我知道输入和模型回复会发送到我填写的模型服务。结束后的模型自评会额外调用一次当前模型，并消耗 Token 或账户余额。
          </label>

          <button className="btn btn-primary" onClick={handleStartChallenge} disabled={!challenge || !apiKey || !model || !consent}>
            开始试炼
          </button>

          <button className="btn btn-ghost mt-16" onClick={loadHistory}>查看本地历史</button>

          {errorMsg && <p className="ai-error" role="alert">{errorMsg}</p>}
        </div>
      )}

      {view === 'active' && challenge && (
        <TrialActiveView
          mode={mode}
          challenge={challenge}
          state={state}
          errorMsg={errorMsg}
          evalResult={evalResult}
          onSubmit={handleSubmit}
          onFinish={handleFinish}
          onReset={() => { setView('setup'); dispatch({ type: 'RESET' }); setEvalResult(null) }}
        />
      )}

      {view === 'history' && (
        <HistoryView
          sessions={historySessions}
          onBack={() => setView('setup')}
          onRefresh={() => loadHistory()}
          onSummaryRemoved={removeTrialSummary}
          onSummariesCleared={() => reconcileSummaries([])}
        />
      )}
    </main>
  )
}

// ─── 试炼进行中视图 ─────────────────────────────────────────

function TrialActiveView({
  mode,
  challenge,
  state,
  errorMsg,
  evalResult,
  onSubmit,
  onFinish,
  onReset,
}: {
  mode: TrialMode
  challenge: TrialChallenge
  state: ReturnType<typeof createInitialState>
  errorMsg: string | null
  evalResult: TrialEvaluation | null
  onSubmit: (content: string) => Promise<void>
  onFinish: () => void
  onReset: () => void
}) {
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || submitting) return
    setSubmitting(true)
    await onSubmit(input)
    setInput('')
    setSubmitting(false)
  }

  if (state.phase === 'evaluating' || state.phase === 'complete') {
    return (
      <div className="ai-result">
        <h2>试炼完成</h2>
        <section className="card">
          <h3>硬规则检查</h3>
          <p>得分: {state.hardScore} / 100</p>
        </section>
        {evalResult ? (
          <section className="card">
            <h3>模型自评</h3>
            <p className="ai-disclaimer">模型自评，仅供比较，不是客观基准。本次自评额外调用了 1 次模型。</p>
            <p>分数: {evalResult.score} / 100</p>
            {evalResult.strengths.length > 0 && <p>做得好的: {evalResult.strengths.join('；')}</p>}
            {evalResult.weaknesses.length > 0 && <p>可改进: {evalResult.weaknesses.join('；')}</p>}
            <p>建议: {evalResult.nextAction}</p>
          </section>
        ) : (
          <p className="muted">模型自评不可用</p>
        )}
        {errorMsg && <p className="ai-error" role="alert">{errorMsg}</p>}
        <button className="btn btn-primary mt-16" onClick={onReset}>返回设置</button>
      </div>
    )
  }

  return (
    <div className="ai-active">
      <div className="ai-active-header">
        <h2>{challenge.title}</h2>
        <p className="muted">第 {state.roundsUsed} / {state.roundLimit} 轮</p>
      </div>

      {mode === 'communication' ? (
        <div className="ai-chat">
          <p className="ai-brief">{challenge.brief}</p>
          <p className="ai-initial">{challenge.initialPrompt}</p>
          <div className="ai-messages">
            {state.messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                <span className="ai-msg-label">{m.role === 'user' ? '你' : '对方'}</span>
                <p>{m.content}</p>
              </div>
            ))}
          </div>
          {state.pendingRequestId && <p className="ai-loading">模型回复生成中...</p>}
          <p className="ai-warning">这是一场可复盘的模拟，不预测真实关系结果。对方可以拒绝，你也可以随时结束。</p>
        </div>
      ) : (
        <div className="ai-promptcraft">
          <p className="ai-brief">{challenge.brief}</p>
          {challenge.testInput && (
            <div className="card">
              <h4>固定测试输入</h4>
              <pre className="ai-test-input">{challenge.testInput}</pre>
            </div>
          )}
          <p><strong>验收条件:</strong> {challenge.acceptanceCriteria.join('；')}</p>
          <div className="ai-messages">
            {state.messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                <span className="ai-msg-label">{m.role === 'user' ? '你的 Prompt' : '模型输出'}</span>
                <pre className="ai-output">{m.content}</pre>
              </div>
            ))}
          </div>
          <p className="muted">第 {state.roundsUsed} / {state.roundLimit} 次提交</p>
          {state.pendingRequestId && <p className="ai-loading">模型输出生成中...</p>}
        </div>
      )}

      <div className="ai-composer">
        <textarea
          className="ai-textarea"
          rows={4}
          placeholder={mode === 'communication' ? '输入你的消息...' : '输入你的 Prompt...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={state.pendingRequestId !== null || state.phase !== 'running'}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        />
        <div className="ai-composer-actions">
          <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || submitting || state.pendingRequestId !== null}>
            发送
          </button>
          <button className="btn btn-ghost" onClick={onFinish} disabled={state.roundsUsed === 0}>结束并评估</button>
        </div>
      </div>

      {errorMsg && <p className="ai-error" role="alert">{errorMsg}</p>}
    </div>
  )
}

// ─── 历史视图 ────────────────────────────────────────────────

function HistoryView({
  sessions,
  onBack,
  onRefresh,
  onSummaryRemoved,
  onSummariesCleared,
}: {
  sessions: TrialSessionRecord[]
  onBack: () => void
  onRefresh: () => void
  onSummaryRemoved: (id: string) => void
  onSummariesCleared: () => void
}) {
  const [historyError, setHistoryError] = useState<string | null>(null)

  // 删除顺序与保存一致：先删 IndexedDB 完整记录，再删 localStorage 摘要。
  // IndexedDB 失败时不动摘要，也不谎报成功。
  const handleDelete = async (id: string) => {
    setHistoryError(null)
    try {
      await deleteTrialSession(id)
    } catch {
      setHistoryError('删除失败，本地记录未变更。')
      return
    }
    onSummaryRemoved(id)
    onRefresh()
  }

  const handleClearAll = async () => {
    setHistoryError(null)
    try {
      await clearTrialSessions()
    } catch {
      setHistoryError('清除失败，本地记录未变更。')
      return
    }
    onSummariesCleared()
    onRefresh()
  }

  return (
    <div className="ai-history">
      <button className="btn btn-ghost" onClick={onBack}>← 返回设置</button>
      <h2>试炼历史</h2>
      <p className="ai-hint">完整对话只保存在当前浏览器 IndexedDB，最近 20 次或 25 MB，达到上限自动清理最旧记录。</p>
      {historyError && (
        <p className="ai-error" role="alert">{historyError}</p>
      )}

      {sessions.length === 0 ? (
        <p className="muted">暂无历史记录</p>
      ) : (
        <>
          {sessions.map((s) => (
            <div key={s.id} className="card ai-history-item">
              <p><strong>{s.challengeSnapshot.title}</strong></p>
              <p className="muted">
                {s.mode === 'communication' ? '沟通试炼' : 'Prompt 工程'} · {s.difficulty} · {s.model}
              </p>
              <p className="muted">{s.roundsUsed} / {s.roundLimit} 轮 · 硬规则 {s.hardScore} 分 · {new Date(s.completedAt).toLocaleString()}</p>
              <div className="row mt-8">
                <button className="btn btn-ghost btn-sm" onClick={() => exportTrialSession(s)}>导出</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}>删除</button>
              </div>
            </div>
          ))}
          <button className="btn btn-danger mt-16" onClick={handleClearAll}>清除全部试炼记录</button>
        </>
      )}
    </div>
  )
}
