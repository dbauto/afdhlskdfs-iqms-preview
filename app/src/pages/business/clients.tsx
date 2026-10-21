import * as React from "react"
import { useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import { ContentLink as Link } from "@/components/app/content-link"
import { DataTable } from "@/components/app/data-table"
import { KeyFacts } from "@/components/app/page"
import { PARTNERS, usePlatform, type ClientAccount } from "@/lib/platform-store"
import NotFound from "@/pages/not-found"
import { PlatformHeader } from "@/pages/platform/shell"

/** "Live" or "Not live yet". Partners see whether a client can use ThryveMS, not how it is deployed. */
function Status({ a }: { a: ClientAccount }) {
  return <Badge tone={a.deployment === "Live" ? "done" : "draft"}>{a.deployment === "Live" ? "Live" : "Not live yet"}</Badge>
}

/** The platform owner can look at the business space as any partner; a partner always sees their own. */
function usePartnerScope() {
  const { user } = usePlatform()
  const [asPartner, setAsPartner] = React.useState(PARTNERS[0]?.partnerId ?? "")
  const partnerId = user.role === "partner" ? user.partnerId : asPartner
  return { partnerId, owner: user.role === "developer", asPartner, setAsPartner }
}

export default function BusinessClients() {
  const { visibleAccounts } = usePlatform()
  const { partnerId, owner, asPartner, setAsPartner } = usePartnerScope()
  const rows = visibleAccounts(owner ? partnerId : undefined)
  return (
    <>
      <PlatformHeader
        title="Clients"
        description="The clients assigned to you: their accounts and commercial details. You never see their quality records."
        actions={
          owner ? (
            <NativeSelect aria-label="Partner" value={asPartner} onChange={(e) => setAsPartner(e.target.value)} className="h-9 w-auto min-w-44 text-[0.8125rem]">
              {PARTNERS.map((p) => (
                <option key={p.id} value={p.partnerId}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          ) : undefined
        }
      />
      <DataTable
        label="Clients"
        empty={{ title: "No clients assigned yet", body: "Clients show here when the platform owner assigns them to you." }}
        rows={rows}
        getRowId={(a) => a.id}
        minWidth={720}
        columns={[
          { id: "n", header: "Client", cell: (a) => <span className="flex flex-col"><Link to={`/business/clients/${a.id}`} className="font-medium text-primary hover:underline">{a.name}</Link><span className="text-xs text-muted-foreground">{a.domain}</span></span> },
          { id: "p", header: "Plan", cell: (a) => a.plan },
          { id: "s", header: "Seats", cell: (a) => `${a.used} of ${a.seats}` },
          { id: "a", header: "Client admin", cell: (a) => a.admin || <span className="text-muted-foreground">Not yet</span> },
          { id: "st", header: "Status", cell: (a) => <Status a={a} /> },
        ]}
      />
    </>
  )
}

export function BusinessClient() {
  const { id } = useParams()
  const { visibleAccounts, user } = usePlatform()
  // A partner only finds their own clients; anything else is "doesn't exist", like any hidden record.
  const a = visibleAccounts().find((x) => x.id === id && (user.role === "developer" || x.partnerId === user.partnerId))
  if (!a) return <NotFound />
  return (
    <>
      <PlatformHeader title={a.name} description="Account and commercial details. Quality records stay inside the client’s own workspace." />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <KeyFacts
          className="px-5 pb-2"
          facts={[
            { k: "Email domain", v: a.domain },
            { k: "Plan", v: a.plan },
            { k: "Seats", v: `${a.used} of ${a.seats} in use` },
            { k: "Client admin", v: a.admin || "Not yet" },
            { k: "Status", v: <Status a={a} /> },
            { k: "Client since", v: a.created },
          ]}
        />
      </Card>
    </>
  )
}
