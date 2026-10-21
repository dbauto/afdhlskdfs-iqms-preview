import { ContentLink as Link } from "@/components/app/content-link"
import { CheckIcon, PlusIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { AREAS } from "@/data/org"
import { ACCESS_LEVELS } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts } from "@/components/app/page"
import { SettingsHeader } from "./layout"

const LEVEL_TONE = ["", "text-muted-foreground", "text-foreground", "text-primary", "text-done"]

export default function Roles() {
  const { state } = useStore()
  const count = (id: string) => state.people.filter((p) => p.roleId === id && p.status !== "Deactivated").length

  return (
    <>
      <SettingsHeader
        title="Roles and permissions"
        description="What each role sees in the menu and can do. Every page uses these rules, and buttons a person can’t use are hidden. Some roles only apply to the processes a person is assigned to."
        actions={
          <Button asChild><Link to="/settings/roles/new"><PlusIcon /> Add role</Link></Button>
        }
      />
      <Card>
        <div className="max-w-full overflow-x-auto" role="region" aria-label="Role permissions matrix" tabIndex={0}>
          <table className="w-full min-w-[1600px] border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-20 w-48 min-w-48 border-r border-rule-soft bg-card px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">
                  Roles
                </th>
                {AREAS.map((a) => (
                  <th key={a} scope="col" className="min-w-[108px] px-3 py-3.5 text-center text-xs font-medium text-muted-foreground">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.roles.map((r) => (
                <tr key={r.id} className="border-t border-rule-soft">
                  <th scope="row" className="sticky left-0 z-10 w-48 min-w-48 border-r border-rule-soft bg-card px-5 py-3 text-left align-top font-normal">
                    <span className="flex flex-col items-start gap-1.5">
                      <span className="text-[0.8125rem] font-semibold text-foreground">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{count(r.id)} people</span>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/settings/roles/${r.id}`} aria-label={`Edit ${r.name} permissions`}>
                          Edit permissions
                        </Link>
                      </Button>
                    </span>
                  </th>
                  {AREAS.map((a) => {
                    const lvl = r.access[a]
                    const i = ACCESS_LEVELS.indexOf(lvl)
                    return (
                      <td key={a} className="px-3 py-3 text-center">
                        {lvl === "None" ? (
                          <span className="inline-block h-0.5 w-3 rounded-full bg-input align-middle" aria-label="Hidden" />
                        ) : (
                          <span className={`text-[0.8125rem] ${LEVEL_TONE[i]}`}>
                            {lvl === "Manage" ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckIcon className="size-3.5" /> Manage
                              </span>
                            ) : (
                              lvl
                            )}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Applies to</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <KeyFacts
            facts={state.roles.map((r) => ({ k: r.name, v: r.scope }))}
            className="grid grid-cols-1 gap-x-6 sm:grid-cols-2"
          />
        </CardContent>
      </Card>
      <p className="text-[0.8125rem] text-muted-foreground">None hides the menu item. View shows records but no buttons. Add and edit lets people create and change records. Approve adds sign-off. Manage adds delete, archive and settings for that part.</p>
    </>
  )
}
