import * as React from "react"
import { HeadsetIcon, MailIcon, PlusIcon, SearchIcon, UserMinusIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ORG } from "@/data/org"
import { ACCESS_REQUESTS, ACTIVITY, INVITES } from "@/data/admin"
import type { Person } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NativeSelect, Textarea } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/app/data-table"
import { StateBadge } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"
import { Link } from "react-router-dom"
import { SettingsHeader } from "./layout"

function RoleSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { state } = useStore()
  return (
    <NativeSelect aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-40 text-[0.8125rem]">
      {state.roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </NativeSelect>
  )
}

export default function Users() {
  const { state, update, add } = useStore()
  const [tab, setTab] = React.useState("people")
  const [q, setQ] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("active")
  const [requests, setRequests] = React.useState(() => ACCESS_REQUESTS.map((r) => ({ ...r, role: r.suggestedRoleId, decided: "" as "" | "yes" | "no" })))
  const [invites, setInvites] = React.useState(INVITES)
  const [invite, setInvite] = React.useState(false)
  const [inv, setInv] = React.useState({ emails: "", role: "viewer" })
  const [support, setSupport] = React.useState(false)
  const [logFilter, setLogFilter] = React.useState("")

  const people = state.people
  const active = people.filter((p) => p.status === "Active")
  const seats = active.length
  const pending = requests.filter((r) => !r.decided).length
  const rows = people
    .filter((p) => (statusFilter === "active" ? p.status !== "Deactivated" : p.status === "Deactivated"))
    .filter((p) => !roleFilter || p.roleId === roleFilter)
    .filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <SettingsHeader
        title="Users and access"
        description={`${seats} of ${ORG.seats} seats used. Guests and deactivated people don’t use a seat.`}
        actions={
          <Button onClick={() => setInvite(true)}>
            <UserPlusIcon /> Invite people
          </Button>
        }
      />
      <div className="h-1.5 overflow-hidden rounded-full bg-border" role="img" aria-label={`${seats} of ${ORG.seats} seats used`}>
        <div className="h-full bg-primary" style={{ width: `${(seats / ORG.seats) * 100}%` }} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="requests">
            Access requests {pending > 0 && <Badge tone="solid" className="h-5 rounded-full bg-primary px-1.5">{pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="invites">
            Invitations <span className="text-xs font-normal text-muted-foreground">{invites.length}</span>
          </TabsTrigger>
          <TabsTrigger value="log">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          <DataTable
            label="People"
            rows={rows}
            getRowId={(p) => p.id}
            minWidth={760}
            toolbar={
              <>
                <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-sm border border-input bg-card px-3 sm:max-w-xs">
                  <SearchIcon className="size-4 text-muted-foreground" />
                  <span className="sr-only">Filter people</span>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or email" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
                <NativeSelect aria-label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-9 w-auto min-w-40 text-[0.8125rem]">
                  <option value="">All roles</option>
                  {state.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 w-auto min-w-40 text-[0.8125rem]">
                  <option value="active">Active and guests</option>
                  <option value="off">Deactivated</option>
                </NativeSelect>
              </>
            }
            columns={[
              {
                id: "p",
                header: "Person",
                cell: (p: Person) => (
                  <span className="flex items-center gap-3">
                    <Avatar name={p.name} size={32} />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.email}</span>
                    </span>
                  </span>
                ),
              },
              { id: "r", header: "Role", cell: (p) => <RoleSelect label={`Role for ${p.name}`} value={p.roleId} onChange={(v) => { update("people", p.id, { roleId: v }); toast(`${p.name} is now ${state.roles.find((r) => r.id === v)?.name}`) }} /> },
              { id: "s", header: "Process scope", cell: (p) => <span className="text-[0.8125rem] text-muted-foreground">{p.scope}</span> },
              {
                id: "st",
                header: "Status, last active",
                cell: (p) => (
                  <span className="flex flex-col items-start gap-1">
                    <StateBadge value={p.status} />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{p.lastActive}</span>
                  </span>
                ),
              },
              {
                id: "x",
                header: <span className="sr-only">Actions</span>,
                className: "w-12",
                cell: (p) => (
                  <RowActions
                    name={p.name}
                    extra={
                      p.status === "Deactivated"
                        ? [{ label: "Reactivate", icon: <UserPlusIcon />, onSelect: () => { update("people", p.id, { status: "Active" }); toast(`${p.name} reactivated`) } }]
                        : [
                            { label: "Send sign-in link", icon: <MailIcon />, onSelect: () => toast(`Sign-in link sent to ${p.email}`) },
                            { label: "Deactivate", icon: <UserMinusIcon />, onSelect: () => { update("people", p.id, { status: "Deactivated" }); toast(`${p.name} deactivated`, { description: "Their records stay. Reassign open tasks from their profile." }) } },
                          ]
                    }
                  />
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="requests" className="flex flex-col gap-4">
          <p className="max-w-[680px] text-sm leading-normal text-muted-foreground">People who asked for an account from the sign-in page. Pick a role before approving. They’ll get an email and sign in with Microsoft 365.</p>
          <Card>
            <ul>
              {requests.map((r, i) => (
                <li key={r.id} className={cn("grid grid-cols-1 items-center gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_190px_220px]", i > 0 && "border-t border-rule-soft")}>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <span className="text-[0.8125rem] text-muted-foreground">{r.email}</span>
                      {r.external && <Badge tone="soon">Outside {ORG.domain}</Badge>}
                    </span>
                    <span className="text-sm leading-normal">“{r.reason}”</span>
                    <span className="text-xs text-muted-foreground">Asked {r.asked}</span>
                  </div>
                  {r.decided ? (
                    <>
                      <Badge tone={r.decided === "yes" ? "done" : "draft"} className="justify-self-start">
                        {r.decided === "yes" ? `Approved as ${state.roles.find((x) => x.id === r.role)?.name}` : "Declined"}
                      </Badge>
                      <Button variant="quiet" size="sm" className="justify-self-end" onClick={() => setRequests((all) => all.map((x) => (x.id === r.id ? { ...x, decided: "" } : x)))}>
                        Undo
                      </Button>
                    </>
                  ) : (
                    <>
                      <RoleSelect label={`Role for ${r.name}`} value={r.role} onChange={(v) => setRequests((all) => all.map((x) => (x.id === r.id ? { ...x, role: v } : x)))} />
                      <span className="flex gap-2 md:justify-end">
                        <Button variant="outline" size="sm" onClick={() => setRequests((all) => all.map((x) => (x.id === r.id ? { ...x, decided: "no" } : x)))}>
                          Decline
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary text-primary"
                          onClick={() => {
                            setRequests((all) => all.map((x) => (x.id === r.id ? { ...x, decided: "yes" } : x)))
                            add("people", { id: `p-${r.id}`, name: r.name, title: "New", email: r.email, roleId: r.role, scope: r.external ? "Ends 30 Nov 2026" : "All processes", status: r.external ? "Guest" : "Active", lastActive: "Not yet" })
                            toast(`${r.name} approved`, { description: "They’ll get an email to sign in." })
                          }}
                        >
                          Approve
                        </Button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <ul>
              {invites.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No invitations waiting.</li>}
              {invites.map((v, i) => (
                <li key={v.id} className={cn("grid grid-cols-1 items-center gap-3 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_140px_160px_200px]", i > 0 && "border-t border-rule-soft")}>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{v.email}</span>
                    <span className="text-xs text-muted-foreground">
                      Invited by {v.by}, {v.sent}. {v.note}
                    </span>
                  </span>
                  <span className="text-sm">{state.roles.find((r) => r.id === v.roleId)?.name}</span>
                  <StateBadge value={v.status} className="justify-self-start" />
                  <span className="flex gap-1 md:justify-end">
                    <Button variant="quiet" size="sm" onClick={() => { setInvites((all) => all.map((x) => (x.id === v.id ? { ...x, status: "Pending", note: "Expires in 7 days" } : x))); toast(`Invitation sent again to ${v.email}`) }}>
                      Resend
                    </Button>
                    <Button variant="quiet" size="sm" className="text-destructive" onClick={() => setInvites((all) => all.filter((x) => x.id !== v.id))}>
                      Cancel invite
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="flex flex-col gap-4">
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <span className={cn("flex size-10 items-center justify-center rounded-md", support ? "bg-soon-tint text-soon" : "bg-background text-muted-foreground")}>
              <HeadsetIcon className="size-5" />
            </span>
            <span className="flex min-w-[260px] flex-1 flex-col gap-1">
              <span className="text-sm font-semibold">{support ? "iQMS support can open this workspace until tomorrow, 09:00" : "Support access is off"}</span>
              <span className="text-[0.8125rem] leading-normal text-muted-foreground">
                {support
                  ? "They can view records to fix ticket SUP-2304. Highly confidential links stay hidden. Everything they open is logged below."
                  : "The iQMS team can’t open your records. Turn it on for 24 hours when they ask, for example to fix a problem you reported."}
              </span>
            </span>
            <Button variant="outline" onClick={() => { setSupport(!support); toast(support ? "Support access ended" : "Support access allowed for 24 hours") }}>
              {support ? "End support access" : "Allow for 24 hours"}
            </Button>
          </Card>
          <DataTable
            label="Activity log"
            rows={ACTIVITY.filter((a) => !logFilter || a.kind === logFilter)}
            getRowId={(a) => a.when + a.what}
            minWidth={760}
            toolbar={
              <>
                <NativeSelect aria-label="Filter by action" value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="h-9 w-auto min-w-44 text-[0.8125rem]">
                  <option value="">All actions</option>
                  <option>Access and roles</option>
                  <option>Approvals</option>
                  <option>Sharing</option>
                  <option>Support access</option>
                </NativeSelect>
                <Button variant="quiet" size="sm" className="ml-auto" onClick={() => toast("Activity log exported as CSV")}>
                  Export CSV
                </Button>
              </>
            }
            columns={[
              { id: "w", header: "When", cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{a.when}</span> },
              { id: "p", header: "Who", cell: (a) => <span className="whitespace-nowrap font-medium">{a.who}</span> },
              {
                id: "x",
                header: "What happened",
                cell: (a) => (
                  <span className="leading-normal">
                    {a.what}{" "}
                    {a.ref && a.to && (
                      <Link to={a.to} className="font-medium text-primary">
                        {a.ref}
                      </Link>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite people</DialogTitle>
            <DialogDescription>They get an email and sign in with Microsoft 365. You can change their role later.</DialogDescription>
          </DialogHeader>
          <Field label="Work emails" htmlFor="inv-e" help="One per line, or separated by commas.">
            <Textarea id="inv-e" value={inv.emails} onChange={(e) => setInv({ ...inv, emails: e.target.value })} placeholder={`name@${ORG.domain}`} className="min-h-24" />
          </Field>
          <Field label="Role" htmlFor="inv-r">
            <NativeSelect id="inv-r" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}>
              {state.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInvite(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const emails = inv.emails.split(/[\s,;]+/).filter((x) => x.includes("@"))
                if (!emails.length) return
                setInvites((all) => [...emails.map((email, k) => ({ id: `inv-${Date.now()}-${k}`, email, roleId: inv.role, by: "You", sent: "Today", status: "Pending" as const, note: "Expires in 7 days" })), ...all])
                toast(`${emails.length} ${emails.length === 1 ? "invitation" : "invitations"} sent`)
                setInv({ emails: "", role: "viewer" })
                setInvite(false)
                setTab("invites")
              }}
            >
              <PlusIcon /> Send invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
