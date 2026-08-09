"use client"

import * as React from "react"
import { Camera, ImagePlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { today } from "@/lib/dates"
import { nowTime } from "@/lib/dates"
import type { Photo } from "@/lib/types"
import {
  buildStoragePath,
  getSignedUrl,
  savePendingBlob,
  uploadPhotoToStorage,
  validatePhotoFile,
} from "@/lib/supabase/photo-repository"
import { savePhotoRecord } from "@/lib/supabase/repository"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PhotoUploadProps {
  areaId: string
  tourId?: string | null
  taskId?: string | null
  defectId?: string | null
  /** Wrapper className — useful to insert the uploader inline vs inside a panel */
  className?: string
  onSuccess?: (photo: Photo) => void
  onCancel?: () => void
}

export function PhotoUpload({
  areaId,
  tourId,
  taskId,
  defectId,
  className,
  onSuccess,
  onCancel,
}: PhotoUploadProps) {
  const { state, dispatch, uid, supabaseReady } = useStore()

  const galleryInputRef = React.useRef<HTMLInputElement>(null)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [caption, setCaption] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [photoId] = React.useState(() => uid("ph"))

  // Revoke the object URL when component unmounts or a new file is chosen
  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ""

    const validationError = validatePhotoFile(f)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setFile(f)
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file || uploading) return
    setUploading(true)
    setError(null)

    const online = typeof navigator === "undefined" || navigator.onLine

    if (!supabaseReady || !online || state.offline) {
      // Offline path: persist blob to IndexedDB, mark photo as pending
      try {
        await savePendingBlob(photoId, file)
      } catch {
        // Non-fatal — blob will be missing after reload, but metadata is queued
      }
      const photo: Photo = {
        id: photoId,
        areaId,
        date: today(),
        time: nowTime(),
        caption: caption.trim() || file.name,
        url: previewUrl ?? "",
        storagePath: null,
        tourId: tourId ?? null,
        taskId: taskId ?? null,
        defectId: defectId ?? null,
        pending: true,
      }
      dispatch({ type: "addPhoto", photo })
      toast("התמונה תועלה אוטומטית כשהחיבור יחזור")
      setUploading(false)
      onSuccess?.(photo)
      return
    }

    // Online path: upload file, write DB record, update state
    try {
      const storagePath = buildStoragePath(state.project.id, photoId, file)
      await uploadPhotoToStorage(file, storagePath)
      const signedUrl = await getSignedUrl(storagePath)

      const photo: Photo = {
        id: photoId,
        areaId,
        date: today(),
        time: nowTime(),
        caption: caption.trim() || file.name,
        url: signedUrl || previewUrl || "",
        storagePath,
        tourId: tourId ?? null,
        taskId: taskId ?? null,
        defectId: defectId ?? null,
        pending: false,
      }

      // Persist DB record immediately (before state update) for reliability
      await savePhotoRecord(photo)

      dispatch({ type: "addPhoto", photo })
      toast.success("התמונה נשמרה בהצלחה")
      onSuccess?.(photo)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה"
      setError(`לא ניתן להעלות את התמונה. ${msg}`)
      if (process.env.NODE_ENV !== "production") {
        console.error("[PhotoUpload]", err)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Hidden file inputs — separate ones for gallery vs camera capture */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden
      />

      {!file ? (
        /* ---- pick-file / camera buttons ---- */
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11 flex-1"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus data-icon="inline-start" />
            בחר תמונה
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera data-icon="inline-start" />
            צלם תמונה
          </Button>
        </div>
      ) : (
        /* ---- preview + caption + submit ---- */
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl!}
            alt="תצוגה מקדימה של התמונה"
            className="aspect-video w-full rounded-lg border border-border object-cover"
          />
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="כיתוב לתמונה (אופציונאלי)"
            className="h-11 text-[15px]"
            disabled={uploading}
          />
          {error && (
            <p className="rounded-lg bg-crit/10 px-3 py-2 text-[13px] font-medium text-crit">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              className="h-11 flex-1"
              onClick={() => void handleUpload()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  מעלה תמונה...
                </>
              ) : (
                "העלה תמונה"
              )}
            </Button>
            <Button variant="ghost" className="h-11" onClick={onCancel} disabled={uploading}>
              ביטול
            </Button>
          </div>
        </>
      )}

      {error && !file && (
        <p className="rounded-lg bg-crit/10 px-3 py-2 text-[13px] font-medium text-crit">
          {error}
        </p>
      )}
    </div>
  )
}
