"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ConnectionPill } from "@/components/shell/connection-pill"

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  sticky = true,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  sticky?: boolean
  className?: string
}) {
  return (
    <header
      className={cn(
        "border-b border-border bg-card/95 backdrop-blur print:hidden",
        sticky && "sticky top-0 z-30",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3.5 lg:px-8 lg:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight text-foreground lg:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground lg:text-sm">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <div className="lg:hidden">
              <ConnectionPill variant="compact" />
            </div>
          </div>
        </div>
        {children}
      </div>
    </header>
  )
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-12 lg:pt-6",
        className,
      )}
    >
      {children}
    </main>
  )
}
