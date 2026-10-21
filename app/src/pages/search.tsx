import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { LockIcon, SearchIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { isLocked } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState, PageHeader, ViewChips } from "@/components/app/page"
import { NAV } from "@/components/app/nav"

interface Hit {
  kind: "Page" | "Document" | "Nonconformity" | "Risk" | "Audit" | "Person"
  id: string
  title: string
  meta: string
  to: string
  locked?: boolean
}

const PLURAL = { All: "All", Page: "Pages", Document: "Documents", Nonconformity: "Nonconformities", Risk: "Risks", Audit: "Audits", Person: "People" } as const

export default function Search() {
  const [params] = useSearchParams()
  const q = (params.get("q") ?? "").trim()
  const { state, user, can, canSee } = useStore()
  const [kind, setKind] = React.useState<"All" | Hit["kind"]>("All")

  const hits = React.useMemo<Hit[]>(() => {
    if (!q) return []
    const t = q.toLowerCase()
    const has = (...s: string[]) => s.some((x) => x.toLowerCase().includes(t))
    const out: Hit[] = []
    NAV.flatMap((n) => [n, ...(n.children ?? [])]).forEach((n) => has(n.label) && can(n.area) && out.push({ kind: "Page", id: n.label, title: n.label, meta: "Page", to: n.to }))
    // plan v3 §9: search filters before matching, so records you can't open never appear
    if (can("Documents"))
      state.documents.forEach((d) => {
        if (!canSee(d.classification, d.viewers, d.owner, [...d.reviewers, ...d.approvers])) return
        if (has(d.id, d.title, d.description, d.owner)) out.push({ kind: "Document", id: d.id, title: d.title, meta: `${d.type}, ${d.process}, ${d.stage}`, to: `/documents/${d.id}` })
      })
    if (can("Corrective Action")) state.ncs.forEach((n) => has(n.id, n.title, n.owner, n.process) && out.push({ kind: "Nonconformity", id: n.id, title: n.title, meta: `${n.severity}, ${n.process}, owner ${n.owner}`, to: `/corrective-action/${n.id}` }))
    if (can("Risks & Opportunities")) state.risks.forEach((r) => has(r.id, r.title, r.owner) && out.push({ kind: "Risk", id: r.id, title: r.title, meta: `${r.kind}, ${r.process}`, to: `/risks/${r.id}` }))
    if (can("Audits")) state.audits.forEach((a) => has(a.id, a.process, a.lead) && out.push({ kind: "Audit", id: a.id, title: `${a.process} audit`, meta: `${a.date}, lead ${a.lead}`, to: `/audits/${a.id}` }))
    state.people.slice(0, 20).forEach((p) => has(p.name, p.title) && out.push({ kind: "Person", id: p.id, title: p.name, meta: p.title, to: "/settings/users" }))
    return out
  }, [q, state, user.name, can, canSee])

  const kinds = ["All", "Page", "Document", "Nonconformity", "Risk", "Audit", "Person"] as const
  const shown = kind === "All" ? hits : hits.filter((h) => h.kind === kind)

  return (
    <>
      <PageHeader title={q ? `Results for “${q}”` : "Search"} description={q ? `${hits.length} result${hits.length === 1 ? "" : "s"}.` : "Type in the search box at the top. Press / to jump there."} />
      {q && (
        <ViewChips
          value={kind}
          onChange={setKind}
          views={kinds.map((k) => ({ id: k, label: PLURAL[k], count: k === "All" ? hits.length : hits.filter((h) => h.kind === k).length }))}
        />
      )}
      <Card>
        {shown.length === 0 ? (
          <EmptyState icon={SearchIcon} title={q ? "No results" : "Search everything in the QMS"} body={q ? "Check the spelling, or search by number, for example NC-2026-005." : "Documents, nonconformities, risks, audits and people."} />
        ) : (
          <ul>
            {shown.map((h, i) => (
              <li key={h.kind + h.id} className={cn(i > 0 && "border-t border-rule-soft")}>
                <Link to={h.to} className="flex items-center gap-4 px-5 py-3 hover:bg-hover">
                  <Badge tone="outline" className="w-28 justify-center">
                    {h.kind}
                  </Badge>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {h.locked && <LockIcon className="size-3.5" />}
                      {h.kind !== "Page" && h.kind !== "Person" && <span className="text-primary">{h.id}</span>} {h.title}
                    </span>
                    <span className="truncate text-[0.8125rem] text-muted-foreground">{h.meta}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
