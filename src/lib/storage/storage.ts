import type {
  ProgressRecord,
  Reflection,
  StoredData,
  UserSettings,
} from '@/types'
import { progressRecordSchema, storedDataSchema, settingsSchema } from '@/schemas'
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults'

export const STORAGE_NAMESPACE = 'huiliao:v1'
export const SCHEMA_VERSION = 1

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
  }
}

function resolveStorage(storage?: Storage): Storage {
  return storage ?? window.localStorage
}

export function loadStoredDataWithStatus(storage?: Storage): StoredDataLoadResult {
  const fallback = createFallbackData()
  let target: Storage
  let raw: string | null

  try {
    target = resolveStorage(storage)
    raw = target.getItem(STORAGE_NAMESPACE)
  } catch {
    return {
      data: fallback,
      recovery: { rawData: null, reason: 'storage-unavailable' },
    }
  }

  if (raw === null) return { data: fallback, recovery: null }

  try {
    const decoded: unknown = JSON.parse(raw)
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !Number.isInteger((decoded as { schemaVersion?: unknown }).schemaVersion)
    ) {
      throw new Error('缺少有效 schemaVersion')
    }

    const version = (decoded as { schemaVersion: number }).schemaVersion
    if (version !== SCHEMA_VERSION) {
      return {
        data: fallback,
        recovery: { rawData: raw, reason: 'unsupported-version' },
      }
    }

    return { data: storedDataSchema.parse(decoded), recovery: null }
  } catch {
    return {
      data: fallback,
      recovery: { rawData: raw, reason: 'unreadable-data' },
    }
  }
}

function loadWritableData(storage?: Storage): StoredData {
  const result = loadStoredDataWithStatus(storage)
  if (result.recovery) throw new StorageRecoveryRequiredError(result.recovery)
  return result.data
}

function saveStoredData(data: StoredData, storage?: Storage): void {
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

export function updateSettings(
  patch: Partial<UserSettings>,
  storage?: Storage,
): StoredData {
  const data = loadWritableData(storage)
  data.settings = settingsSchema.parse({ ...data.settings, ...patch })
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

export function exportStoredData(storage?: Storage): string {
  const data = loadWritableData(storage)
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
