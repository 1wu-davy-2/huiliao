import type {
  AiConfig,
  ProgressRecord,
  Reflection,
  StoredData,
  TrialSummary,
  UserSettings,
} from '@/types'
import { aiConfigSchema, progressRecordSchema, storedDataSchema, settingsSchema } from '@/schemas'
import { trialSummarySchema } from '@/schemas/ai-trials'
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults'

export const STORAGE_NAMESPACE = 'huiliao:v1'
export const SCHEMA_VERSION = 3

export type StorageRecoveryReason =
  | 'unreadable-data'
  | 'unsupported-version'
  | 'storage-unavailable'

export interface StorageRecovery {
  rawData: string | null
  reason: StorageRecoveryReason
}

export interface StoredDataLoadResult {
  data: StoredData
  recovery: StorageRecovery | null
}

export class StorageRecoveryRequiredError extends Error {
  recovery: StorageRecovery

  constructor(recovery: StorageRecovery) {
    super('本地数据需要先恢复或清除')
    this.name = 'StorageRecoveryRequiredError'
    this.recovery = recovery
  }
}

export function createFallbackData(): StoredData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    progress: [],
    favorites: [],
    reflections: [],
    trialSummaries: [],
    aiConfig: undefined,
  }
}

function resolveStorage(storage?: Storage): Storage {
  return storage ?? window.localStorage
}

/** 从原始串中读取 schemaVersion；无法解析返回 null。 */
function getRawVersion(raw: string): number | null {
  try {
    const envelope = JSON.parse(raw)
    if (typeof envelope?.schemaVersion === 'number') return envelope.schemaVersion
    return null
  } catch {
    return null
  }
}

export function loadStoredDataWithStatus(storage?: Storage): StoredDataLoadResult {
  const fallback = createFallbackData()
  let raw: string | null = null

  try {
    raw = resolveStorage(storage).getItem(STORAGE_NAMESPACE)
  } catch {
    return {
      data: fallback,
      recovery: { rawData: null, reason: 'storage-unavailable' },
    }
  }

  if (raw === null) return { data: fallback, recovery: null }

  try {
    const rawVersion = getRawVersion(raw)
    if (rawVersion !== null && rawVersion !== SCHEMA_VERSION) {
      if (rawVersion === 1) {
        // v1→v2 迁移：v1 无 trialSummaries 字段，就地补上，不换存储键
        const v1 = JSON.parse(raw)
        const migrated: StoredData = {
          schemaVersion: SCHEMA_VERSION,
          settings: { ...DEFAULT_SETTINGS, ...v1.settings },
          progress: Array.isArray(v1.progress) ? v1.progress : [],
          favorites: Array.isArray(v1.favorites) ? v1.favorites : [],
          reflections: Array.isArray(v1.reflections) ? v1.reflections : [],
          trialSummaries: [],
          aiConfig: undefined,
        }
        return { data: migrated, recovery: null }
      }
      if (rawVersion === 2) {
        // v2→v3 迁移：v2 无 aiConfig 字段，就地补上
        const v2 = JSON.parse(raw)
        const migrated: StoredData = {
          schemaVersion: SCHEMA_VERSION,
          settings: { ...DEFAULT_SETTINGS, ...v2.settings },
          progress: Array.isArray(v2.progress) ? v2.progress : [],
          favorites: Array.isArray(v2.favorites) ? v2.favorites : [],
          reflections: Array.isArray(v2.reflections) ? v2.reflections : [],
          trialSummaries: Array.isArray(v2.trialSummaries) ? v2.trialSummaries : [],
          aiConfig: undefined,
        }
        return { data: migrated, recovery: null }
      }
      // 未来版本：只读恢复流程，不被当前版本降级覆盖
      return {
        data: fallback,
        recovery: { rawData: raw, reason: 'unsupported-version' },
      }
    }

    // 尝试用当前 schema 解析（兼容同版本不同字段的合法数据）
    const parsed = storedDataSchema.safeParse(JSON.parse(raw))
    if (parsed.success) {
      return {
        data: {
          ...parsed.data,
          schemaVersion: SCHEMA_VERSION,
          trialSummaries: parsed.data.trialSummaries ?? [],
        },
        recovery: null,
      }
    }
    throw new Error('schema mismatch')
  } catch {
    return {
      data: fallback,
      recovery: { rawData: raw, reason: 'unreadable-data' },
    }
  }
}

export function loadStoredData(storage?: Storage): StoredData {
  return loadStoredDataWithStatus(storage).data
}

/** 写操作统一入口：恢复态（含运行期间损坏）下任何写入都必须停止并抛出。 */
function loadWritableData(storage?: Storage): StoredData {
  const result = loadStoredDataWithStatus(storage)
  if (result.recovery) throw new StorageRecoveryRequiredError(result.recovery)
  return result.data
}

export function saveStoredData(data: StoredData, storage?: Storage): void {
  let rawData: string | null = null
  try {
    const target = resolveStorage(storage)
    rawData = target.getItem(STORAGE_NAMESPACE)
    const serialized = JSON.stringify({
      ...data,
      schemaVersion: SCHEMA_VERSION,
    })
    target.setItem(STORAGE_NAMESPACE, serialized)
  } catch {
    throw new StorageRecoveryRequiredError({
      rawData,
      reason: 'storage-unavailable',
    })
  }
}

export function addTrialSummary(
  summary: TrialSummary,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
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
  data.trialSummaries = summaries.slice(0, 20)
  saveStoredData(data, storage)
  return data
}

export function removeTrialSummary(
  id: string,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  data.trialSummaries = (data.trialSummaries ?? []).filter((s) => s.id !== id)
  saveStoredData(data, storage)
  return data
}

export function clearTrialSummaries(storage?: Storage): StoredData {
  const data = loadWritableData(storage)
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
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  data.trialSummaries = (data.trialSummaries ?? []).filter((s) => dbIds.includes(s.id))
  saveStoredData(data, storage)
  return data
}

export function updateSettings(
  patch: Partial<UserSettings>,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  data.settings = settingsSchema.parse({ ...data.settings, ...patch })
  saveStoredData(data, storage)
  return data
}

export function updateAiConfig(
  config: AiConfig,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  data.aiConfig = aiConfigSchema.parse(config)
  saveStoredData(data, storage)
  return data
}

export function addProgressRecord(
  record: ProgressRecord,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
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
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  data.reflections.unshift(reflection)
  saveStoredData(data, storage)
  return data
}

export function removeReflection(
  id: string,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  data.reflections = data.reflections.filter((r) => r.id !== id)
  saveStoredData(data, storage)
  return data
}

export function toggleFavorite(
  scenarioId: string,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  if (data.favorites.includes(scenarioId)) {
    data.favorites = data.favorites.filter((id) => id !== scenarioId)
  } else {
    data.favorites.push(scenarioId)
  }
  saveStoredData(data, storage)
  return data
}

/**
 * 导出为可下载 JSON。
 *
 * aiConfig.apiKey 一律剔除：导出文件脱离应用控制，可能被同步、备份或被同设备
 * 其他人读到，明文密钥落在里面的风险远大于「导出后能一键还原」的便利。
 * 其余连接配置（协议、模型、目标）保留，恢复时只需重填密钥。
 *
 * 注意这是「省略键」而非「置空」：置空串无法通过 aiConfigSchema 的
 * apiKey.min(1)，未来若加入导入功能会在校验处直接失败。
 */
export function exportStoredData(storage?: Storage): string {
  const data = loadWritableData(storage)
  const exportable: StoredData = { ...data }
  if (exportable.aiConfig) {
    const { protocol, model, targetKind, presetId, customUrl } = exportable.aiConfig
    // 显式列出保留字段，apiKey 因此不可能被顺带带出；
    // 新增配置字段时需在此处同步，漏加只会少导出，不会泄漏密钥。
    exportable.aiConfig = { protocol, model, targetKind, presetId, customUrl } as StoredData['aiConfig']
  }
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: exportable,
    },
    null,
    2,
  )
}

export function clearStoredData(storage?: Storage): void {
  try {
    resolveStorage(storage).removeItem(STORAGE_NAMESPACE)
  } catch {
    throw new StorageRecoveryRequiredError({
      rawData: null,
      reason: 'storage-unavailable',
    })
  }
}
