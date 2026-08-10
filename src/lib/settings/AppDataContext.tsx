import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AiConfig, ProgressRecord, Reflection, StoredData, TrialSummary, UserSettings } from '@/types'
import {
  addProgressRecord,
  addReflection,
  addTrialSummary,
  clearStoredData,
  createFallbackData,
  exportStoredData,
  loadStoredDataWithStatus,
  reconcileTrialSummaries,
  removeReflection,
  removeTrialSummary,
  STORAGE_NAMESPACE,
  StorageRecoveryRequiredError,
  toggleFavorite as persistFavorite,
  updateAiConfig,
  updateSettings,
  type StorageRecovery,
} from '@/lib/storage/storage'
import { clearTrialSessions } from '@/lib/ai/trialDb'

interface AppDataContextValue {
  data: StoredData
  updateSettings: (patch: Partial<UserSettings>) => boolean
  saveAiConfig: (config: AiConfig) => boolean
  completeScenario: (record: ProgressRecord) => boolean
  saveReflection: (reflection: Reflection) => boolean
  deleteReflection: (id: string) => boolean
  toggleFavorite: (scenarioId: string) => boolean
  exportData: () => string | null
  clearAll: () => Promise<void>
  resetSettings: () => boolean
  storageRecovery: StorageRecovery | null
  storageRecoveryError: string | null
  retryStorage: () => boolean
  clearCorruptStorage: () => Promise<void>
  saveTrialSummary: (summary: TrialSummary) => void
  removeTrialSummary: (id: string) => void
  reconcileSummaries: (dbIds: string[]) => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [initialLoad] = useState(loadStoredDataWithStatus)
  const [data, setData] = useState<StoredData>(initialLoad.data)
  const [storageRecovery, setStorageRecovery] = useState<StorageRecovery | null>(
    initialLoad.recovery,
  )
  const [storageRecoveryError, setStorageRecoveryError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle(
      'reduce-motion',
      data.settings.reducedMotion,
    )
  }, [data.settings.reducedMotion])

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_NAMESPACE) return
      const next = loadStoredDataWithStatus()
      setData(next.data)
      setStorageRecovery(next.recovery)
      setStorageRecoveryError(null)
    }

    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [])

  const enterRecovery = useCallback((error: unknown, message?: string): boolean => {
    if (!(error instanceof StorageRecoveryRequiredError)) return false
    setStorageRecovery(error.recovery)
    setStorageRecoveryError(message ?? null)
    return true
  }, [])

  const runMutation = useCallback(
    (operation: () => StoredData): boolean => {
      try {
        setData(operation())
        return true
      } catch (error) {
        if (enterRecovery(error)) return false
        throw error
      }
    },
    [enterRecovery],
  )

  const handleUpdateSettings = useCallback(
    (patch: Partial<UserSettings>) => runMutation(() => updateSettings(patch)),
    [runMutation],
  )

  const handleSaveAiConfig = useCallback(
    (config: AiConfig) => runMutation(() => updateAiConfig(config)),
    [runMutation],
  )

  const handleCompleteScenario = useCallback(
    (record: ProgressRecord) => runMutation(() => addProgressRecord(record)),
    [runMutation],
  )

  const handleSaveReflection = useCallback(
    (reflection: Reflection) => runMutation(() => addReflection(reflection)),
    [runMutation],
  )

  const handleDeleteReflection = useCallback(
    (id: string) => runMutation(() => removeReflection(id)),
    [runMutation],
  )

  const handleToggleFavorite = useCallback(
    (scenarioId: string) => runMutation(() => persistFavorite(scenarioId)),
    [runMutation],
  )

  const handleExportData = useCallback((): string | null => {
    try {
      return exportStoredData()
    } catch (error) {
      if (enterRecovery(error, '导出失败，本地数据未被改写。请检查存储权限后重新读取。')) {
        return null
      }
      throw error
    }
  }, [enterRecovery])

  const handleClearAll = useCallback(async () => {
    // 记录优先：先清 IndexedDB 完整对话，成功后再清 localStorage 信封。
    // IndexedDB 失败时向上抛出，由调用方显示错误；localStorage 保持原样以便重试，
    // 不声称清除成功。
    await clearTrialSessions()
    try {
      clearStoredData()
      setStorageRecovery(null)
      setStorageRecoveryError(null)
      setData(createFallbackData())
    } catch (error) {
      if (enterRecovery(error, '清除失败，原数据未被删除。请检查存储权限后重试读取。')) return
      throw error
    }
  }, [enterRecovery])

  const handleResetSettings = useCallback(
    () =>
      runMutation(() =>
        updateSettings({
          isAdultConfirmed: false,
          selectedChallenges: [],
          onboardingCompleted: false,
        }),
      ),
    [runMutation],
  )

  const handleClearCorruptStorage = useCallback(async () => {
    // 与全局清除同序：IndexedDB 优先，失败则抛出且不动 localStorage 原值
    await clearTrialSessions()
    try {
      clearStoredData()
      setStorageRecovery(null)
      setStorageRecoveryError(null)
      setData(createFallbackData())
    } catch (error) {
      if (enterRecovery(error, '清除失败，原数据未被删除。请检查存储权限后重试读取。')) return
      throw error
    }
  }, [enterRecovery])

  const handleRetryStorage = useCallback((): boolean => {
    const next = loadStoredDataWithStatus()
    setData(next.data)
    setStorageRecovery(next.recovery)
    if (next.recovery) {
      setStorageRecoveryError(
        next.recovery.reason === 'storage-unavailable'
          ? '仍无法访问本地存储，原数据未被改写。请检查浏览器权限后再试。'
          : '重新读取后数据仍不可用，原值未被改写。',
      )
      return false
    }
    setStorageRecoveryError(null)
    return true
  }, [])

  const handleSaveTrialSummary = useCallback(
    (summary: TrialSummary) => {
      runMutation(() => addTrialSummary(summary))
    },
    [runMutation],
  )

  const handleRemoveTrialSummary = useCallback(
    (id: string) => {
      runMutation(() => removeTrialSummary(id))
    },
    [runMutation],
  )

  const handleReconcileSummaries = useCallback(
    (dbIds: string[]) => {
      runMutation(() => reconcileTrialSummaries(dbIds))
    },
    [runMutation],
  )

  const value = useMemo(
    () => ({
      data,
      updateSettings: handleUpdateSettings,
      saveAiConfig: handleSaveAiConfig,
      completeScenario: handleCompleteScenario,
      saveReflection: handleSaveReflection,
      deleteReflection: handleDeleteReflection,
      toggleFavorite: handleToggleFavorite,
      exportData: handleExportData,
      clearAll: handleClearAll,
      resetSettings: handleResetSettings,
      storageRecovery,
      storageRecoveryError,
      retryStorage: handleRetryStorage,
      clearCorruptStorage: handleClearCorruptStorage,
      saveTrialSummary: handleSaveTrialSummary,
      removeTrialSummary: handleRemoveTrialSummary,
      reconcileSummaries: handleReconcileSummaries,
    }),
    [
      data,
      handleUpdateSettings,
      handleSaveAiConfig,
      handleCompleteScenario,
      handleSaveReflection,
      handleDeleteReflection,
      handleToggleFavorite,
      handleExportData,
      handleClearAll,
      handleResetSettings,
      storageRecovery,
      storageRecoveryError,
      handleRetryStorage,
      handleClearCorruptStorage,
      handleSaveTrialSummary,
      handleRemoveTrialSummary,
      handleReconcileSummaries,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData 必须在 AppDataProvider 内使用')
  return ctx
}
