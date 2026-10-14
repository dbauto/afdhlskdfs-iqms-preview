import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { ORG } from "@/data/org"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/app/data-table"
import { KeyFacts } from "@/components/app/page"
import { StateBadge } from "@/components/app/status"
import { SettingsHeader } from "./layout"

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const PER_SEAT = 450 // monthly, before VAT. Sample price.

const INVOICES = [
  { id: "SI-2026-0010", period: "October 2026", seats: 160, state: "Pending" },
  { id: "SI-2026-0009", period: "September 2026", seats: 160, state: "Done" },
  { id: "SI-2026-0008", period: "August 2026", seats: 150, state: "Done" },
  { id: "SI-2026-0007", period: "July 2026", seats: 150, state: "Done" },
]

export default function Billing() {
  const { state } = useStore()
  const used = state.people.filter((p) => p.status === "Active").length
  const net = ORG.seats * PER_SEAT
  const vat = net * 0.12

  return (
    <>
      <SettingsHeader title="Billing" description="Your plan, seats and invoices. Prices are in Philippine pesos and include 12% VAT where shown." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{ORG.plan} plan</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <KeyFacts
              facts={[
                { k: "Seats", v: `${used} of ${ORG.seats} used` },
                { k: "Price", v: `${peso(PER_SEAT)} per seat a month, before VAT` },
                { k: "Monthly", v: `${peso(net)} + ${peso(vat)} VAT = ${peso(net + vat)}` },
                { k: "Renews", v: "14 Jan 2027" },
              ]}
            />
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" onClick={() => toast("Request sent to the iQMS team", { description: "They’ll confirm the new seat count by email." })}>
              Change seats
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billed to</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <KeyFacts
              facts={[
                { k: "Company", v: "Arden and Company Manufacturing Inc." },
                { k: "TIN", v: "123-456-789-000" },
                { k: "Address", v: "Lot 4, Light Industry and Science Park, Cabuyao, Laguna" },
                { k: "Pays by", v: "Bank transfer, 30 days" },
              ]}
            />
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" onClick={() => toast("Billing details saved")}>
              Edit billing details
            </Button>
          </CardFooter>
        </Card>
      </div>
      <DataTable
        label="Invoices" empty={{ title: "No invoices yet", body: "Your first invoice appears after the first billing period." }}
        rows={INVOICES}
        getRowId={(i) => i.id}
        minWidth={760}
        columns={[
          { id: "n", header: "Sales invoice", cell: (i) => <span className="font-medium">{i.id}</span> },
          { id: "p", header: "Period", cell: (i) => i.period },
          { id: "s", header: "Seats", cell: (i) => i.seats },
          { id: "a", header: "Amount, VAT included", cell: (i) => peso(i.seats * PER_SEAT * 1.12) },
          { id: "st", header: "State", cell: (i) => <StateBadge value={i.state === "Done" ? "Paid" : "Due 30 Nov"} /> },
          { id: "d", header: <span className="sr-only">Download</span>, className: "w-28", cell: (i) => <Button variant="quiet" size="sm" onClick={() => toast(`Downloading ${i.id}.pdf`)}><DownloadIcon /> PDF</Button> },
        ]}
      />
      <p className="text-[0.8125rem] text-muted-foreground">Prices and invoices here are sample figures. Real invoices must follow BIR rules.</p>
    </>
  )
}
