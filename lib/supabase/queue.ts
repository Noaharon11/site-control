export interface PendingOperation {
  id: string
  type: string
  at: string
  action?: Record<string, unknown>
}

const OFFLINE_QUEUE_KEY = "sitecontrol-pending-sync-v1"

function isBrowser() {
  return typeof window !== "undefined"
}

function nowIso() {
  return new Date().toISOString()
}

function randomId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export function readQueue(): PendingOperation[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is PendingOperation => {
      if (!x || typeof x !== "object") return false
      const item = x as Record<string, unknown>
      return typeof item.id === "string" && typeof item.type === "string" && typeof item.at === "string"
    })
  } catch {
    return []
  }
}

function writeQueue(items: PendingOperation[]) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items))
  } catch {
    // Ignore quota/storage failures: app state still remains in memory.
  }
}

export function enqueueOperation(type: string, action?: Record<string, unknown>) {
  const items = readQueue()
  items.push({ id: randomId(), type, at: nowIso(), action })
  writeQueue(items)
}

export function clearQueue() {
  writeQueue([])
}

export function queueSize() {
  return readQueue().length
}
