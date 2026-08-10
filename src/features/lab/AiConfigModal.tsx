import { useCallback, useEffect, useState } from 'react'
import type { AiConfig, ApiProtocol } from '@/types'
import { useAppData } from '@/lib/settings/AppDataContext'
import { testConnection } from '@/lib/ai/trialClient'
import { selectChallenge } from '@/lib/ai/selectChallenge'
import { getPublishedTrials } from '@/content/ai-trials'

interface Props {
  onClose: () => void
}

/**
 * 根据协议自动补全 Base URL 的路径前缀。
 * 仅当用户未提供路径（/ 或空）时追加默认值；已有路径则保留原值。
 */
function normalizeBaseUrl(raw: string, protocol: ApiProtocol): string {
  try {
    const url = new URL(raw.trim())
    if (url.pathname === '' || url.pathname === '/') {
      url.pathname = protocol === 'gemini' ? '/v1beta' : '/v1'
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return raw
  }
}

export default function AiConfigModal({ onClose }: Props) {
  const { data, saveAiConfig } = useAppData()
  const saved = data.aiConfig

  const [protocol, setProtocol] = useState<ApiProtocol>(saved?.protocol ?? 'openai-compatible')
  const [targetKind, setTargetKind] = useState<'preset' | 'custom'>(saved?.targetKind ?? 'preset')
  const [presetId, setPresetId] = useState(saved?.presetId ?? 'openai')
  const [customUrl, setCustomUrl] = useState(saved?.customUrl ?? '')
  const [model, setModel] = useState(saved?.model ?? '')
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? '')
  const [roundLimit, setRoundLimit] = useState(10)
  const [connStatus, setConnStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 切换协议 + 目标时重置连接状态
  useEffect(() => {
    setConnStatus(null)
  }, [protocol, targetKind, presetId, customUrl])

  const handleTestConnection = useCallback(async () => {
    if (!apiKey || !model) {
      setConnStatus('请先填写 API Key 和模型 ID')
      return
    }
    const pool = getPublishedTrials()
    if (pool.length === 0) {
      setConnStatus('暂无可用的已审校题目，无法测试连接')
      return
    }
    const challenge = selectChallenge('communication', 'simple', [], Math.random)
    if (!challenge) {
      setConnStatus('选题失败，请稍后重试')
      return
    }

    setConnStatus('连接中...')
    const target = targetKind === 'preset'
      ? { kind: 'preset' as const, presetId }
      : { kind: 'custom' as const, baseUrl: normalizeBaseUrl(customUrl, protocol) }

    const result = await testConnection(apiKey, {
      mode: 'communication',
      difficulty: 'simple',
      challengeId: challenge.id,
      protocol,
      target,
      model,
    })
    setConnStatus(result.message)
  }, [apiKey, model, targetKind, presetId, customUrl, protocol])

  const handleSave = useCallback(() => {
    if (!apiKey || !model) return

    const config: AiConfig = {
      protocol,
      model: model.trim(),
      apiKey: apiKey.trim(),
      targetKind,
      presetId,
      customUrl: targetKind === 'custom' ? normalizeBaseUrl(customUrl, protocol) : customUrl,
    }

    setSaving(true)
    const ok = saveAiConfig(config)
    if (ok) {
      onClose()
    } else {
      setSaving(false)
      setConnStatus('保存失败，存储不可用。请检查浏览器存储权限。')
    }
  }, [apiKey, model, protocol, targetKind, presetId, customUrl, saveAiConfig, onClose])

  const canTest = apiKey && model
  const canSave = apiKey && model

  return (
    <div className="ai-config-modal-overlay" onClick={onClose}>
      <div className="ai-config-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="AI 连接配置">
        <h2>AI 连接配置</h2>
        <p className="ai-subtitle">配置将保存在此浏览器的本地存储中，仅用于向你的模型服务发起请求。</p>

        {/* 协议 */}
        <div className="ai-field-group">
          <label className="ai-label" htmlFor="ai-config-protocol">协议</label>
          <select
            id="ai-config-protocol"
            className="ai-select"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as ApiProtocol)}
          >
            <option value="openai-compatible">OpenAI-compatible</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        {/* 连接目标 */}
        <div className="ai-field-group">
          <span className="ai-label" id="ai-config-target-label">连接目标</span>
          <div className="ai-segmented" role="group" aria-labelledby="ai-config-target-label">
            <button className={`ai-seg-btn ${targetKind === 'preset' ? 'active' : ''}`} onClick={() => setTargetKind('preset')}>官方预设</button>
            <button className={`ai-seg-btn ${targetKind === 'custom' ? 'active' : ''}`} onClick={() => setTargetKind('custom')}>自定义地址</button>
          </div>
        </div>

        {targetKind === 'preset' ? (
          <div className="ai-field-group">
            <label className="ai-label" htmlFor="ai-config-preset">预设服务</label>
            <select
              id="ai-config-preset"
              className="ai-select"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              <option value="openai">api.openai.com</option>
              <option value="anthropic">api.anthropic.com</option>
              <option value="gemini">generativelanguage.googleapis.com</option>
            </select>
          </div>
        ) : (
          <div className="ai-field-group">
            <label className="ai-label" htmlFor="ai-config-base-url">Base URL (HTTPS)</label>
            <input
              id="ai-config-base-url"
              className="ai-input"
              type="url"
              placeholder="https://your-proxy.example.com"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <p className="ai-hint">
              输入主机地址即可（如 <code>https://api.openai.com</code>），保存时自动补全路径前缀
              （OpenAI-compatible / Anthropic → <code>/v1</code>，Gemini → <code>/v1beta</code>）。
              如需自定义路径（如 <code>/v2</code>），直接写入完整地址。
            </p>
          </div>
        )}

        {/* 模型 ID */}
        <div className="ai-field-group">
          <label className="ai-label" htmlFor="ai-config-model">模型 ID</label>
          <input
            id="ai-config-model"
            className="ai-input"
            type="text"
            placeholder="gpt-4o-mini / claude-haiku-4-5 / gemini-2.0-flash"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>

        {/* API Key */}
        <div className="ai-field-group">
          <label className="ai-label" htmlFor="ai-config-api-key">API Key</label>
          <input
            id="ai-config-api-key"
            className="ai-input"
            type="password"
            placeholder="sk-... / xai-... / AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="ai-hint">
            ⚠ API Key 将保存在此浏览器的本地存储中。使用可随时撤销的最小权限密钥。浏览器扩展、开发者工具仍可能观察到它。
          </p>
        </div>

        {/* 最大轮数 */}
        <div className="ai-field-group">
          <label className="ai-label" htmlFor="ai-config-round-limit">默认轮数 ({roundLimit})</label>
          <input
            id="ai-config-round-limit"
            className="ai-range"
            type="range"
            min={5}
            max={30}
            value={roundLimit}
            onChange={(e) => setRoundLimit(Number(e.target.value))}
          />
        </div>

        {/* 连接状态 */}
        {connStatus && (
          <p className={`ai-status${connStatus === '连接成功' ? '' : ' ai-status-warn'}`}>{connStatus}</p>
        )}

        {/* 按钮组 */}
        <div className="ai-config-actions">
          <button className="btn btn-secondary" onClick={handleTestConnection} disabled={!canTest}>
            测试连接
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? '保存中...' : '保存配置'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
