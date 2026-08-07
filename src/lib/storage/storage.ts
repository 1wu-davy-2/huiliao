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
    const parsed = storedDataSchema.parse(JSON.parse(raw))
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return { data: migrate(parsed), recovery: null }
    }
    return { data: parsed, recovery: null }
  } catch {
    return { data: fallback, recovery: { rawData: raw } }
  }
}

export function loadStoredData(storage: Storage = window.localStorage): StoredData {
  return loadStoredDataWithStatus(storage).data
}

function migrate(data: StoredData): StoredData {
  const migrated: StoredData = {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    progress: Array.isArray(data.progress) ? data.progress : [],
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    reflections: Array.isArray(data.reflections) ? data.reflections : [],
  }
  return migrated
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
