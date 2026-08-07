import { openDB, type IDBPDatabase } from 'idb'
import type { TrialSessionRecord } from '@/types'

const DB_NAME = 'huiliao-ai-trials'
const DB_VERSION = 1
const STORE_NAME = 'sessions'

const MAX_SESSIONS = 20
const MAX_TOTAL_BYTES = 25 * 1024 * 1024 // 25 MB
const MAX_SINGLE_BYTES = 2 * 1024 * 1024   // 2 MB

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('completedAt', 'completedAt')
          store.createIndex('mode', 'mode')
        }
      },
    })
  }
  return dbPromise
}

function byteSize(record: TrialSessionRecord): number {
  return new Blob([JSON.stringify(record)]).size
}

export async function saveTrialSession(
  record: TrialSessionRecord,
): Promise<{ saved: boolean; evictedIds: string[]; error?: string }> {
  const size = byteSize(record)
  if (size > MAX_SINGLE_BYTES) {
    return { saved: false, evictedIds: [], error: '记录过大（超过 2 MB）' }
  }

  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  // 写入
  await store.put(record)

  // 超出数量上限 → 删除最旧
  const all = await store.getAll()
  all.sort((a, b) => a.completedAt.localeCompare(b.completedAt))

  const evictedIds: string[] = []
  while (all.length > MAX_SESSIONS) {
    const oldest = all.shift()!
    evictedIds.push(oldest.id)
    await store.delete(oldest.id)
  }

  // 超出容量上限 → 继续删最旧
  let total = all.reduce((sum, r) => sum + byteSize(r), 0)
  while (total > MAX_TOTAL_BYTES && all.length > 0) {
    const oldest = all.shift()!
    evictedIds.push(oldest.id)
    total -= byteSize(oldest)
    await store.delete(oldest.id)
  }

  await tx.done
  return { saved: true, evictedIds }
}

export async function listTrialSessions(): Promise<TrialSessionRecord[]> {
  const db = await getDb()
  const all = await db.getAll(STORE_NAME)
  all.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  return all
}

export async function getTrialSession(id: string): Promise<TrialSessionRecord | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

export async function deleteTrialSession(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

export async function clearTrialSessions(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.objectStore(STORE_NAME).clear()
  await tx.done
}

export function exportTrialSession(record: TrialSessionRecord): void {
  const json = JSON.stringify(record, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `huiliao-ai-trial-${record.id}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** 关闭数据库连接（用于测试清理） */
export async function closeTrialDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}
