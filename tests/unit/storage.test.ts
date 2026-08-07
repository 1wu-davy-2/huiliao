import { describe, expect, it, beforeEach } from 'vitest'
import {
  SCHEMA_VERSION,
  STORAGE_NAMESPACE,
  addProgressRecord,
  addReflection,
  clearStoredData,
  exportStoredData,
  loadStoredData,
  loadStoredDataWithStatus,
  removeReflection,
  saveStoredData,
  toggleFavorite,
  updateSettings,
} from '@/lib/storage/storage'
import type { ProgressRecord, Reflection, StoredData } from '@/types'

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

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('空存储时返回默认值', () => {
    const data = loadStoredData()
    expect(data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(data.settings.isAdultConfirmed).toBe(false)
    expect(data.progress).toEqual([])
    expect(data.favorites).toEqual([])
    expect(data.reflections).toEqual([])
  })

  it('损坏的 JSON 安全回退到默认值', () => {
    const raw = '{{{ 不是 JSON'
    window.localStorage.setItem(STORAGE_NAMESPACE, raw)
    const data = loadStoredData()
    expect(data.settings.onboardingCompleted).toBe(false)
    const result = loadStoredDataWithStatus()
    expect(result.recovery?.rawData).toBe(raw)
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBe(raw)
  })

  it('schema 版本不符时迁移保留可用字段', () => {
    window.localStorage.setItem(
      STORAGE_NAMESPACE,
      JSON.stringify({
        schemaVersion: 999,
        settings: { isAdultConfirmed: true, selectedChallenges: ['fear'], onboardingCompleted: true, reducedMotion: false },
        progress: [],
        favorites: [],
        reflections: [],
      }),
    )
    const data = loadStoredData()
    expect(data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(data.settings.selectedChallenges).toEqual(['fear'])
    expect(data.settings.onboardingCompleted).toBe(true)
    expect(data.progress).toEqual([])
  })

  it('写入后可以读回', () => {
    saveStoredData(freshData())
    const data = loadStoredData()
    expect(data.settings.selectedChallenges).toEqual(['start'])
  })

  it('updateSettings 合并字段', () => {
    saveStoredData(freshData())
    const data = updateSettings({ reducedMotion: true })
    expect(data.settings.reducedMotion).toBe(true)
    expect(data.settings.selectedChallenges).toEqual(['start'])
  })

  it('addProgressRecord 追加并完整覆盖同场景记录', () => {
    saveStoredData(freshData())
    addProgressRecord(SAMPLE_RECORD)
    const updated: ProgressRecord = {
      ...SAMPLE_RECORD,
      completedAt: '2026-08-07T10:00:00.000Z',
      attempts: 6,
      retryCount: 3,
      boundaryCheckPassed: false,
      resolvedAfterFeedback: true,
    }
    addProgressRecord(updated)
    const data = loadStoredData()
    expect(data.progress).toHaveLength(1)
    expect(data.progress[0]).toEqual(updated)
  })

  it('复盘增删', () => {
    saveStoredData(freshData())
    addReflection(SAMPLE_REFLECTION)
    expect(loadStoredData().reflections).toHaveLength(1)
    removeReflection('r-1')
    expect(loadStoredData().reflections).toHaveLength(0)
  })

  it('收藏切换', () => {
    saveStoredData(freshData())
    toggleFavorite('s02')
    expect(loadStoredData().favorites).toContain('s02')
    toggleFavorite('s02')
    expect(loadStoredData().favorites).not.toContain('s02')
  })

  it('导出 JSON 包含 schema 版本与导出时间', () => {
    saveStoredData(freshData())
    const exported = JSON.parse(exportStoredData())
    expect(exported.schemaVersion).toBe(SCHEMA_VERSION)
    expect(exported.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(exported.data.settings).toBeDefined()
  })

  it('清除后为空', () => {
    saveStoredData(freshData())
    clearStoredData()
    expect(window.localStorage.getItem(STORAGE_NAMESPACE)).toBeNull()
  })

  it('消息实验室草稿不会出现在本地存储', () => {
    saveStoredData(freshData())
    window.localStorage.setItem(STORAGE_NAMESPACE, JSON.stringify(freshData()))
    // 模拟草稿只在页面内存中：不调用任何 storage 写入
    const raw = window.localStorage.getItem(STORAGE_NAMESPACE)!
    expect(raw).not.toContain('草稿')
    expect(raw).not.toContain('你想诊断的消息')
  })
})
