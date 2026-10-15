import * as React from "react"
import { cn } from "@/lib/utils"

/** Product identity, deliberately separate from customer white-label branding. */
export function ProductMark({ className, showName = true }: { className?: string; showName?: boolean }) {
  return <span className={cn("inline-flex items-center gap-2.5", className)}>
    <img src="/thryvems-mark.svg" alt={showName ? "" : "ThryveMS"} className="size-8 shrink-0 object-contain" />
    {showName && <span className="font-semibold tracking-tight text-foreground">Thryve<span className="text-teal-600">MS</span></span>}
  </span>
}
