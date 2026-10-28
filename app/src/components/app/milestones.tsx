import * as React from "react"
import { StarIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { headline, milestones, type Milestone, type MilestoneStage } from "@/lib/milestones"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ContentLink as Link } from "@/components/app/content-link"

/** The milestone card's own colours: the done green, with a lighter end, and a dot texture (approved by Danica, ADR-044). */
const GREEN = { background: "linear-gradient(135deg, var(--color-done), color-mix(in oklab, var(--color-done) 62%, #5fd6a4))" }
const DOTS = { backgroundImage: "radial-gradient(rgb(255 255 255 / 0.16) 1px, transparent 1px)", backgroundSize: "12px 12px" }

/** Milestones this person has already been shown as reached, per browser (the server keeps them per person in production). */
function useSeen(userId: string, reached: string[]) {
  const key = `iqms.milestonesSeen.${userId}`
  const [seen, setSeen] = React.useState<string[] | null>(() => {
    try {
      const s = localStorage.getItem(key)
      return s ? (JSON.parse(s) as string[]) : null
    } catch {
      return null
    }
  })
  // the first visit counts everything already reached as seen, so nobody gets a pile of old news
  const list = seen ?? reached
  const mark = (ids: string[]) => {
    const next = [...new Set([...list, ...ids])]
    setSeen(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* preview only */
    }
  }
  React.useEffect(() => {
    if (seen === null) mark(reached)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return { seen: list, mark }
}

/** The strip at the foot of Certification readiness: count, the latest reached, and what is next. */
export function MilestoneStrip() {
  const { state, settings, user } = useStore()
  const list = milestones(state, settings)
  const reachedIds = list.filter((x) => x.state === "Reached").map((x) => x.id)
  const { seen, mark } = useSeen(user.id, reachedIds)
  const h = headline(list, seen)
  const latest = h.fresh ?? [...list].reverse().find((x) => x.state === "Reached")
  React.useEffect(() => {
    if (!h.fresh) return
    toast(`Milestone reached: ${h.fresh.title}`, { description: `${h.reached} of ${h.total} milestones on the way to certification.` })
    mark([h.fresh.id])
  }, [h.fresh?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section aria-label="Milestones" className="relative overflow-hidden rounded-lg px-5 py-4 text-white" style={GREEN}>
      <span className="pointer-events-none absolute inset-0" style={DOTS} aria-hidden="true" />
      <span className="absolute right-4 top-0 flex h-11 w-8 justify-center bg-[rgb(10_42_34/0.5)] pt-2 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" aria-hidden="true">
        <StarIcon className="size-4 fill-current text-[#7ef0b4]" />
      </span>
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 pr-10">
        <div className="flex min-w-36 flex-col">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider opacity-90">Milestones</span>
          <span className="text-[1.625rem] font-bold leading-tight tabular-nums">{h.reached} of {h.total}</span>
          <span className="mt-1.5 block h-1.5 rounded-full bg-white/30" role="progressbar" aria-label="Milestones reached" aria-valuenow={h.reached} aria-valuemin={0} aria-valuemax={h.total}>
            <span className="block h-1.5 rounded-full bg-white" style={{ width: `${(h.reached / h.total) * 100}%` }} />
          </span>
        </div>
        <span className="hidden w-px self-stretch bg-white/30 sm:block" aria-hidden="true" />
        <div className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1 text-[0.8125rem] leading-snug">
          {latest && <span><span className="font-semibold">{h.fresh ? "Reached today:" : "Latest reached:"}</span> {latest.title}</span>}
          {h.next && <span className="opacity-95"><span className="font-semibold">Next:</span> {h.next.title.charAt(0).toLowerCase() + h.next.title.slice(1)} · {h.next.note}</span>}
        </div>
        <Link to="/readiness?tab=milestones" className="flex h-8 items-center rounded-full bg-white/25 px-3.5 text-[0.8125rem] font-semibold hover:bg-white/35">See all</Link>
      </div>
    </section>
  )
}

const STAGES: MilestoneStage[] = ["Getting set up", "Building the system", "Running it", "Certification"]
const TONE = { Reached: "done", "In progress": "progress", "Not started": "draft" } as const

function Row({ x, first }: { x: Milestone; first: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 py-3", !first && "border-t border-rule-soft")}>
      {x.state === "Reached" ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-done text-xs font-bold text-white" aria-hidden="true">✓</span>
      ) : x.state === "In progress" ? (
        <span className="size-6 shrink-0 rounded-full border-[3px] border-primary bg-card" aria-hidden="true" />
      ) : (
        <span className="size-6 shrink-0 rounded-full border border-dashed border-faint" aria-hidden="true" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Link to={x.to} className={cn("text-sm hover:text-primary hover:underline", x.state === "Not started" ? "text-muted-foreground" : "font-medium")}>{x.title}</Link>
        {x.state === "In progress" && x.of > 1 && (
          <span className="block h-1.5 w-44 max-w-full rounded-full bg-secondary" aria-hidden="true">
            <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${(x.done / x.of) * 100}%` }} />
          </span>
        )}
      </span>
      <span className="hidden w-40 text-right text-[0.8125rem] text-muted-foreground sm:block">{x.note}</span>
      <Badge tone={TONE[x.state]}>{x.state}</Badge>
    </li>
  )
}

/** Certification readiness › Milestones: every milestone by stage. */
export function MilestoneList() {
  const { state, settings } = useStore()
  const list = milestones(state, settings)
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {STAGES.map((s) => {
        const items = list.filter((x) => x.stage === s)
        return (
          <Card key={s} className="min-w-0">
            <CardHeader>
              <CardTitle>{s}</CardTitle>
              <span className="text-[0.8125rem] text-muted-foreground">{items.filter((x) => x.state === "Reached").length} of {items.length}</span>
            </CardHeader>
            <ul className="px-5 pb-2">
              {items.map((x, i) => <Row key={x.id} x={x} first={i === 0} />)}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
