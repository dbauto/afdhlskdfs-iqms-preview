import * as React from "react"
import { useHref } from "react-router-dom"
import { ExternalLinkIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { isSafeUrl, linkSource, recordHref, type RecordKind } from "@/lib/record-links"

/** Can the person viewing open this record? The same checks its own page makes: section access, process scope and classification. */
export function useCanOpen() {
  const { state, can, canSee } = useStore()
  return React.useCallback(
    (kind: RecordKind, id: string): boolean => {
      switch (kind) {
        case "document": {
          const d = state.documents.find((x) => x.id === id)
          return !!d && can("Documents") && canSee(d.classification, d.viewers, d.owner, [...d.reviewers, ...d.approvers])
        }
        case "evidence": {
          const e = state.evidence.find((x) => x.id === id)
          return !!e && can("Evidence") && canSee(e.classification, [], e.addedBy)
        }
        case "objective":
          return can("Objectives & KPIs") && state.objectives.some((x) => x.id === id)
        case "risk":
          return can("Risks & Opportunities") && state.risks.some((x) => x.id === id)
        case "nonconformity":
          return can("Corrective Action") && state.ncs.some((x) => x.id === id)
        case "audit":
          return can("Audits") && state.audits.some((x) => x.id === id)
        case "review":
          return can("Management Review") && state.reviews.some((x) => x.id === id)
        case "review-action":
          return can("Management Review") && state.reviewActions.some((x) => x.id === id)
        case "process":
          return can("Processes") && state.processes.some((x) => x.id === id || x.name === id)
        case "issue":
          return can("Organization & Scope") && state.issues.some((x) => x.id === id)
        case "party":
          return can("Organization & Scope") && state.parties.some((x) => x.id === id)
        default:
          return false
      }
    },
    [state, can, canSee],
  )
}

/**
 * Opens a record's own page in a new tab, so the page you're working on keeps its state.
 * The URL is built with the router, so it works under any base path and with hash routing.
 * A record the person can't open (outside their processes, above their classification, or deleted)
 * is shown as its number only, with no link and no title (plan v3 §9).
 */
export function RecordLink({ kind, id, label, children, className, icon = true }: { kind: RecordKind; id: string; label?: string; children?: React.ReactNode; className?: string; icon?: boolean }) {
  const to = recordHref(kind, id)
  const href = useHref(to)
  const canOpen = useCanOpen()
  const name = label ? `${id} ${label}` : id
  if (!canOpen(kind, id))
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", className)} title="You don’t have access to this record">
        {id}, not available to you
      </span>
    )
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label={`Open ${name} in a new tab`} className={cn("inline-flex items-center gap-1 font-medium text-primary hover:underline", className)}>
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
    <a href={url.trim()} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label={`Open ${label ?? "the document"} in ${where}, in a new tab`} className={cn("inline-flex items-center gap-1 font-medium text-primary hover:underline", className)}>
      {children ?? label ?? `Open in ${where}`}
      <ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" />
    </a>
  )
}
