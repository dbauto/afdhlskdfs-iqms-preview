import * as React from "react"
import { BanknoteIcon, ReceiptIcon, TrendingUpIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { COSTS, COST_TOTAL, INVOICED, INVOICES, MONTHLY_PROFIT, MONTHS, UNPAID, peso, vatOf, withVat, type Invoice } from "@/data/platform"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, ViewChips } from "@/components/app/page"
import { PlatformHeader } from "./shell"

const STATE_TONE: Record<Invoice["state"], BadgeTone> = { Paid: "done", Unpaid: "soon", Overdue: "overdue" }

function ProfitChart() {
  const max = Math.max(...MONTHS.map((m) => m.revenue))
  return (
    <Card className="min-w-0">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Revenue, costs and profit</CardTitle>
          <span className="text-xs text-muted-foreground">Before VAT, ₱ thousands</span>
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />Revenue</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-info-border" />Costs</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-done" />Profit</span>
        </span>
      </CardHeader>
      <div className="flex flex-col gap-2 px-5 pb-4 pt-2">
        <div className="flex h-52 items-end gap-3 border-b px-1" role="img" aria-label={MONTHS.map((m, i) => `${m.label}: revenue ₱${m.revenue}K, costs ₱${m.costs}K, profit ₱${MONTHLY_PROFIT[i].profit}K`).join("; ")}>
          {MONTHS.map((m, i) => (
            <div key={m.label} className="flex h-full flex-1 items-end justify-center gap-1">
              <div className="w-1/4 max-w-5 rounded-t-[3px] bg-primary" style={{ height: `${(m.revenue / max) * 100}%` }} />
              <div className="w-1/4 max-w-5 rounded-t-[3px] bg-info-border" style={{ height: `${(m.costs / max) * 100}%` }} />
              <div className="w-1/4 max-w-5 rounded-t-[3px] bg-done" style={{ height: `${(MONTHLY_PROFIT[i].profit / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-1 text-xs text-muted-foreground">
          {MONTHS.map((m, i) => (
            <span key={m.label} className="flex flex-1 flex-col items-center">
              <span>{m.label}</span>
              <span className="font-medium text-foreground">{Math.round((MONTHLY_PROFIT[i].profit / m.revenue) * 100)}%</span>
            </span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Percent under each month is the profit margin.</span>
      </div>
    </Card>
  )
}

function Costs() {
  const total = COSTS.reduce((s, c) => s + c.amount, 0)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Costs this month</CardTitle>
          <span className="text-xs text-muted-foreground">From provider invoices; US$ converted at the BSP reference rate</span>
        </span>
        <span className="text-sm font-semibold">{peso(total)}</span>
      </CardHeader>
      <ul>
        {COSTS.map((c, i) => (
          <li key={c.item} className={cn("flex flex-col gap-1.5 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-sm font-medium">{c.item}</span>
                <span className="text-xs text-muted-foreground">
                  {c.who} · {c.note}
                </span>
              </span>
              <span className="whitespace-nowrap text-sm font-semibold">{c.amount ? peso(c.amount) : "₱0"}</span>
            </span>
            <span className="h-1.5 rounded-full bg-secondary" aria-hidden="true">
              <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${(c.amount / total) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Finance() {
  const [view, setView] = React.useState<"all" | "unpaid" | "paid">("all")
  const revenue = INVOICED
  const costs = COST_TOTAL
  const unpaid = UNPAID
  const overdue = INVOICES.filter((i) => i.state === "Overdue")
  const rows = INVOICES.filter((i) => (view === "all" ? true : view === "paid" ? i.state === "Paid" : i.state !== "Paid"))
  return (
    <>
      <PlatformHeader
        title="Finance"
        description="October 2026: what was invoiced, what was paid, what ThryveMS costs to run, and the VAT to report. Sample figures in the preview; production reads the billing system and provider invoices."
        actions={
          <Button variant="outline" onClick={() => toast("Finance report created for October 2026", { description: "Invoices, payments, costs, profit and VAT, for your accountant." })}>
            Create report for accountant
          </Button>
        }
      />
      <FigureGrid
        figures={[
          { value: peso(revenue), label: "Invoiced this month, before VAT", badge: "+8.7%", tone: "done", icon: ReceiptIcon },
          { value: peso(revenue - costs), label: `Profit, ${Math.round(((revenue - costs) / revenue) * 100)}% margin`, badge: "This month", tone: "done", icon: TrendingUpIcon },
          { value: peso(unpaid.reduce((s, i) => s + withVat(i.amount), 0)), label: `Not yet paid, ${unpaid.length} invoices incl. VAT`, badge: `${overdue.length} overdue`, tone: overdue.length ? "overdue" : "draft", icon: WalletIcon },
          { value: peso(vatOf(revenue)), label: "Output VAT 12% to report", badge: "Due 25 Nov", tone: "soon", icon: BanknoteIcon },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ProfitChart />
        <Costs />
      </div>
      <ViewChips
        value={view}
        onChange={(v) => setView(v as typeof view)}
        views={[
          { id: "all", label: "All invoices", count: INVOICES.length },
          { id: "unpaid", label: "Not paid", count: unpaid.length, warn: true },
          { id: "paid", label: "Paid", count: INVOICES.length - unpaid.length },
        ]}
      />
      <DataTable
        label="Invoices"
        rows={rows}
        getRowId={(i) => i.id}
        minWidth={880}
        empty={{ title: "No invoices here", body: "Invoices are created on the 1st of each month for every paying organisation." }}
        columns={[
          { id: "n", header: "Invoice", cell: (i) => <span className="flex flex-col"><span className="font-mono text-[0.8125rem]">{i.id}</span><span className="text-xs text-muted-foreground">Issued {i.issued}</span></span> },
          { id: "o", header: "Organisation", cell: (i) => <span className="font-medium">{i.org}</span> },
          { id: "a", header: "Amount", cell: (i) => <span className="whitespace-nowrap">{peso(i.amount)}</span> },
          { id: "v", header: "VAT 12%", cell: (i) => <span className="whitespace-nowrap text-muted-foreground">{peso(vatOf(i.amount))}</span> },
          { id: "t", header: "Total", cell: (i) => <span className="whitespace-nowrap font-medium">{peso(withVat(i.amount))}</span> },
          { id: "d", header: "Due", cell: (i) => <span className={cn("whitespace-nowrap", i.state === "Overdue" && "font-semibold text-overdue")}>{i.due}{i.daysLate ? `, ${i.daysLate} days late` : ""}</span> },
          { id: "s", header: "State", cell: (i) => <Badge tone={STATE_TONE[i.state]}>{i.state}</Badge> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            cell: (i) =>
              i.state === "Paid" ? null : (
                <Button variant="ghost" size="sm" onClick={() => toast(`Reminder sent for ${i.id}`, { description: `To ${i.org}’s billing contact.` })}>
                  Send reminder
                </Button>
              ),
          },
        ]}
      />
    </>
  )
}
