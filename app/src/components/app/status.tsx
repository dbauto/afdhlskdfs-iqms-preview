import { LockIcon } from "lucide-react"

import { RULES } from "@/lib/rules"
import { cn } from "@/lib/utils"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { DOC_STAGES, NC_STAGES, isLocked, type Classification, type DocRecord, type Nonconformity, type Risk } from "@/data/types"
import { MiniTrack } from "./page"

/* Documents */

export function docTone(d: DocRecord): BadgeTone {
  if (d.lateBy) return "overdue"
  switch (d.stage) {
    case "Published":
      return "done"
    case "Draft":
    case "Archived":
      return "draft"
    case "Changes requested":
      return "soon"
    default:
      return "progress"
  }
}

export function docStep(d: DocRecord) {
  if (d.stage === "Changes requested") return 1
  if (d.stage === "Archived") return 5
  return DOC_STAGES.indexOf(d.stage)
}

export function DocStage({ doc }: { doc: DocRecord }) {
  const tone = docTone(doc)
  const color = { done: "text-done", progress: "text-primary", soon: "text-soon", overdue: "text-overdue", draft: "text-muted-foreground", solid: "", outline: "" }[tone]
  return (
    <span className="flex flex-col gap-1.5">
      <MiniTrack total={5} done={docStep(doc) + 1} tone={tone === "progress" ? "progress" : tone === "solid" || tone === "outline" ? "draft" : tone} />
      <span className={cn("text-[0.8125rem] font-medium", color)}>
        {doc.stage}
        {doc.lateBy ? `, ${doc.lateBy}` : ""}
      </span>
    </span>
  )
}

export function ClassificationTag({ value, className }: { value: Classification; className?: string }) {
  const locked = isLocked(value)
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem]", locked ? "font-medium text-foreground" : "text-muted-foreground", className)}>
      {locked && <LockIcon className="size-3.5" aria-hidden="true" />}
      {value}
    </span>
  )
}

/* Nonconformities */

export function ncTone(n: Nonconformity): BadgeTone {
  if (n.late) return "overdue"
  if (n.stage === 6) return "done"
  return "progress"
}

export function NcStage({ nc }: { nc: Nonconformity }) {
  const tone = ncTone(nc)
  return (
    <span className="flex flex-col gap-1.5">
      <MiniTrack total={7} done={nc.stage + 1} tone={tone === "overdue" ? "overdue" : tone === "done" ? "done" : "progress"} />
      <span className={cn("text-[0.8125rem] font-medium", tone === "overdue" ? "text-overdue" : tone === "done" ? "text-done" : "text-primary")}>
        {NC_STAGES[nc.stage]}
        {nc.late ? ", late" : ""}
      </span>
    </span>
  )
}

export function SeverityBadge({ value }: { value: "Minor" | "Major" }) {
  return <Badge tone={value === "Major" ? "overdue" : "soon"}>{value}</Badge>
}

/* Risks */

export function riskLevel(r: Pick<Risk, "likelihood" | "impact" | "kind">) {
  const s = r.likelihood * r.impact
  if (r.kind === "Opportunity") return { score: s, label: s >= RULES.riskHigh ? "High value" : s >= RULES.riskMedium ? "Worth pursuing" : "Low value", tone: "progress" as BadgeTone }
  if (s >= RULES.riskHigh) return { score: s, label: "High", tone: "overdue" as BadgeTone }
  if (s >= RULES.riskMedium) return { score: s, label: "Medium", tone: "soon" as BadgeTone }
  return { score: s, label: "Low", tone: "draft" as BadgeTone }
}

export function RiskLevel({ risk }: { risk: Risk }) {
  const l = riskLevel(risk)
  return (
    <span className="flex items-center gap-2">
      <span className="w-6 text-right text-sm font-semibold">{l.score}</span>
      <Badge tone={l.tone}>{l.label}</Badge>
    </span>
  )
}

/* Generic state words used across lists */
export const STATE_TONE: Record<string, BadgeTone> = {
  Ready: "done",
  Done: "done",
  Current: "done",
  "Evidence current": "done",
  Conforms: "done",
  Active: "done",
  Healthy: "done",
  OK: "done",
  "In progress": "progress",
  Planned: "progress",
  "Checklist ready": "progress",
  Pending: "progress",
  "Report issued": "done",
  Partial: "soon",
  "Older than 12 months": "soon",
  "Review due": "soon",
  Observation: "soon",
  "Follow-up": "soon",
  Guest: "soon",
  Retrying: "soon",
  Missing: "overdue",
  Overdue: "overdue",
  "No evidence": "overdue",
  "Report late": "overdue",
  "Minor nonconformity": "overdue",
  "Major nonconformity": "overdue",
  Expired: "overdue",
  Failing: "overdue",
  Draft: "draft",
  Paid: "done",
  "Due 30 Nov": "progress",
  Deactivated: "draft",
  Ended: "draft",
}

export function StateBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge tone={STATE_TONE[value] ?? "draft"} className={className}>
      {value}
    </Badge>
  )
}
