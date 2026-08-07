import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ProgressRecord, Reflection, StoredData, UserSettings } from '@/types'
import {
  addProgressRecord,
  addReflection,
  clearStoredData,
  loadStoredDataWithStatus,
  removeReflection,
  toggleFavorite as persistFavorite,
  updateSettings,
  type StorageRecovery,
} from '@/lib/storage/storage'
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults'

interface AppDataContextValue {
  data: StoredData
  updateSettings: (patch: Partial<UserSettings>) => void
  completeScenario: (record: ProgressRecord) => void
  saveReflection: (reflection: Reflection) => void
  deleteReflection: (id: string) => void
  toggleFavorite: (scenarioId: string) => void
  clearAll: () => void
  resetSettings: () => void
  storageRecovery: StorageRecovery | null
  clearCorruptStorage: () => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [initialLoad] = useState(loadStoredDataWithStatus)
  const [data, setData] = useState<StoredData>(initialLoad.data)
  const [storageRecovery, setStorageRecovery] = useState<StorageRecovery | null>(
    initialLoad.recovery,
  )

  useEffect(() => {
    document.documentElement.classList.toggle(
      'reduce-motion',
      data.settings.reducedMotion,
    )
  }, [data.settings.reducedMotion])

  const handleUpdateSettings = useCallback((patch: Partial<UserSettings>) => {
    setData(updateSettings(patch))
  }, [])

  const handleCompleteScenario = useCallback((record: ProgressRecord) => {
    setData(addProgressRecord(record))
  }, [])

  const handleSaveReflection = useCallback((reflection: Reflection) => {
    setData(addReflection(reflection))
  }, [])

  const handleDeleteReflection = useCallback((id: string) => {
    setData(removeReflection(id))
  }, [])

  const handleToggleFavorite = useCallback((scenarioId: string) => {
    setData(persistFavorite(scenarioId))
  }, [])

  const handleClearAll = useCallback(() => {
    clearStoredData()
    setStorageRecovery(null)
    setData({
      schemaVersion: 1,
      settings: { ...DEFAULT_SETTINGS },
      progress: [],
      favorites: [],
      reflections: [],
    })
  }, [])

  const handleResetSettings = useCallback(() => {
    setData(
      updateSettings({
        isAdultConfirmed: false,
        selectedChallenges: [],
        onboardingCompleted: false,
      }),
    )
  }, [])

  const handleClearCorruptStorage = useCallback(() => {
    clearStoredData()
    setStorageRecovery(null)
    setData({
      schemaVersion: 1,
      settings: { ...DEFAULT_SETTINGS },
      progress: [],
      favorites: [],
      reflections: [],
    })
  }, [])

  const value = useMemo(
    () => ({
      data,
      updateSettings: handleUpdateSettings,
      completeScenario: handleCompleteScenario,
      saveReflection: handleSaveReflection,
      deleteReflection: handleDeleteReflection,
      toggleFavorite: handleToggleFavorite,
      clearAll: handleClearAll,
      resetSettings: handleResetSettings,
      storageRecovery,
      clearCorruptStorage: handleClearCorruptStorage,
    }),
    [
      data,
      handleUpdateSettings,
      handleCompleteScenario,
      handleSaveReflection,
      handleDeleteReflection,
      handleToggleFavorite,
      handleClearAll,
      handleResetSettings,
      storageRecovery,
      handleClearCorruptStorage,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData 必须在 AppDataProvider 内使用')
  return ctx
}
