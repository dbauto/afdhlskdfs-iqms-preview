import * as React from "react"
import { DownloadIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { ORG } from "@/data/org"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { SettingsHeader } from "./layout"

type Area = "Documents" | "Corrective Action" | "Risks" | "Audits" | "Evidence" | "Access" | "Settings" | "Sign-in"

interface Event {
  id: string
  when: string
  day: "Today" | "Yesterday" | "This week" | "Earlier"
  who: string
  what: string
  record?: string
  area: Area
  from: string
}

const E = (id: number, when: string, day: Event["day"], who: string, what: string, area: Area, record?: string, from = "Edge on Windows, Makati"): Event => ({ id: `ev-${id}`, when, day, who, what, record, area, from })

/** Sample history. The backend writes one row for every change and keeps it read-only. */
const EVENTS: Event[] = [
  E(30, "Today, 16:52", "Today", "Aaron Lim", "Changed branding: brand colour and sidebar style", "Settings"),
  E(29, "Today, 16:40", "Today", "Maria Santos", "Approved revision 08", "Documents", "QMS-PRO-011"),
  E(28, "Today, 16:12", "Today", "Joy Aquino", "Added root cause and action", "Corrective Action", "NC-2026-007", "Chrome on Windows, Laguna"),
  E(27, "Today, 15:30", "Today", "Aaron Lim", "Changed Kim Dela Cruz’s role from Viewer to Auditor", "Access"),
  E(26, "Today, 14:05", "Today", "Ana Cruz", "Signed in with Microsoft 365", "Sign-in", undefined, "Safari on iPhone, Makati"),
  E(25, "Today, 11:48", "Today", "Daniel Reyes", "Planned internal audit of Operations for 21 Oct", "Audits", "IA-2026-05"),
  E(24, "Today, 10:20", "Today", "Carlos Mendoza", "Linked evidence to clauses 8.5.1 and 7.1.5", "Evidence", "EV-0214"),
  E(23, "Today, 09:02", "Today", "Unknown", "Failed sign-in, wrong password (3rd try)", "Sign-in", undefined, "Chrome on Android, Cebu"),
  E(22, "Yesterday, 17:44", "Yesterday", "Grace Lim", "Shared with Northwind Foods buyer, view only, 30 days", "Documents", "SAL-REC-011"),
  E(21, "Yesterday, 16:10", "Yesterday", "Maria Santos", "Exported the document register to Excel", "Documents"),
  E(20, "Yesterday, 15:22", "Yesterday", "Paolo Ramos", "Marked action done and asked for verification", "Corrective Action", "NC-2026-005"),
  E(19, "Yesterday, 14:00", "Yesterday", "Joy Aquino", "Raised risk, rated 16 High", "Risks", "R-031"),
  E(18, "Yesterday, 11:31", "Yesterday", "Aaron Lim", "Approved account request from Ben Castillo, role Contributor", "Access"),
  E(17, "Yesterday, 09:15", "Yesterday", "Nina Flores", "Sent for technical review to Daniel Reyes and Ana Cruz", "Documents", "PUR-PRO-002"),
  E(16, "12 Oct, 16:48", "This week", "Maria Santos", "Changed QMS rules: high risk from 15 points", "Settings"),
  E(15, "12 Oct, 13:20", "This week", "Eric Navarro", "Acknowledged the quality policy, revision 04", "Documents", "QMS-POL-001"),
  E(14, "12 Oct, 10:05", "This week", "Ana Cruz", "Raised nonconformity, major", "Corrective Action", "NC-2026-008"),
  E(13, "11 Oct, 17:30", "This week", "Aaron Lim", "Turned on two-step sign-in for everyone", "Settings"),
  E(12, "11 Oct, 15:12", "This week", "Rosa Tan", "Changed classification to Confidential", "Evidence", "EV-0201"),
  E(11, "11 Oct, 09:40", "This week", "Aaron Lim", "Deactivated Lito Ramos (left the company)", "Access"),
  E(10, "10 Oct, 16:00", "This week", "Daniel Reyes", "Issued audit report", "Audits", "IA-2026-04"),
  E(9, "3 Oct, 11:11", "Earlier", "Maria Santos", "Downloaded a copy of her personal data", "Access"),
  E(8, "2 Oct, 14:30", "Earlier", "Paolo Ramos", "Added evidence: compressor service report", "Evidence", "EV-0210"),
  E(7, "30 Sep, 10:22", "Earlier", "Maria Santos", "Archived revision 07 when revision 08 was published", "Documents", "QMS-PRO-011"),
]

const AREAS: Area[] = ["Documents", "Corrective Action", "Risks", "Audits", "Evidence", "Access", "Settings", "Sign-in"]

function toCsv(rows: Event[]) {
  const q = (v = "") => `"${v.replace(/"/g, '""')}"`
  return ["When,Person,What happened,Record,Area,From", ...rows.map((e) => [e.when, e.who, e.what, e.record, e.area, e.from].map(q).join(","))].join("\r\n")
}

export default function Activity() {
  const [q, setQ] = React.useState("")
  const [who, setWho] = React.useState("Everyone")
  const [area, setArea] = React.useState("All areas")
  const [day, setDay] = React.useState("Any time")
  const people = [...new Set(EVENTS.map((e) => e.who))].sort()
  const query = q.trim().toLowerCase()
  const rows = EVENTS.filter(
    (e) =>
      (who === "Everyone" || e.who === who) &&
      (area === "All areas" || e.area === area) &&
      (day === "Any time" || (day === "Today" ? e.day === "Today" : day === "Last 2 days" ? e.day === "Today" || e.day === "Yesterday" : e.day !== "Earlier")) &&
      (!query || [e.what, e.record, e.who].some((v) => v?.toLowerCase().includes(query)))
  )

  function exportCsv() {
    try {
      const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `iqms-activity-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
      toast(`Exported ${rows.length} events`)
    } catch {
      toast("Export didn’t start", { description: "Your browser blocked the download. Try again or use another browser." })
    }
  }

  return (
    <>
      <SettingsHeader
        title="Activity log"
        description={`Who did what in ThryveMS at ${ORG.name}, and when. Entries can’t be changed or deleted. Kept for 5 years for ISO audits and Data Privacy Act requests.`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <DownloadIcon /> Export {rows.length === EVENTS.length ? "all" : rows.length}
          </Button>
        }
      />
      <DataTable
        label="Activity log"
        rows={rows}
        getRowId={(e) => e.id}
        minWidth={720}
        toolbar={
          <>
            <label className="relative min-w-[220px] flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by record number or action" className="pl-9" aria-label="Search activity" />
            </label>
            <NativeSelect value={who} onChange={(e) => setWho(e.target.value)} className="w-44" aria-label="Person">
              <option>Everyone</option>
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </NativeSelect>
            <NativeSelect value={area} onChange={(e) => setArea(e.target.value)} className="w-44" aria-label="Area">
              <option>All areas</option>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </NativeSelect>
            <NativeSelect value={day} onChange={(e) => setDay(e.target.value)} className="w-36" aria-label="When">
              <option>Any time</option>
              <option>Today</option>
              <option>Last 2 days</option>
              <option>This week</option>
            </NativeSelect>
          </>
        }
        empty={{ title: "No activity matches", body: "Try another person, area or time." }}
        columns={[
          { id: "when", header: "When", className: "w-[150px]", cell: (e) => <span className="whitespace-nowrap text-[0.8125rem] text-muted-foreground">{e.when}</span> },
          {
            id: "who",
            header: "Person",
            className: "w-[190px]",
            cell: (e) => (
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Avatar name={e.who === "Unknown" ? "?" : e.who} size={24} />
                <span className={e.who === "Unknown" ? "text-muted-foreground" : undefined}>{e.who}</span>
              </span>
            ),
          },
          {
            id: "what",
            header: "What happened",
            cell: (e) => (
              <span className="flex flex-col gap-0.5">
                <span>
                  {e.record && <span className="font-medium text-primary">{e.record} </span>}
                  {e.what}
                </span>
                <span className="text-xs text-muted-foreground">
                  {e.area}, {e.from}
                </span>
              </span>
            ),
          },
        ]}
      />
    </>
  )
}
