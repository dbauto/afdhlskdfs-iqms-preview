import * as React from "react"
import { cn } from "@/lib/utils"

/** Product identity, deliberately separate from a customer's white-label logo. */
export function ProductMark({ className, showName = true, sidebar = false }: { className?: string; showName?: boolean; sidebar?: boolean }) {
  const id = React.useId().replace(/:/g, "")
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 160 128" role="img" aria-label="ThryveMS" className="size-8 shrink-0 rounded-sm bg-white p-0.5">
        <defs>
          <linearGradient id={id + "-forest"} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#07634d" /><stop offset="1" stopColor="#003c30" />
          </linearGradient>
          <linearGradient id={id + "-teal"} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#16bea9" /><stop offset="1" stopColor="#008a7e" />
          </linearGradient>
        </defs>
        <path fill={"url(#" + id + "-teal)"} d="M4 82c0 23 27 41 47 21l19-19-17-17-20 20c-8 8-16 5-29-5Zm70-40 20-20c21-22 57-9 57 22v45c0 16-11 27-25 32V44c0-12-12-14-20-7L92 53Z" />
        <path fill={"url(#" + id + "-forest)"} d="M4 81V43C4 14 34 4 52 22l71 71c10 10 19 5 28-4v8c0 24-28 35-46 17L35 42C22 29 27 57 27 77c-6 8-14 10-23 4Z" />
      </svg>
      {showName && <span className={cn("font-semibold tracking-tight", sidebar ? "text-sidebar-foreground" : "text-foreground")}>Thryve<span className={sidebar ? "text-sidebar-muted" : "text-primary"}>MS</span></span>}
    </span>
  )
}
