"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-media-query"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * Bottom sheet on the phone (field use, thumb reach),
 * end-side panel on the desktop (management use).
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  wide = false,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  wide?: boolean
}) {
  const isMobile = useIsMobile()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "left"}
        className={cn(
          "gap-0",
          isMobile
            ? "max-h-[92dvh] rounded-t-2xl"
            : cn("w-full border-e border-s-0", wide ? "sm:max-w-2xl" : "sm:max-w-md"),
          className,
        )}
      >
        {isMobile && (
          <div className="flex justify-center pt-2.5" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-border" />
          </div>
        )}
        <SheetHeader className="border-b border-border pe-12">
          <SheetTitle className="text-pretty text-base font-bold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs">{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
