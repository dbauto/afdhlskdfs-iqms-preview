import * as React from "react"
import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { PERMISSIONS, ROLE_HELP, ROLE_PERMISSIONS, ROLE_RANK, assignableRoles, usePlatformAccess, type PlatformMember, type PlatformRole } from "@/lib/platform-access"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { Field } from "@/components/app/form"
import { RowActions } from "@/components/app/record-actions"
import { PlatformHeader } from "./shell"
import { useConsole } from "@/lib/console-store"
import { PARTNERS, type PartnerId } from "@/data/platform"
import { TENANTS } from "@/data/admin"
import { Checkbox } from "@/components/ui/checkbox"

const ROLES = Object.keys(ROLE_RANK) as PlatformRole[]
const okEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

function MemberDialog({ open, member, onClose }: { open: boolean; member?: PlatformMember; onClose: () => void }) {
  const { me, invite, changeRole, setPartner } = usePlatformAccess()
  const c = useConsole()
  const [partner, setPartnerId] = React.useState<"" | PartnerId>("")
  const roles = assignableRoles(me.role)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<PlatformRole>("Admin support")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (open) {
      setName(member?.name ?? "")
      setEmail(member?.email ?? "")
      setRole(member?.role ?? "Admin support")
      setPartnerId(member?.partnerId ?? "")
      setErrors({})
    }
  }, [open, member])
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? `Change ${member.name}’s role` : "Add team member"}</DialogTitle>
          <DialogDescription>
            {member ? "Takes effect on their next page. Their current sessions are refreshed." : "They get an email to sign in with a passkey behind Cloudflare Access."} You can give roles up to your own ({me.role}).
          </DialogDescription>
        </DialogHeader>
        {!member && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="tm-name" error={errors.name}>
              <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Work email" htmlFor="tm-email" error={errors.email}>
              <Input id="tm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@iqms.example" aria-invalid={!!errors.email} />
            </Field>
          </div>
        )}
        {me.role === "Developer" && (
          <Field label="Business partner" htmlFor="tm-partner" help="A partner works as a Co-admin who sees only their own organisations, their revenue and their share. No deployments, team, reports or logs.">
            <NativeSelect id="tm-partner" value={partner} onChange={(e) => { const v = e.target.value as "" | PartnerId; setPartnerId(v); if (v) setRole("Co-admin") }}>
              <option value="">Not a partner</option>
              {PARTNERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field label="Role" htmlFor="tm-role" help={partner ? "Partners are always Co-admins limited to their own organisations." : ROLE_HELP[role]}>
          <NativeSelect id="tm-role" value={role} disabled={!!partner} onChange={(e) => setRole(e.target.value as PlatformRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r} disabled={!roles.includes(r)}>
                {r}
                {roles.includes(r) ? "" : " (above your role)"}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (member) {
                if (member.role !== role && !changeRole(member.id, role)) return toast("You can’t give a role above your own")
                if (me.role === "Developer" && (member.partnerId ?? "") !== partner) setPartner(member.id, partner || undefined)
                c.log(me, `changed role to ${role}${partner ? ` (${PARTNERS.find((p) => p.id === partner)?.name})` : ""} for`, member.name, "Team")
                toast(`${member.name} is now ${role}${partner ? `, ${PARTNERS.find((p) => p.id === partner)?.name}` : ""}`)
                return onClose()
              }
              const e: Record<string, string> = {}
              if (!name.trim()) e.name = "Enter their name."
              if (!okEmail(email)) e.email = "Enter an email like name@iqms.example."
              setErrors(e)
              if (Object.keys(e).length) return
              if (!invite({ name: name.trim(), email: email.trim(), role, partnerId: partner || undefined })) return setErrors({ email: "You can’t give a role above your own." })
              c.log(me, `invited as ${role}${partner ? ` (${PARTNERS.find((p) => p.id === partner)?.name})` : ""}`, email.trim(), "Team")
              toast(`Invitation sent to ${email.trim()}`, { description: `${role}. The invitation expires in 7 days.` })
              onClose()
            }}
          >
            {member ? "Save role" : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Partner companies (ADR-042): their people, assigned organisations and share. Developer only. */
function Partners() {
  const c = useConsole()
  const { me, members } = usePlatformAccess()
  const [editing, setEditing] = React.useState<PartnerId>()
  const [picked, setPicked] = React.useState<string[]>([])
  const [share, setShare] = React.useState("")
  const [error, setError] = React.useState("")
  return (
    <Card>
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Business partners</CardTitle>
          <span className="text-xs text-muted-foreground">Partners sign in as Co-admins limited to the organisations assigned here. Their share is set from the signed partner agreement.</span>
        </span>
      </CardHeader>
      <ul>
        {PARTNERS.map((p, i) => {
          const orgs = TENANTS.filter((t) => c.partnerOf[t.id] === p.id)
          const people = members.filter((m) => m.partnerId === p.id)
          return (
            <li key={p.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {people.length ? people.map((m) => m.name).join(", ") : "No one invited yet"} · {orgs.length} organisations · share {Math.round(c.shares[p.id] * 100)}%
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={() => { setEditing(p.id); setPicked(orgs.map((t) => t.id)); setShare(String(Math.round(c.shares[p.id] * 100))); setError("") }}>
                Assign organisations
              </Button>
            </li>
          )
        })}
      </ul>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PARTNERS.find((p) => p.id === editing)?.name}: organisations and share</DialogTitle>
            <DialogDescription>An organisation belongs to one partner at most. Partners see only these organisations, their revenue and allocated costs.</DialogDescription>
          </DialogHeader>
          <Field label="Partner share (%)" htmlFor="pt-share" error={error} help="From the signed partner agreement.">
            <Input id="pt-share" type="number" min={0} max={100} value={share} onChange={(e) => setShare(e.target.value)} className="max-w-32" aria-invalid={!!error} />
          </Field>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border p-2">
            {TENANTS.filter((t) => t.plan !== "Trial").map((t) => {
              const other = c.partnerOf[t.id] && c.partnerOf[t.id] !== editing ? PARTNERS.find((p) => p.id === c.partnerOf[t.id])?.name : undefined
              return (
                <label key={t.id} className={cn("flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-hover", other && "text-muted-foreground")}>
                  <Checkbox checked={picked.includes(t.id)} onCheckedChange={(v) => setPicked((all) => (v ? [...all, t.id] : all.filter((x) => x !== t.id)))} />
                  <span className="flex-1">{t.name}</span>
                  {other && <span className="text-xs">now {other}</span>}
                </label>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const n = Number(share)
                if (!(n >= 0 && n <= 100)) return setError("Enter a share from 0 to 100.")
                const id = editing!
                TENANTS.forEach((t) => {
                  if (picked.includes(t.id)) c.assignPartner(t.id, id)
                  else if (c.partnerOf[t.id] === id) c.assignPartner(t.id, undefined)
                })
                c.setShare(id, n / 100)
                c.log(me, `assigned ${picked.length} organisations, share ${n}% to`, PARTNERS.find((p) => p.id === id)!.name, "Team")
                toast("Partner saved")
                setEditing(undefined)
              }}
            >
              Save partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default function PlatformTeam() {
  const { me, members, can, canManage, remove } = usePlatformAccess()
  const c = useConsole()
  const [dialog, setDialog] = React.useState<{ open: boolean; member?: PlatformMember }>({ open: false })
  return (
    <>
      <PlatformHeader
        title="Platform team"
        description="Your own staff who can open this console, and what each role can do. Nobody here can open client records without support access granted by the client."
        actions={
          can("team.manage") ? (
            <Button onClick={() => setDialog({ open: true })}>
              <PlusIcon /> Add team member
            </Button>
          ) : undefined
        }
      />
      <DataTable
        label="Platform team"
        empty={{ title: "No one on the platform team yet", body: "Invite the people who run ThryveMS for all clients." }}
        rows={members}
        getRowId={(p) => p.id}
        minWidth={720}
        columns={[
          { id: "n", header: "Person", cell: (p) => <span className="flex items-center gap-3"><Avatar name={p.name} size={30} /><span className="flex flex-col"><span className="font-medium">{p.name}{p.id === me.id ? " (you)" : ""}</span><span className="text-xs text-muted-foreground">{p.email}</span></span></span> },
          { id: "r", header: "Role", cell: (p) => <span className="flex flex-col items-start gap-0.5"><Badge tone={p.role === "Developer" ? "progress" : "draft"}>{p.role}</Badge>{p.partnerId && <span className="text-xs text-muted-foreground">{PARTNERS.find((x) => x.id === p.partnerId)?.name}, own organisations only</span>}</span> },
          { id: "s", header: "State", cell: (p) => <Badge tone={p.state === "Active" ? "done" : "soon"}>{p.state}</Badge> },
          { id: "l", header: "Last active", cell: (p) => <span className="text-muted-foreground">{p.last}</span> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-12",
            cell: (p) =>
              canManage(p) ? (
                <RowActions
                  name={p.name}
                  onEdit={() => setDialog({ open: true, member: p })}
                  removeKind="withdraw"
                  onRemove={() => {
                    remove(p.id)
                    c.log(me, "removed", p.name, "Team")
                    toast(`${p.name} removed`, { description: "Their sessions end now." })
                  }}
                />
              ) : null,
          },
        ]}
      />
      <Card>
        <CardHeader>
          <span className="flex flex-col">
            <CardTitle>What each role can do</CardTitle>
            <span className="text-xs text-muted-foreground">Fixed for safety. Only the Developer can deploy, roll back or change AI keys. Nobody can give a role above their own.</span>
          </span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-hover text-left text-[0.8125rem] text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 font-semibold">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="w-36 px-3 py-2.5 text-center font-semibold">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.key} className="border-t border-rule-soft">
                  <th scope="row" className="px-5 py-2.5 text-left font-normal">
                    <span className="flex flex-col">
                      <span className={cn(p.key === "deploy" && "font-semibold")}>{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.help}</span>
                    </span>
                  </th>
                  {ROLES.map((r) => {
                    const yes = ROLE_PERMISSIONS[r].includes(p.key)
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {yes ? <CheckIcon className="mx-auto size-4 text-done" aria-label={`${r}: yes`} /> : <MinusIcon className="mx-auto size-4 text-faint" aria-label={`${r}: no`} />}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {me.role === "Developer" && <Partners />}
      <MemberDialog open={dialog.open} member={dialog.member} onClose={() => setDialog({ open: false })} />
    </>
  )
}
