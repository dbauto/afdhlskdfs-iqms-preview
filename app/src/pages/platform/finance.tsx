import * as React from "react"
import { BanknoteIcon, ReceiptIcon, TrendingUpIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ALLOCATED_COST, COSTS, COST_TOTAL, INVOICED, INVOICES, MONTHLY_PROFIT, MONTHS, PARTNERS, PARTNER_OF, UNPAID, orgCosts, peso, vatOf, withVat, type Invoice, type PartnerId } from "@/data/platform"
import { TENANTS } from "@/data/admin"
import { NativeSelect } from "@/components/ui/input"
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

const paying = TENANTS.filter((t) => t.plan !== "Trial")
const revenueOf = (id: string) => INVOICES.find((i) => i.org === TENANTS.find((t) => t.id === id)?.name)?.amount ?? 0

/** Profit per organisation from actual costs (platform owner only). */
function ByOrganisation() {
  const rows = paying.map((t) => {
    const rev = revenueOf(t.id)
    const { hosting, other } = orgCosts(t)
    const partner = PARTNERS.find((p) => p.id === PARTNER_OF[t.id])?.name ?? "Direct"
    return { t, rev, hosting, other, profit: rev - hosting - other, partner }
  })
  return (
    <DataTable
      label="Profit by organisation"
      rows={rows}
      getRowId={(r) => r.t.id}
      minWidth={860}
      toolbar={<span className="flex w-full flex-wrap items-baseline justify-between gap-2"><h2 className="text-[0.9375rem] font-semibold">By organisation</h2><span className="text-[0.8125rem] text-muted-foreground">Actual hosting by database size; other costs shared by users</span></span>}
      columns={[
        { id: "o", header: "Organisation", cell: (r) => <span className="font-medium">{r.t.name}</span> },
        { id: "p", header: "Partner", cell: (r) => <span className="text-[0.8125rem] text-muted-foreground">{r.partner}</span> },
        { id: "r", header: "Revenue", cell: (r) => <span className="whitespace-nowrap tabular-nums">{peso(r.rev)}</span> },
        { id: "h", header: "Hosting", cell: (r) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{peso(r.hosting)}</span> },
        { id: "c", header: "Other costs", cell: (r) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{peso(r.other)}</span> },
        { id: "f", header: "Profit", cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums">{peso(r.profit)}</span> },
        { id: "m", header: "Margin", cell: (r) => { const m = r.rev ? Math.round((r.profit / r.rev) * 100) : 0; return <Badge tone={m >= 85 ? "done" : "soon"}>{r.rev ? `${m}%` : "No data"}</Badge> } },
      ]}
    />
  )
}

function partnerFigures(id: PartnerId) {
  const orgs = paying.filter((t) => PARTNER_OF[t.id] === id)
  const revenue = orgs.reduce((s, t) => s + revenueOf(t.id), 0)
  const allocated = orgs.length * ALLOCATED_COST
  const share = PARTNERS.find((p) => p.id === id)!.share
  return { orgs, revenue, allocated, profit: revenue - allocated, share }
}

/** Reported profit split with each partner by the signed agreement. Allocated costs, never actual hosting. */
function PartnerShare({ only }: { only?: PartnerId }) {
  const list = PARTNERS.filter((p) => !only || p.id === only)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Partner share</CardTitle>
          <span className="text-xs text-muted-foreground">Reported profit uses an allocated cost of {peso(ALLOCATED_COST)} per organisation per month, not actual hosting. Split from the partner agreement (sample 70 / 30).</span>
        </span>
      </CardHeader>
      <ul>
        {list.map((p, i) => {
          const f = partnerFigures(p.id)
          return (
            <li key={p.id} className={cn("grid gap-3 px-5 py-3 tabular-nums sm:grid-cols-[1.4fr_1fr_1fr_1fr]", i > 0 && "border-t border-rule-soft")}>
              <span className="flex flex-col">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {f.orgs.length} organisations · revenue {peso(f.revenue)}
                </span>
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">Reported profit</span>
                {peso(f.profit)}
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">Partner {Math.round(f.share * 100)}%</span>
                <strong>{peso(f.profit * f.share)}</strong>
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">ThryveMS {Math.round((1 - f.share) * 100)}%</span>
                {peso(f.profit * (1 - f.share))}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** What a business partner sees: only their organisations and allocated costs. */
function PartnerView({ id }: { id: PartnerId }) {
  const f = partnerFigures(id)
  return (
    <>
      <FigureGrid
        figures={[
          { value: String(f.orgs.length), label: "Your organisations", badge: "Assigned", tone: "draft", icon: ReceiptIcon },
          { value: peso(f.revenue), label: "Revenue, before VAT", badge: "This month", tone: "done", icon: BanknoteIcon },
          { value: peso(f.allocated), label: "Allocated costs", badge: "This month", tone: "draft", icon: WalletIcon },
          { value: peso(f.profit * f.share), label: `Your share, ${Math.round(f.share * 100)}%`, badge: "This month", tone: "done", icon: TrendingUpIcon },
        ]}
      />
      <DataTable
        label="Your organisations"
        rows={f.orgs}
        getRowId={(t) => t.id}
        minWidth={640}
        columns={[
          { id: "o", header: "Organisation", cell: (t) => <span className="font-medium">{t.name}</span> },
          { id: "p", header: "Plan and seats", cell: (t) => <span className="text-[0.8125rem]">{t.plan} · {t.used} of {t.seats}</span> },
          { id: "r", header: "Revenue", cell: (t) => <span className="tabular-nums">{peso(revenueOf(t.id))}</span> },
          { id: "a", header: "Allocated cost", cell: () => <span className="tabular-nums text-muted-foreground">{peso(ALLOCATED_COST)}</span> },
          { id: "f", header: "Reported profit", cell: (t) => <span className="font-semibold tabular-nums">{peso(revenueOf(t.id) - ALLOCATED_COST)}</span> },
        ]}
      />
      <PartnerShare only={id} />
      <p className="text-xs text-muted-foreground">Partners don’t see actual hosting costs, deployments or any client records. In production the server filters this view by the partner’s assignments.</p>
    </>
  )
}

export default function Finance() {
  const [view, setView] = React.useState<"all" | "unpaid" | "paid">("all")
  const [viewAs, setViewAs] = React.useState<"owner" | PartnerId>("owner")
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
          <>
            <NativeSelect aria-label="View as" value={viewAs} onChange={(e) => setViewAs(e.target.value as typeof viewAs)} className="h-10 w-auto min-w-44">
              <option value="owner">View as platform owner</option>
              {PARTNERS.map((p) => (
                <option key={p.id} value={p.id}>
                  View as {p.name}
                </option>
              ))}
            </NativeSelect>
            {viewAs === "owner" && (
              <Button variant="outline" onClick={() => toast("Finance report created for October 2026", { description: "Invoices, payments, costs, profit and VAT, for your accountant." })}>
                Create report for accountant
              </Button>
            )}
          </>
        }
      />
      {viewAs !== "owner" ? (
        <PartnerView id={viewAs} />
      ) : (
      <>
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
      <ByOrganisation />
      <PartnerShare />
      </>
      )}
    </>
  )
}
