import type {
  ProgressRecord,
  Reflection,
  StoredData,
  TrialSummary,
  UserSettings,
} from '@/types'
import { progressRecordSchema, storedDataSchema, settingsSchema } from '@/schemas'
import { trialSummarySchema } from '@/schemas/ai-trials'
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults'

export const STORAGE_NAMESPACE = 'huiliao:v1'
export const SCHEMA_VERSION = 2

export interface StorageRecovery {
  rawData: string | null
}

export interface StoredDataLoadResult {
  data: StoredData
  recovery: StorageRecovery | null
}

function createFallbackData(): StoredData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    progress: [],
    favorites: [],
    reflections: [],
    trialSummaries: [],
  }
}

/**
 * v1→v2 迁移：v1 无 trialSummaries 字段。
 * 未来版本或未知版本（如 999）进入 raw-backup recovery。
 */
function getRawVersion(raw: string): number | null {
  try {
    const envelope = JSON.parse(raw)
    if (typeof envelope?.schemaVersion === 'number') return envelope.schemaVersion
    return null
  } catch {
    return null
  }
}

export function loadStoredDataWithStatus(
  storage: Storage = window.localStorage,
): StoredDataLoadResult {
  const fallback = createFallbackData()
  let raw: string | null = null

  try {
    raw = storage.getItem(STORAGE_NAMESPACE)
    if (!raw) return { data: fallback, recovery: null }

    const rawVersion = getRawVersion(raw)
    if (rawVersion === 1) {
      // v1→v2 迁移
      const v1 = JSON.parse(raw)
      const migrated: StoredData = {
        schemaVersion: SCHEMA_VERSION,
        settings: { ...DEFAULT_SETTINGS, ...v1.settings },
        progress: Array.isArray(v1.progress) ? v1.progress : [],
        favorites: Array.isArray(v1.favorites) ? v1.favorites : [],
        reflections: Array.isArray(v1.reflections) ? v1.reflections : [],
        trialSummaries: [],
      }
      return { data: migrated, recovery: null }
    }

    // 尝试用当前 schema 解析（兼容不同版本的合法数据）
    const parsed = storedDataSchema.safeParse(JSON.parse(raw))
    if (parsed.success) {
      return {
        data: { ...parsed.data, schemaVersion: SCHEMA_VERSION, trialSummaries: parsed.data.trialSummaries ?? [] },
        recovery: null,
      }
    }
    // 无法解析 → recovery
    throw new Error('schema mismatch')
  } catch {
    return { data: fallback, recovery: { rawData: raw } }
  }
}

export function loadStoredData(storage: Storage = window.localStorage): StoredData {
  return loadStoredDataWithStatus(storage).data
}

export function addTrialSummary(
  summary: TrialSummary,
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  const summaries = data.trialSummaries ?? []
  const parsed = trialSummarySchema.parse(summary)
  // 替换同 ID 或插入
  const idx = summaries.findIndex((s) => s.id === parsed.id)
  if (idx >= 0) {
    summaries[idx] = parsed
  } else {
    summaries.unshift(parsed)
  }
  // 最多 20 条
  const trimmed = summaries.slice(0, 20)
  data.trialSummaries = trimmed
  saveStoredData(data, storage)
  return data
}

export function removeTrialSummary(
  id: string,
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  data.trialSummaries = (data.trialSummaries ?? []).filter((s) => s.id !== id)
  saveStoredData(data, storage)
  return data
}

export function clearTrialSummaries(storage: Storage = window.localStorage): StoredData {
  const data = loadStoredData(storage)
  data.trialSummaries = []
  saveStoredData(data, storage)
  return data
}

/**
 * 根据 IndexedDB 中的实际记录重建 localStorage 摘要列表。
 * 在 localStorage 写入失败后，下次加载历史时调用。
 */
export function reconcileTrialSummaries(
  dbIds: string[],
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  data.trialSummaries = (data.trialSummaries ?? []).filter((s) => dbIds.includes(s.id))
  saveStoredData(data, storage)
  return data
}

export function saveStoredData(
  data: StoredData,
  storage: Storage = window.localStorage,
): void {
  const serialized = JSON.stringify({
    ...data,
    schemaVersion: SCHEMA_VERSION,
  })
  storage.setItem(STORAGE_NAMESPACE, serialized)
}

export function updateSettings(
  patch: Partial<UserSettings>,
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  data.settings = settingsSchema.parse({ ...data.settings, ...patch })
  saveStoredData(data, storage)
  return data
}

export function addProgressRecord(
  record: ProgressRecord,
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  const parsedRecord = progressRecordSchema.parse(record)
  const existingIndex = data.progress.findIndex((r) => r.scenarioId === record.scenarioId)
  if (existingIndex >= 0) {
    data.progress[existingIndex] = parsedRecord
  } else {
    data.progress.unshift(parsedRecord)
  }
  saveStoredData(data, storage)
  return data
}

export function addReflection(
  reflection: Reflection,
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  data.reflections.unshift(reflection)
  saveStoredData(data, storage)
  return data
}

export function removeReflection(
  id: string,
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  data.reflections = data.reflections.filter((r) => r.id !== id)
  saveStoredData(data, storage)
  return data
}

export function toggleFavorite(
  scenarioId: string,
  storage: Storage = window.localStorage,
): StoredData {
  const data = loadStoredData(storage)
  if (data.favorites.includes(scenarioId)) {
    data.favorites = data.favorites.filter((id) => id !== scenarioId)
  } else {
    data.favorites.push(scenarioId)
  }
  saveStoredData(data, storage)
  return data
}

export function exportStoredData(storage: Storage = window.localStorage): string {
  const data = loadStoredData(storage)
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  )
}

export function clearStoredData(storage: Storage = window.localStorage): void {
  storage.removeItem(STORAGE_NAMESPACE)
}
