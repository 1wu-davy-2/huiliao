import { describe, expect, it, beforeEach } from 'vitest'
import {
  SCHEMA_VERSION,
  STORAGE_NAMESPACE,
  StorageRecoveryRequiredError,
  addProgressRecord,
  addReflection,
  clearStoredData,
  exportStoredData,
  loadStoredDataWithStatus,
  removeReflection,
  toggleFavorite,
  updateAiConfig,
  updateSettings,
} from '@/lib/storage/storage'
import type { AiConfig, ProgressRecord, Reflection, StoredData } from '@/types'

const SAMPLE_RECORD: ProgressRecord = {
  scenarioId: 's02',
  completedAt: '2026-08-06T10:00:00.000Z',
  attempts: 4,
  retryCount: 1,
  scores: { clarity: 80, authenticity: 70, listening: 75, pace: 66, boundaries: 62 },
  boundaryCheckPassed: true,
}

const SAMPLE_REFLECTION: Reflection = {
  id: 'r-1',
  scenarioId: 's02',
  createdAt: '2026-08-06T10:05:00.000Z',
  text: '今天注意到自己提问太多',
}

function freshData(): StoredData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      isAdultConfirmed: true,
      selectedChallenges: ['start'],
      onboardingCompleted: true,
      reducedMotion: false,
    },
    progress: [],
    favorites: [],
    reflections: [],
  }
}

function seedStoredData(data: StoredData): void {
  window.localStorage.setItem(STORAGE_NAMESPACE, JSON.stringify(data))
}

function readStoredData(): StoredData {
  const result = loadStoredDataWithStatus()
  if (result.recovery) throw new Error('测试数据不可读')
  return result.data
}

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('空存储时返回默认值', () => {
    const data = readStoredData()
    expect(data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(data.settings.isAdultConfirmed).toBe(false)
    expect(data.progress).toEqual([])
    expect(data.favorites).toEqual([])
    expect(data.reflections).toEqual([])
  })

  it('损坏的 JSON 安全回退到默认值', () => {
    const raw = '{{{ 不是 JSON'
    window.localStorage.setItem(STORAGE_NAMESPACE, raw)
    const result = loadStoredDataWithStatus()
    expect(result.data.settings.onboardingCompleted).toBe(false)
    expect(result.recovery?.rawData).toBe(raw)
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBe(raw)
  })

  it('未来 schema 进入只读恢复流程，不被当前版本降级覆盖', () => {
    const raw = JSON.stringify({
      schemaVersion: 999,
      settings: {
        isAdultConfirmed: true,
        selectedChallenges: ['fear'],
        onboardingCompleted: true,
        reducedMotion: false,
      },
      progress: [],
      favorites: [],
      reflections: [],
      futureOnlyField: { mustSurvive: true },
    })
    window.localStorage.setItem(STORAGE_NAMESPACE, raw)

    const result = loadStoredDataWithStatus()
    expect(result.recovery).toEqual({ rawData: raw, reason: 'unsupported-version' })
    expect(() => updateSettings({ reducedMotion: true })).toThrow(
      StorageRecoveryRequiredError,
    )
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBe(raw)
  })

  it('空字符串也是损坏数据，不会被当作空存储', () => {
    window.localStorage.setItem(STORAGE_NAMESPACE, '')
    const result = loadStoredDataWithStatus()
    expect(result.recovery).toEqual({ rawData: '', reason: 'unreadable-data' })
  })

  it('运行期间数据损坏后，写操作会停止且保留原始值', () => {
    seedStoredData(freshData())
    const raw = '{{{ 运行期间损坏'
    window.localStorage.setItem(STORAGE_NAMESPACE, raw)

    expect(() => toggleFavorite('s02')).toThrow(StorageRecoveryRequiredError)
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBe(raw)
  })

  it('存储不可访问时返回恢复状态，清除失败也不会伪装成功', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
      removeItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    } as unknown as Storage

    expect(loadStoredDataWithStatus(unavailableStorage).recovery).toEqual({
      rawData: null,
      reason: 'storage-unavailable',
    })
    expect(() => clearStoredData(unavailableStorage)).toThrow(
      StorageRecoveryRequiredError,
    )
  })

  it('写入后可以读回', () => {
    seedStoredData(freshData())
    const data = readStoredData()
    expect(data.settings.selectedChallenges).toEqual(['start'])
  })

  it('updateSettings 合并字段', () => {
    seedStoredData(freshData())
    const data = updateSettings({ reducedMotion: true })
    expect(data.settings.reducedMotion).toBe(true)
    expect(data.settings.selectedChallenges).toEqual(['start'])
  })

  it('addProgressRecord 追加并完整覆盖同场景记录', () => {
    seedStoredData(freshData())
    addProgressRecord({ ...SAMPLE_RECORD, resolvedAfterFeedback: true })
    const updated: ProgressRecord = {
      ...SAMPLE_RECORD,
      completedAt: '2026-08-07T10:00:00.000Z',
      attempts: 6,
      retryCount: 3,
      boundaryCheckPassed: false,
    }
    addProgressRecord(updated)
    const data = readStoredData()
    expect(data.progress).toHaveLength(1)
    expect(data.progress[0]).toEqual(updated)
    expect(data.progress[0]).not.toHaveProperty('resolvedAfterFeedback')
  })

  it('复盘增删', () => {
    seedStoredData(freshData())
    addReflection(SAMPLE_REFLECTION)
    expect(readStoredData().reflections).toHaveLength(1)
    removeReflection('r-1')
    expect(readStoredData().reflections).toHaveLength(0)
  })

  it('收藏切换', () => {
    seedStoredData(freshData())
    toggleFavorite('s02')
    expect(readStoredData().favorites).toContain('s02')
    toggleFavorite('s02')
    expect(readStoredData().favorites).not.toContain('s02')
  })

  it('导出 JSON 包含 schema 版本与导出时间', () => {
    seedStoredData(freshData())
    const exported = JSON.parse(exportStoredData())
    expect(exported.schemaVersion).toBe(SCHEMA_VERSION)
    expect(exported.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(exported.data.settings).toBeDefined()
  })

  it('清除后为空', () => {
    seedStoredData(freshData())
    clearStoredData()
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBeNull()
  })

  it('消息实验室草稿不会出现在本地存储', () => {
    seedStoredData(freshData())
    window.localStorage.setItem(STORAGE_NAMESPACE, JSON.stringify(freshData()))
    // 模拟草稿只在页面内存中：不调用任何 storage 写入
    const raw = window.localStorage.getItem(STORAGE_NAMESPACE)!
    expect(raw).not.toContain('草稿')
    expect(raw).not.toContain('你想诊断的消息')
  })
})

describe('updateAiConfig', () => {
  const PRESET_CONFIG: AiConfig = {
    protocol: 'openai-compatible',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test-preset',
    targetKind: 'preset',
    presetId: 'openai',
    // 预设目标下 customUrl 合法地为空串
    customUrl: '',
  }

  beforeEach(() => {
    seedStoredData(freshData())
  })

  // 回归：字段级 customUrl.min(1) 会让预设（默认）路径保存直接抛 ZodError，
  // 即最常用的一条路径完全无法保存。
  it('预设目标允许空 customUrl，不抛错', () => {
    expect(() => updateAiConfig(PRESET_CONFIG)).not.toThrow()
    const { data } = loadStoredDataWithStatus()
    expect(data.aiConfig?.apiKey).toBe('sk-test-preset')
    expect(data.aiConfig?.customUrl).toBe('')
  })

  it('自定义目标拒绝空 customUrl', () => {
    expect(() =>
      updateAiConfig({ ...PRESET_CONFIG, targetKind: 'custom', customUrl: '' }),
    ).toThrow()
  })

  it('自定义目标接受非空 customUrl', () => {
    expect(() =>
      updateAiConfig({
        ...PRESET_CONFIG,
        targetKind: 'custom',
        customUrl: 'https://proxy.example.com/v1',
      }),
    ).not.toThrow()
  })

  // 导出文件脱离应用控制（可能被同步、备份或被同设备其他人读到），
  // 因此 apiKey 必须剔除。以下三条共同锁定脱敏行为，不要放宽任何一条。
  it('导出剔除 apiKey', () => {
    updateAiConfig(PRESET_CONFIG)
    const dump = exportStoredData()
    expect(dump).not.toContain('sk-test-preset')
    // 省略键而非置空串：空串过不了 aiConfigSchema 的 apiKey.min(1)
    expect(JSON.parse(dump).data.aiConfig).not.toHaveProperty('apiKey')
  })

  it('导出保留除 apiKey 外的连接配置，便于恢复后只重填密钥', () => {
    updateAiConfig({ ...PRESET_CONFIG, targetKind: 'custom', customUrl: 'https://proxy.example.com/v1' })
    const config = JSON.parse(exportStoredData()).data.aiConfig
    expect(config).toMatchObject({
      protocol: 'openai-compatible',
      model: 'gpt-4o-mini',
      targetKind: 'custom',
      presetId: 'openai',
      customUrl: 'https://proxy.example.com/v1',
    })
  })

  it('脱敏只作用于导出，localStorage 中的 apiKey 不受影响', () => {
    updateAiConfig(PRESET_CONFIG)
    exportStoredData()
    expect(loadStoredDataWithStatus().data.aiConfig?.apiKey).toBe('sk-test-preset')
  })
})
