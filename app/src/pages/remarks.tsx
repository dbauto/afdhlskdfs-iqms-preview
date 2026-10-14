import * as React from "react"
import { MessageSquareTextIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import type { Area } from "@/data/types"
import { Card } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import { PageHeader, ViewChips } from "@/components/app/page"
import { RemarkRow } from "@/components/app/remarks"

/** Every consultant remark in one place, so the client can work through them. */
export default function Remarks() {
  const { state, can, role } = useStore()
  const [view, setView] = React.useState<"open" | "resolved">("open")
  const [area, setArea] = React.useState("")
  const visible = state.remarks.filter((r) => can(r.area))
  const list = visible.filter((r) => (view === "open" ? r.status === "Open" : r.status === "Resolved") && (!area || r.area === area))
  const areas = [...new Set(visible.map((r) => r.area))] as Area[]
  const grouped = areas.map((a) => ({ area: a, items: list.filter((r) => r.area === a) })).filter((g) => g.items.length)
  const consultant = state.people.find((p) => p.roleId === "consultant")

  return (
    <>
      <PageHeader
        title="Consultant remarks"
        description={
          role.id === "consultant"
            ? "Everything you’ve raised for this client. Add a remark from any process, document, risk, audit, evidence item or corrective action."
            : `What ${consultant?.name ?? "your consultant"} wants looked at before certification. Open the record, make the change, then reply so they can resolve it.`
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <ViewChips
          value={view}
          onChange={(v) => setView(v as "open" | "resolved")}
          views={[
            { id: "open", label: "Open", count: visible.filter((r) => r.status === "Open").length, warn: true },
            { id: "resolved", label: "Resolved", count: visible.filter((r) => r.status === "Resolved").length },
          ]}
        />
        <NativeSelect aria-label="Area" value={area} onChange={(e) => setArea(e.target.value)} className="ml-auto h-9 w-auto min-w-44 text-[0.8125rem]">
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </NativeSelect>
      </div>
      {grouped.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <MessageSquareTextIcon className="size-6 text-muted-foreground" />
          <p className="text-[0.9375rem] font-semibold">{view === "open" ? "No open remarks" : "Nothing resolved yet"}</p>
          <p className="text-sm text-muted-foreground">{view === "open" ? "When the consultant leaves a remark on a record, it shows here." : "Resolved remarks are kept here for the record."}</p>
        </Card>
      ) : (
        grouped.map((g) => (
          <Card key={g.area}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <span className="text-[0.9375rem] font-semibold">{g.area}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{g.items.length}</span>
            </div>
            {g.items.map((r, i) => (
              <RemarkRow key={r.id} r={r} first={i === 0} />
            ))}
          </Card>
        ))
      )}
    </>
  )
}
