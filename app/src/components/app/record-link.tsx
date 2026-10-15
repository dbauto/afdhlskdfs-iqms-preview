import * as React from "react"
import { Link, useHref } from "react-router-dom"
import { ExternalLinkIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { isSafeUrl, linkSource, recordHref, type RecordKind } from "@/lib/record-links"

/**
 * Opens a record's own page in a new tab, so the page you're working on keeps its state.
 * The URL is built with the router, so it works under any base path and with hash routing.
 * Whether the person may see the record is checked on the record's page: a record they can't
 * see, or that doesn't exist, shows Not found there.
 */
export function RecordLink({ kind, id, label, children, className, icon = true, newTab = true }: { kind: RecordKind; id: string; label?: string; children?: React.ReactNode; className?: string; icon?: boolean; newTab?: boolean }) {
  const to = recordHref(kind, id)
  const href = useHref(to)
  const name = label ? `${id} ${label}` : id
  // on an ordinary record page, moving to a related record in the same tab is expected
  if (!newTab)
    return (
      <Link to={to} className={cn("font-medium text-primary hover:underline", className)}>
        {children ?? id}
      </Link>
    )
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name} in a new tab`} className={cn("inline-flex items-center gap-1 font-medium text-primary hover:underline", className)}>
      {children ?? id}
      {icon && <ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" />}
    </a>
  )
}

/**
 * A link to a document outside ThryveMS, such as SharePoint or OneDrive. Only https:// links
 * become links; anything else is shown as text with "Link not valid".
 */
export function OutsideLink({ url, label, children, className }: { url?: string; label?: string; children?: React.ReactNode; className?: string }) {
  if (!isSafeUrl(url)) {
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
        <span className="break-all text-muted-foreground">{children ?? label ?? url ?? "No link"}</span>
        <span className="text-xs font-medium text-overdue">Link not valid</span>
      </span>
    )
  }
  const where = linkSource(url)
  return (
    <a href={url.trim()} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label ?? "the document"} in ${where}, in a new tab`} className={cn("inline-flex items-center gap-1 font-medium text-primary hover:underline", className)}>
      {children ?? label ?? `Open in ${where}`}
      <ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" />
    </a>
  )
}
