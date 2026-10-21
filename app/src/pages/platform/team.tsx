import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { Avatar } from "@/components/ui/avatar"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { Field } from "@/components/app/form"
import { RowActions } from "@/components/app/record-actions"
import { TEAM_ROLES, usePlatform, type TeamMember, type TeamRole } from "@/lib/platform-store"
import { PlatformHeader } from "./shell"

type Edit = { kind: "role" | "remove"; member: TeamMember }

export default function PlatformTeam() {
  const { state, addMember, changeRole, removeMember } = usePlatform()
  const [adding, setAdding] = React.useState(false)
  const [add, setAdd] = React.useState({ name: "", email: "", role: "Support engineer" as TeamRole })
  const [edit, setEdit] = React.useState<Edit | undefined>()
  const [role, setRole] = React.useState<TeamRole>("Support engineer")
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")

  const clients = (m: TeamMember) => state.accounts.filter((a) => !a.archived && a.partnerId && a.partnerId === m.partnerId).map((a) => a.name)

  const open = (e: Edit) => {
    setEdit(e)
    setRole(e.member.role)
    setReason("")
    setError("")
  }
  const close = () => {
    setEdit(undefined)
    setError("")
  }

  return (
    <>
      <PlatformHeader
        title="Platform team"
        description="Your own staff and business partners who can open this console or the business space. Developers get read-only logs. Nobody here can open client records without support access."
        actions={
          <Button onClick={() => { setAdd({ name: "", email: "", role: "Support engineer" }); setError(""); setAdding(true) }}>
            <PlusIcon /> Add team member
          </Button>
        }
      />
      <DataTable
        label="Platform team" empty={{ title: "No one on the platform team yet", body: "Invite the people who run ThryveMS for all clients." }}
        rows={state.team}
        getRowId={(p) => p.email}
        minWidth={820}
        columns={[
          { id: "n", header: "Person", cell: (p) => <span className="flex items-center gap-3"><Avatar name={p.name} size={30} /><span className="flex flex-col"><span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{p.email}</span></span></span> },
          { id: "r", header: "Role", cell: (p) => p.role },
          {
            id: "c",
            header: "Clients",
            cell: (p) => {
              if (p.role !== "Business partner") return <span className="text-muted-foreground">All, as their role allows</span>
              const list = clients(p)
              return list.length ? list.join(", ") : <span className="text-muted-foreground">None assigned</span>
            },
          },
          { id: "l", header: "Last active", cell: (p) => <span className="text-muted-foreground">{p.last}</span> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-12",
            cell: (p) => <RowActions name={p.name} onEdit={() => open({ kind: "role", member: p })} extra={[{ label: "Remove access", onSelect: () => open({ kind: "remove", member: p }) }]} />,
          },
        ]}
      />

      <Dialog open={adding} onOpenChange={(o) => { setAdding(o); if (!o) setError("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>They get access to the console or, for a business partner, the business space. Partners see only the clients assigned to them.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="tm-n">
            <Input id="tm-n" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="tm-e">
            <Input id="tm-e" type="email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
          </Field>
          <Field label="Role" htmlFor="tm-r">
            <NativeSelect id="tm-r" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value as TeamRole })}>
              {TEAM_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </NativeSelect>
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const problem = addMember(add)
                if (problem) return setError(problem)
                toast(`${add.name.trim()} added`, { description: "Preview only: no invitation email is sent." })
                setAdding(false)
              }}
            >
              Add team member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.kind === "role" ? `Change role for ${edit.member.name}` : `Remove access for ${edit?.member.name}`}</DialogTitle>
            <DialogDescription>
              {edit?.kind === "role" ? `Now ${edit.member.role}. The change and the reason are kept in the change history.` : "They can’t open the console or the business space any more. What they did stays in the history."}
            </DialogDescription>
          </DialogHeader>
          {edit?.kind === "role" && (
            <Field label="Role" htmlFor="tm-role">
              <NativeSelect id="tm-role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
                {TEAM_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field label="Reason" htmlFor="tm-why">
            <Textarea id="tm-why" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            {edit?.kind === "role" ? (
              <Button
                onClick={() => {
                  const problem = changeRole(edit.member.email, role, reason)
                  if (problem) return setError(problem)
                  toast(`Role changed for ${edit.member.name}`)
                  close()
                }}
              >
                Change role
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => {
                  if (!edit) return
                  const problem = removeMember(edit.member.email, reason)
                  if (problem) return setError(problem)
                  toast(`Access removed for ${edit.member.name}`)
                  close()
                }}
              >
                Remove access
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
