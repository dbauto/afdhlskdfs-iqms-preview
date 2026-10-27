import * as React from "react"
import { toast } from "sonner"

import { useConsole, type Activity } from "@/lib/console-store"
import { usePlatformAccess } from "@/lib/platform-access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { PlatformHeader } from "./shell"

const KINDS: Activity["kind"][] = ["Team", "Deployments", "Approvals", "Organisations", "Finance", "Reports", "Security", "AI", "Support"]

/** Who did what in the console (ADR-042). Kept 7 years in production and can't be edited or deleted. */
export default function ActivityLog() {
  const c = useConsole()
  const { members } = usePlatformAccess()
  const [kind, setKind] = React.useState("")
  const [who, setWho] = React.useState("")
  const [q, setQ] = React.useState("")
  const rows = c.activity.filter((a) => (!kind || a.kind === kind) && (!who || a.who === who) && (!q || `${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase())))
  const people = Array.from(new Set([...members.map((m) => m.name), ...c.activity.map((a) => a.who)]))
  return (
    <>
      <PlatformHeader
        title="Activity log"
        description="Everything done in the console: deployments, approvals, team and role changes, keys, plans, features and filings. It can’t be edited or deleted."
        actions={
          <Button variant="outline" onClick={() => toast("Activity exported", { description: `${rows.length} entries as CSV, with a SHA-256 fingerprint.` })}>
            Export
          </Button>
        }
      />
      <DataTable
        label="Activity log"
        rows={rows}
        getRowId={(a) => a.id}
        minWidth={820}
        empty={{ title: "No activity matches", body: "Try another person, kind or search." }}
        toolbar={
          <>
            <Input aria-label="Search activity" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-auto min-w-48" />
            <NativeSelect aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 w-auto min-w-40 text-[0.8125rem]">
              <option value="">All kinds</option>
              {KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="Person" value={who} onChange={(e) => setWho(e.target.value)} className="h-9 w-auto min-w-40 text-[0.8125rem]">
              <option value="">Everyone</option>
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </NativeSelect>
          </>
        }
        columns={[
          { id: "t", header: "When", cell: (a) => <span className="whitespace-nowrap text-[0.8125rem] text-muted-foreground">{a.at}</span> },
          { id: "w", header: "Who", cell: (a) => <span className="flex flex-col whitespace-nowrap"><span className="font-medium">{a.who}</span><span className="text-xs text-muted-foreground">{a.role}</span></span> },
          { id: "a", header: "What", className: "min-w-[280px]", cell: (a) => <span>{a.action} <span className="font-medium">{a.target}</span></span> },
          { id: "k", header: "Kind", cell: (a) => <Badge tone="draft">{a.kind}</Badge> },
        ]}
      />
    </>
  )
}
