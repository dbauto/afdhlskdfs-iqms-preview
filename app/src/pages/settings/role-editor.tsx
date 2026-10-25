import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AREAS } from "@/data/org"
import { ACCESS_LEVELS, type AccessLevel, type Area, type Role } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ConfirmRemove } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"

const SUB: Area[] = ["Organization & Scope", "Policies", "Processes", "Objectives & KPIs"]
const BLANK: Record<Area, AccessLevel> = Object.fromEntries(AREAS.map((a) => [a, a === "Overview" ? "View" : "None"])) as Record<Area, AccessLevel>

export default function RoleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, add, update, remove, moduleOn } = useStore()
  const existing = state.roles.find((r) => r.id === id)
  const [role, setRole] = React.useState<Role>(() => existing ?? { id: `role-${Date.now()}`, name: "", purpose: "", scope: "Processes they are assigned to", access: BLANK })
  const [confirm, setConfirm] = React.useState(false)
  const [error, setError] = React.useState("")
  const members = state.people.filter((p) => p.roleId === role.id && p.status !== "Deactivated")

  const setLevel = (a: Area, l: AccessLevel) => setRole((r) => ({ ...r, access: { ...r.access, [a]: l } }))

  function save() {
    if (!role.name.trim()) return setError("Give the role a name.")
    if (existing) update("roles", role.id, role)
    else add("roles", role)
    toast(`${role.name} saved`, { description: "Changes apply the next time people open a page." })
    navigate("/settings/roles")
  }

  return (
    <>
      <SettingsHeader
        title={existing ? `Edit ${existing.name}` : "Add role"}
        description="Choose what people with this role see in the menu and what they can do in each part of ThryveMS. Changes apply the next time they open a page."
        actions={
          <>
            {existing && (
              <Button
                variant="outline"
                onClick={() => {
                  const copy = { ...role, id: `role-${Date.now()}`, name: `${role.name} (copy)`, system: false }
                  add("roles", copy)
                  toast(`Duplicated as ${copy.name}`)
                  navigate(`/settings/roles/${copy.id}`)
                }}
              >
                <CopyIcon /> Duplicate role
              </Button>
            )}
            <Button onClick={save}>Save role</Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-5 py-5 md:grid-cols-2">
          <Field label="Role name" htmlFor="rl-n" error={error}>
            <Input id="rl-n" value={role.name} onChange={(e) => setRole({ ...role, name: e.target.value })} aria-invalid={!!error} />
          </Field>
          <Field label="Applies to" htmlFor="rl-s" help="Decides which records people with this role see. All processes: every record, as the administrator sees. Processes they own: only processes where they are the owner. Processes they are assigned to: only processes they are listed on. Not their own process: everything except their own, for auditors.">
            <NativeSelect id="rl-s" value={role.scope} onChange={(e) => setRole({ ...role, scope: e.target.value as Role["scope"] })}>
              <option>All processes</option>
              <option>Processes they own</option>
              <option>Processes they are assigned to</option>
              <option>Not their own process</option>
            </NativeSelect>
          </Field>
          <Field label="What this role is for" htmlFor="rl-p" className="md:col-span-2">
            <Textarea id="rl-p" value={role.purpose} onChange={(e) => setRole({ ...role, purpose: e.target.value })} className="min-h-16" />
          </Field>
          <div className="flex items-start justify-between gap-4 md:col-span-2">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="rl-conf" className="text-sm font-medium">
                Can open Confidential records
              </label>
              <span className="text-[0.8125rem] text-muted-foreground">Without this, people see a Confidential record only when they own it, are named on it, or review or approve it. Highly confidential records are always limited to the people named on them.</span>
            </div>
            <Switch id="rl-conf" checked={!!role.confidentialRead} disabled={role.id === "consultant"} onCheckedChange={(v) => setRole({ ...role, confidentialRead: !!v })} />
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-rule-soft pt-5 md:col-span-2">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="rl-ready" className="text-sm font-medium">
                Sees certification readiness
              </label>
              <span className="text-[0.8125rem] text-muted-foreground">Shows the certification readiness section on the Overview, as the administrator sees it. Seeing it doesn’t let people change it: quality managers and the consultant still list and confirm requirements.</span>
            </div>
            <Switch id="rl-ready" checked={!!role.seesReadiness} onCheckedChange={(v) => setRole({ ...role, seesReadiness: !!v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>Menu and access</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">What people can do in each section. Shown puts it in the menu with View; Hidden is None. View shows records but no buttons. Each level includes the ones before it.</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-3 text-left font-medium">Part of ThryveMS</th>
                <th scope="col" className="px-3 py-3 text-left font-medium">In the menu</th>
                <th scope="col" className="px-3 py-3 text-left font-medium">What they can do</th>
              </tr>
            </thead>
            <tbody>
              {AREAS.map((a) => {
                const lvl = role.access[a]
                const shown = lvl !== "None"
                if (!moduleOn(a))
                  return (
                    <tr key={a} className="border-t border-rule-soft text-muted-foreground">
                      <th scope="row" className={cn("py-2.5 pr-3 text-left", SUB.includes(a) ? "pl-10 font-normal" : "pl-5 font-semibold")}>
                        {a}
                      </th>
                      <td colSpan={2} className="px-3 py-2.5 text-[0.8125rem]">
                        Not in your ThryveMS plan or setup, so no one sees it.
                      </td>
                    </tr>
                  )
                return (
                  <tr key={a} className="border-t border-rule-soft">
                    <th scope="row" className={cn("py-2.5 pr-3 text-left", SUB.includes(a) ? "pl-10 font-normal" : "pl-5 font-semibold")}>
                      {a}
                    </th>
                    <td className="px-3 py-2.5">
                      <label className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                        <Switch checked={shown} onCheckedChange={(v) => setLevel(a, v ? "View" : "None")} aria-label={`Show ${a} in the menu`} />
                        {shown ? "Shown" : "Hidden"}
                      </label>
                    </td>
                    <td className="px-3 py-2.5">
                      <div role="radiogroup" aria-label={`Access to ${a}`} className="inline-flex overflow-hidden rounded-sm border border-input">
                        {ACCESS_LEVELS.map((l, i) => (
                          <button
                            key={l}
                            type="button"
                            role="radio"
                            aria-checked={l === lvl}
                            onClick={() => setLevel(a, l)}
                            className={cn("h-8 cursor-pointer whitespace-nowrap px-3 text-[0.8125rem]", i > 0 && "border-l border-input", l === lvl ? "bg-foreground font-medium text-background" : "bg-card hover:bg-background")}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {existing && (
        <Card>
          <CardHeader>
            <CardTitle>People with this role</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">{members.length}</span>
          </CardHeader>
          <ul className="grid sm:grid-cols-2">
            {members.slice(0, 10).map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-t border-rule-soft px-5 py-2.5">
                <Avatar name={p.name} size={28} />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.scope}</span>
                </span>
              </li>
            ))}
          </ul>
          {members.length > 10 && <p className="border-t border-rule-soft px-5 py-3 text-[0.8125rem] text-muted-foreground">And {members.length - 10} more. Change a person’s role in Users and access.</p>}
        </Card>
      )}

      {existing && !existing.system && members.length === 0 && (
        <Button variant="destructive" className="self-start" onClick={() => setConfirm(true)}>
          Delete role
        </Button>
      )}
      {existing && !existing.system && members.length > 0 && <p className="text-[0.8125rem] text-muted-foreground">Move its {members.length} people to another role before deleting it.</p>}
      {existing?.system && <p className="text-[0.8125rem] text-muted-foreground">Built-in roles can be changed but not deleted.</p>}
      <ConfirmRemove
        open={confirm}
        onOpenChange={setConfirm}
        kind="delete"
        name={role.name}
        onConfirm={() => {
          remove("roles", role.id)
          navigate("/settings/roles")
        }}
      />
    </>
  )
}
