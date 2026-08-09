"use client"

import * as React from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import type { Photo } from "@/lib/types"
import { deletePhotoFromStorage } from "@/lib/supabase/photo-repository"
import { softDeletePhotoRecord } from "@/lib/supabase/repository"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PhotoDeleteDialogProps {
  photo: Photo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function PhotoDeleteDialog({
  photo,
  open,
  onOpenChange,
  onDeleted,
}: PhotoDeleteDialogProps) {
  const { dispatch } = useStore()
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset error when dialog opens/closes
  React.useEffect(() => {
    if (!open) setError(null)
  }, [open])

  async function handleDelete() {
    if (!photo || deleting) return
    setDeleting(true)
    setError(null)

    try {
      // 1. Archive the DB record (soft delete preserves history integrity)
      await softDeletePhotoRecord(photo.id)

      // 2. Remove the file from Storage if we have a storage path
      if (photo.storagePath) {
        await deletePhotoFromStorage(photo.storagePath)
      }

      // 3. Update local state
      dispatch({ type: "deletePhoto", id: photo.id })
      onOpenChange(false)
      toast.success("התמונה נמחקה בהצלחה")
      onDeleted?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה"
      setError(`לא ניתן למחוק את התמונה. ${msg}`)
      if (process.env.NODE_ENV !== "production") {
        console.error("[PhotoDeleteDialog]", err)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-crit">
            <Trash2 className="size-4" />
            מחיקת תמונה
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-1">
          <p className="text-sm text-foreground">האם אתה בטוח שברצונך למחוק את התמונה?</p>
          {photo?.caption && (
            <p className="text-[13px] italic text-muted-foreground">"{photo.caption}"</p>
          )}
          <p className="text-[13px] font-semibold text-crit">לא ניתן לבטל פעולה זו.</p>
          {error && (
            <p className="rounded-lg bg-crit/10 px-3 py-2 text-[13px] text-crit">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                מוחק...
              </>
            ) : (
              <>
                <Trash2 data-icon="inline-start" />
                מחק תמונה
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
