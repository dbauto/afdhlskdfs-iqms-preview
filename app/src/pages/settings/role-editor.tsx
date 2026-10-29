import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
export { isCustom, LevelBadge }
import { AREAS } from "@/data/org"
import { ACCESS_LEVELS, type AccessLevel, type Area, type Role } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ConfirmRemove } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"
import { SETTINGS, SettingsHeader } from "./layout"
import { ACTIONS, ACTION_AREAS, allows, defaultSettingsAccess, levelDefault } from "@/lib/permissions"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

const SUB: Area[] = ["Organization & Scope", "Policies", "Processes", "Objectives & KPIs"]
const PARTS: string[] = [...AREAS, "Remarks"]

/** some actions in this part differ from what its level would give */
function isCustom(role: Role, part: string) {
  return ACTIONS.some((x) => x.area === part && role.actions?.[x.key] !== undefined && role.actions[x.key] !== levelDefault(role, x.key))
}

function LevelBadge({ role, part }: { role: Role; part: string }) {
  if (part === "Remarks") return <span className="text-xs text-muted-foreground">{ACTIONS.filter((x) => x.area === "Remarks" && allows(role, x.key)).length ? "On" : "Off"}</span>
  const l = role.access[part as Area]
  if (isCustom(role, part)) return <Badge tone="progress">Custom</Badge>
  return <Badge tone={l === "Manage" ? "done" : l === "Approve" ? "soon" : l === "Add and edit" ? "progress" : "draft"}>{l === "Add and edit" ? "Edit" : l}</Badge>
}
const BLANK: Record<Area, AccessLevel> = Object.fromEntries(AREAS.map((a) => [a, a === "Overview" ? "View" : "None"])) as Record<Area, AccessLevel>

/** parts, actions, settings pages and role limits; used on the roles page and the role editor */
export function PermissionCards({ role, setRole, title }: { role: Role; setRole: React.Dispatch<React.SetStateAction<Role>>; title?: React.ReactNode }) {
  const { moduleOn } = useStore()
  const [part, setPart] = React.useState<string>(PARTS[0])
  // choosing a level ticks its actions again
  const setLevel = (a: Area, l: AccessLevel) => setRole((r) => ({ ...r, access: { ...r.access, [a]: l }, actions: Object.fromEntries(Object.entries(r.actions ?? {}).filter(([k]) => ACTIONS.find((x) => x.key === k)?.area !== a)) }))
  const setAction = (key: string, v: boolean) =>
    setRole((r) => {
      if (key === "readiness.see") return { ...r, seesReadiness: v, actions: { ...r.actions, [key]: v } }
      if (key === "docs.confidential") return { ...r, confidentialRead: v, actions: { ...r.actions, [key]: v } }
      return { ...r, actions: { ...r.actions, [key]: v } }
    })
  const settingsOn = (to: string, need: "admin" | "quality" | "all") => (role.settingsPages?.length ? role.settingsPages.includes(to) : defaultSettingsAccess(role, need))
  const setSettingsPage = (to: string, v: boolean) =>
    setRole((r) => {
      const now = SETTINGS.flatMap((g) => g.items).filter((i) => i.need !== "all" && (r.settingsPages?.length ? r.settingsPages.includes(i.to) : defaultSettingsAccess(r, i.need))).map((i) => i.to)
      return { ...r, settingsPages: v ? [...new Set([...now, to])] : now.filter((x) => x !== to).concat(now.length === 1 && !v ? ["none"] : []) }
    })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{title ?? "What people with this role can do"}</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Pick a part; choose its level, then switch single actions on or off. Choosing a level ticks its actions; changing an action makes it Custom.</span>
          </div>
        </CardHeader>
        <div className="grid border-t md:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Parts of ThryveMS" className="flex flex-col gap-0.5 border-b p-2.5 md:border-b-0 md:border-r">
            {PARTS.map((a) => {
              const on = part === a
              return (
                <button key={a} type="button" aria-current={on ? "true" : undefined} onClick={() => setPart(a)} className={cn("flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-secondary", on && "bg-accent font-semibold")}>
                  <span className={cn("min-w-0 flex-1", SUB.includes(a as Area) && "pl-3")}>{a}</span>
                  <LevelBadge role={role} part={a} />
                </button>
              )
            })}
          </nav>
          <div className="flex min-w-0 flex-col gap-3 p-5">
            <h3 className="text-[0.9375rem] font-semibold">{part}</h3>
            {part !== "Remarks" && !moduleOn(part as Area) ? (
              <p className="text-[0.8125rem] text-muted-foreground">Not in your ThryveMS plan or setup, so no one sees it.</p>
            ) : (
              <>
                {part !== "Remarks" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div role="radiogroup" aria-label={`Access to ${part}`} className="inline-flex flex-wrap overflow-hidden rounded-sm border border-input">
                      {ACCESS_LEVELS.map((l, i) => (
                        <button key={l} type="button" role="radio" aria-checked={l === role.access[part as Area]} onClick={() => setLevel(part as Area, l)} className={cn("h-8 cursor-pointer whitespace-nowrap px-3 text-[0.8125rem]", i > 0 && "border-l border-input", l === role.access[part as Area] ? "bg-foreground font-medium text-background" : "bg-card hover:bg-background")}>
                          {l}
                        </button>
                      ))}
                    </div>
                    {isCustom(role, part) && <Badge tone="progress">Custom</Badge>}
                    <span className="text-xs text-muted-foreground">{role.access[part as Area] === "None" ? "Hidden from the menu" : "Shown in the menu"}</span>
                  </div>
                )}
                <ul className="flex flex-col">
                  {ACTIONS.filter((x) => x.area === part).map((x) => {
                    const on = allows(role, x.key)
                    return (
                      <li key={x.key} className="flex items-start gap-3 border-t border-rule-soft py-3 first:border-t-0">
                        <Switch checked={on} onCheckedChange={(v) => setAction(x.key, !!v)} aria-label={x.label} className="mt-0.5" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium">{x.label}</span>
                          {x.help && <span className="text-[0.8125rem] text-muted-foreground">{x.help}</span>}
                        </span>
                      </li>
                    )
                  })}
                  {!ACTIONS.some((x) => x.area === part) && <li className="text-[0.8125rem] text-muted-foreground">The level decides everything here: View shows records, Add and edit lets people create and change them, Approve adds sign-off, Manage adds delete and archive.</li>}
                </ul>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>Settings this role can open</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">One tick per settings page. Pages everyone sees, such as Profile and Notifications, aren’t listed.</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {SETTINGS.flatMap((g) => g.items).filter((i) => i.need !== "all").map((i) => {
              const on = settingsOn(i.to, i.need)
              return (
                <li key={i.to} className="border-t border-rule-soft py-2">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox checked={on} onCheckedChange={(v) => setSettingsPage(i.to, !!v)} />
                    {i.label}
                  </label>
                </li>
              )
            })}
          </ul>
          <Field label="Can give people roles" htmlFor="rl-assign" help="Nobody can give a role with more access than their own in any part, so only Administrators can make Administrators.">
            <NativeSelect id="rl-assign" value={role.assignUpTo ?? "own"} onChange={(e) => setRole({ ...role, assignUpTo: e.target.value as Role["assignUpTo"] })}>
              <option value="own">Up to their own access, if they can open Users and access</option>
              <option value="none">Nobody (can’t give roles)</option>
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

    </>
  )
}

export default function RoleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, add, update, remove } = useStore()
  const existing = state.roles.find((r) => r.id === id)
  const [role, setRole] = React.useState<Role>(() => existing ?? { id: `role-${Date.now()}`, name: "", purpose: "", scope: "Processes they are assigned to", access: BLANK })
  const [confirm, setConfirm] = React.useState(false)
  const [error, setError] = React.useState("")
  const members = state.people.filter((p) => p.roleId === role.id && p.status !== "Deactivated")

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
        </CardContent>
      </Card>

      <PermissionCards role={role} setRole={setRole} />

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
