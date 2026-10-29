import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AREAS } from "@/data/org"
import type { Area, Role } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts } from "@/components/app/page"
import { SettingsHeader } from "./layout"
import { LevelBadge, PermissionCards } from "./role-editor"

const GROUPS: { label: string; areas: Area[] }[] = [
  { label: "QMS", areas: ["Overview", "Organization & Scope", "Policies", "Processes", "Objectives & KPIs"] },
  { label: "Records", areas: ["Documents", "Risks & Opportunities", "Evidence"] },
  { label: "Check and improve", areas: ["Audits", "Management Review", "Corrective Action"] },
  { label: "Admin", areas: ["Settings"] },
]
const COLS: Area[] = GROUPS.flatMap((g) => g.areas).filter((a) => AREAS.includes(a))

export default function Roles() {
  const { state, update } = useStore()
  const count = (id: string) => state.people.filter((p) => p.roleId === id && p.status !== "Deactivated").length
  const [selectedId, setSelectedId] = React.useState(() => state.roles.find((r) => r.id === "top")?.id ?? state.roles[0]?.id)
  const saved = state.roles.find((r) => r.id === selectedId)
  const [draft, setDraft] = React.useState<Role | undefined>(saved)
  React.useEffect(() => setDraft(saved), [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved)
  const editorRef = React.useRef<HTMLDivElement>(null)

  function pick(id: string) {
    setSelectedId(id)
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  return (
    <>
      <SettingsHeader
        title="Roles and permissions"
        description="What each role sees in the menu and can do. Every page uses these rules, and buttons a person can’t use are hidden. Some roles only apply to the processes a person is assigned to."
      />
      <Card>
        <CardHeader>
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <CardTitle>All roles at a glance</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Every part of ThryveMS, grouped. Scroll sideways for the rest; role names stay put. Custom means some actions differ from the level.</span>
          </div>
          <Button asChild><Link to="/settings/roles/new"><PlusIcon /> Add role</Link></Button>
        </CardHeader>
        <div className="max-w-full overflow-x-auto border-t" role="region" aria-label="Role permissions matrix" tabIndex={0}>
          <table className="w-full min-w-[1400px] border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" rowSpan={2} className="sticky left-0 z-20 w-44 min-w-44 border-r border-rule-soft bg-card px-5 py-2 text-left align-bottom text-xs font-medium text-muted-foreground"><span className="sr-only">Roles</span></th>
                {GROUPS.map((g) => (
                  <th key={g.label || "top"} scope="colgroup" colSpan={g.areas.length} className={cn("px-3 pt-2.5 text-center text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground", g.label !== "QMS" && "border-l border-rule-soft")}>
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr>
                {COLS.map((a, i) => (
                  <th key={a} scope="col" className={cn("min-w-[104px] px-3 pb-2.5 pt-1 text-center text-xs font-medium text-muted-foreground", GROUPS.some((g) => g.areas[0] === a) && i > 0 && "border-l border-rule-soft")}>
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.roles.map((r) => {
                const on = r.id === selectedId
                const shown = on && draft ? draft : r
                return (
                  <tr key={r.id} onClick={() => pick(r.id)} className={cn("cursor-pointer border-t border-rule-soft hover:bg-secondary/60", on && "bg-accent/50")}>
                    <th scope="row" className={cn("sticky left-0 z-10 w-44 min-w-44 border-r border-rule-soft px-5 py-2.5 text-left align-middle font-normal", on ? "bg-accent" : "bg-card")}>
                      <button type="button" onClick={() => pick(r.id)} aria-pressed={on} aria-label={`Edit ${r.name} permissions`} className="flex w-full cursor-pointer flex-col items-start text-left">
                        <span className="text-[0.8125rem] font-semibold text-foreground">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{count(r.id)} {count(r.id) === 1 ? "person" : "people"}</span>
                      </button>
                    </th>
                    {COLS.map((a, i) => (
                      <td key={a} className={cn("px-3 py-2.5 text-center", GROUPS.some((g) => g.areas[0] === a) && i > 0 && "border-l border-rule-soft")}>
                        <span aria-label={`${r.name}, ${a}: ${shown.access[a]}`}>
                          <LevelBadge role={shown} part={a} />
                        </span>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-rule-soft px-5 py-2.5 text-xs text-muted-foreground">Scroll sideways for Check and improve and Admin. The role names stay in place. Select a role to change what it can do below.</p>
      </Card>

      {draft && saved && (
        <div ref={editorRef} className="flex scroll-mt-4 flex-col gap-4">
          <PermissionCards
            role={draft}
            setRole={setDraft as React.Dispatch<React.SetStateAction<Role>>}
            title={<>{draft.name} <span className="font-normal text-muted-foreground">· what they can do</span></>}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!dirty}
              onClick={() => {
                update("roles", draft.id, draft)
                toast(`${draft.name} saved`, { description: "Changes apply the next time people open a page." })
              }}
            >
              Save role
            </Button>
            <Button variant="outline" disabled={!dirty} onClick={() => setDraft(saved)}>Discard changes</Button>
            <Button variant="ghost" asChild><Link to={`/settings/roles/${draft.id}`}>Edit details</Link></Button>
            {dirty && <span className="text-[0.8125rem] text-muted-foreground">Unsaved changes</span>}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Applies to</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <KeyFacts facts={state.roles.map((r) => ({ k: r.name, v: r.scope }))} className="grid grid-cols-1 gap-x-6 sm:grid-cols-2" />
        </CardContent>
      </Card>
      <p className="text-[0.8125rem] text-muted-foreground">None hides the menu item. View shows records but no buttons. Edit lets people create and change records. Approve adds sign-off. Manage adds delete, archive and settings for that part. Parts with changed actions show Custom.</p>
    </>
  )
}
