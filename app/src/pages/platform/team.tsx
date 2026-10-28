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

const ROLES = Object.keys(ROLE_RANK) as PlatformRole[]
const okEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

function MemberDialog({ open, member, onClose }: { open: boolean; member?: PlatformMember; onClose: () => void }) {
  const { me, invite, changeRole } = usePlatformAccess()
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
        <Field label="Role" htmlFor="tm-role" help={ROLE_HELP[role]}>
          <NativeSelect id="tm-role" value={role} onChange={(e) => setRole(e.target.value as PlatformRole)}>
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
                if (!changeRole(member.id, role)) return toast("You can’t give a role above your own")
                toast(`${member.name} is now ${role}`)
                return onClose()
              }
              const e: Record<string, string> = {}
              if (!name.trim()) e.name = "Enter their name."
              if (!okEmail(email)) e.email = "Enter an email like name@iqms.example."
              setErrors(e)
              if (Object.keys(e).length) return
              if (!invite({ name: name.trim(), email: email.trim(), role })) return setErrors({ email: "You can’t give a role above your own." })
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

export default function PlatformTeam() {
  const { me, members, can, canManage, remove } = usePlatformAccess()
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
          { id: "r", header: "Role", cell: (p) => <Badge tone={p.role === "Developer" ? "progress" : "draft"}>{p.role}</Badge> },
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
      <MemberDialog open={dialog.open} member={dialog.member} onClose={() => setDialog({ open: false })} />
    </>
  )
}
