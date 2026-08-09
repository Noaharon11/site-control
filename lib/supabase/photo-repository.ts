/**
 * Central photo service: Supabase Storage operations + IndexedDB offline blob queue.
 * DB record operations are in repository.ts (which knows project UUIDs).
 */

import { getSupabaseClient } from "./client"

const BUCKET = "site-photos"
export const MAX_PHOTO_SIZE = 20 * 1024 * 1024 // 20 MB
const SIGNED_URL_EXPIRY = 7200 // 2 hours
const IDB_NAME = "sitecontrol-photos-v1"
const IDB_STORE = "pending-blobs"

/* ------------------------------------------------------ validation ---- */

export function validatePhotoFile(file: File): string | null {
  if (file.size > MAX_PHOTO_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `הקובץ גדול מדי (${mb}MB). הגודל המרבי הוא 20MB`
  }
  const name = file.name.toLowerCase()
  if (name.endsWith(".heic") || name.endsWith(".heif")) {
    return "פורמט HEIC/HEIF אינו נתמך ישירות בדפדפן זה. אנא שמור את התמונה כ-JPG או PNG תחילה, או השתמש בתפריט השיתוף של המכשיר"
  }
  if (!file.type.startsWith("image/") && !name.match(/\.(jpg|jpeg|png|webp|gif|bmp|tiff?)$/)) {
    return "יש לבחור קובץ תמונה בלבד (JPG, PNG, WEBP)"
  }
  return null
}

/* ---------------------------------------------------- storage path ---- */

export function buildStoragePath(projectExternalId: string, photoId: string, file: File): string {
  const rawExt = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg"
  const ext = ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(rawExt) ? rawExt : "jpg"
  // flat structure: {projectId}/{photoId}.{ext}
  return `${projectExternalId}/${photoId}.${ext}`
}

/* ---------------------------------------------------- storage ops ---- */

export async function uploadPhotoToStorage(file: File, storagePath: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
    cacheControl: "31536000",
  })
  if (error) throw new Error(`שגיאה בהעלאת הקובץ: ${error.message}`)
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const supabase = getSupabaseClient()
  if (!supabase || !storagePath) return ""

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)
  if (error || !data?.signedUrl) return ""
  return data.signedUrl
}

export async function batchGetSignedUrls(storagePaths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (storagePaths.length === 0) return result

  const supabase = getSupabaseClient()
  if (!supabase) return result

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_EXPIRY)
  if (error || !data) return result

  data.forEach((item) => {
    if (item.signedUrl && item.path) result.set(item.path, item.signedUrl)
  })
  return result
}

export async function deletePhotoFromStorage(storagePath: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase || !storagePath) return

  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) throw new Error(`שגיאה במחיקת הקובץ מהאחסון: ${error.message}`)
}

/* ------------------------------------------- IndexedDB blob queue ---- */

type BlobEntry = { file: File }

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function savePendingBlob(photoId: string, file: File): Promise<void> {
  if (typeof indexedDB === "undefined") return
  try {
    const db = await openIDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      const req = tx.objectStore(IDB_STORE).put({ file } as BlobEntry, photoId)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.error("[photo-repository] Failed to save pending blob:", err)
  }
}

export async function loadPendingBlobs(): Promise<Array<{ photoId: string; file: File }>> {
  if (typeof indexedDB === "undefined") return []
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly")
      const store = tx.objectStore(IDB_STORE)
      const keysReq = store.getAllKeys()
      keysReq.onsuccess = () => {
        const keys = keysReq.result as string[]
        if (keys.length === 0) {
          resolve([])
          return
        }
        const results: Array<{ photoId: string; file: File }> = []
        let remaining = keys.length
        keys.forEach((key) => {
          const getReq = store.get(key)
          getReq.onsuccess = () => {
            const entry = getReq.result as BlobEntry | undefined
            if (entry?.file) results.push({ photoId: String(key), file: entry.file })
            if (--remaining === 0) resolve(results)
          }
          getReq.onerror = () => {
            if (--remaining === 0) resolve(results)
          }
        })
      }
      keysReq.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function deletePendingBlob(photoId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return
  try {
    const db = await openIDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      tx.objectStore(IDB_STORE).delete(photoId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // ignore — blob will be retried next sync
  }
}
