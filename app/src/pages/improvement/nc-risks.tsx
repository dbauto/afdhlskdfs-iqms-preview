/**
 * ISO 9001 clause 10.2.1 e): when a nonconformity happens, update the risks and opportunities
 * determined during planning, if necessary. A nonconformity is something that went wrong;
 * a risk is something that might. They stay in their own registers and are linked here.
 */
import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CheckIcon, ChevronDownIcon, LinkIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Nonconformity } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { riskLevel } from "@/components/app/status"
import { RiskSheet } from "@/pages/risks/register"

export function NcRisks({ nc, onLog }: { nc: Nonconformity; onLog: (what: string) => void }) {
  const { state, update, user, can } = useStore()
  const canSeeRisks = can("Risks & Opportunities")
  const canEdit = can("Corrective Action", "Add and edit")
  const canAddRisk = can("Risks & Opportunities", "Add and edit")
  const [adding, setAdding] = React.useState(false)
  const [noChange, setNoChange] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [q, setQ] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)

  if (!canSeeRisks) return null
  const linked = (nc.risks ?? []).map((id) => ({ id, r: state.risks.find((x) => x.id === id) }))
  const setRisks = (ids: string[]) => update("ncs", nc.id, { risks: ids, riskCheck: ids.length ? undefined : nc.riskCheck })
  const query = q.trim().toLowerCase()
  const options = state.risks
    .filter((r) => r.treatment !== "Closed")
    .filter((r) => !query || r.id.toLowerCase().includes(query) || r.title.toLowerCase().includes(query))
    .sort((a, b) => Number(b.process === nc.process) - Number(a.process === nc.process))

  const status = linked.length ? (
    <Badge tone="done">Register updated</Badge>
  ) : nc.riskCheck ? (
    <Badge tone="draft">No change needed</Badge>
  ) : (
    <Badge tone="soon">Not checked yet</Badge>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risks and opportunities</CardTitle>
        {status}
      </CardHeader>
      <p className="px-5 pb-3 text-[0.8125rem] leading-normal text-muted-foreground">
        Did this show a risk you hadn’t planned for, or one rated too low? Link it or add it. ISO 9001 clause 10.2.1 e).
      </p>
      <ul className="border-t border-rule-soft">
        {linked.map(({ id, r }) => {
          const lvl = r && riskLevel(r)
          return (
            <li key={id} className="flex items-start gap-3 border-b border-rule-soft px-5 py-3 last:border-b-0">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link to="/risks" className="text-[0.8125rem] font-medium text-primary hover:underline">
                  {id}
                </Link>
                <span className="text-sm">{r?.title ?? "This risk was removed"}</span>
                {r && <span className="text-xs text-muted-foreground">{r.process}, {r.treatment.toLowerCase()}</span>}
              </span>
              {lvl && <Badge tone={lvl.tone}>{lvl.score} {lvl.label}</Badge>}
              {canEdit && (
                <button type="button" onClick={() => { setRisks((nc.risks ?? []).filter((x) => x !== id)); onLog(`unlinked risk ${id}`) }} className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Unlink ${id}`}>
                  <XIcon className="size-3.5" />
                </button>
              )}
            </li>
          )
        })}
        {!linked.length && nc.riskCheck && (
          <li className="flex flex-col gap-0.5 px-5 py-3">
            <span className="text-sm">{nc.riskCheck.note}</span>
            <span className="text-xs text-muted-foreground">
              Checked by {nc.riskCheck.by}, {nc.riskCheck.when}
            </span>
          </li>
        )}
      </ul>
      {canEdit && (
        <div className="flex flex-wrap gap-2 border-t px-5 py-3">
          <DropdownMenu onOpenChange={(o) => { if (o) { setQ(""); setTimeout(() => search.current?.focus(), 0) } }}>
            <DropdownMenuTrigger className={buttonVariants({ size: "sm", variant: "outline" })}>
              <LinkIcon /> Link a risk <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="flex max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height,22rem))] w-80 flex-col p-0">
              <div className="flex items-center gap-2 border-b px-3">
                <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key !== "Escape") e.stopPropagation() }} placeholder="Search risks" aria-label="Search risks" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
                {options.length === 0 && <p className="px-2.5 py-3 text-sm text-muted-foreground">No risks match.</p>}
                {options.map((r) => (
                  <DropdownMenuCheckboxItem
                    key={r.id}
                    checked={(nc.risks ?? []).includes(r.id)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) => {
                      const cur = nc.risks ?? []
                      setRisks(on ? [...cur, r.id] : cur.filter((x) => x !== r.id))
                      onLog(on ? `linked risk ${r.id}` : `unlinked risk ${r.id}`)
                    }}
                    className="h-auto min-h-9 py-1.5"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate"><span className="text-muted-foreground">{r.id}</span> {r.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{r.process}{r.process === nc.process ? ", same process" : ""}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {canAddRisk && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <PlusIcon /> Add new risk
            </Button>
          )}
          {!linked.length && !nc.riskCheck && (
            <Button size="sm" variant="ghost" onClick={() => { setNote(""); setNoChange(true) }}>
              <CheckIcon /> No change needed
            </Button>
          )}
        </div>
      )}

      <RiskSheet
        open={adding}
        onOpenChange={setAdding}
        defaultProcess={nc.process}
        defaultSource={`Nonconformity ${nc.id}`}
        defaultTitle={nc.title}
        onCreated={(id) => {
          setRisks([...(nc.risks ?? []), id])
          onLog(`added risk ${id} to the register`)
        }}
      />

      <Dialog open={noChange} onOpenChange={setNoChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No change to the risk register</DialogTitle>
            <DialogDescription>Say why, so an auditor can see the register was checked. ISO 9001 clause 10.2.1 e).</DialogDescription>
          </DialogHeader>
          <Field label="Why no change is needed" htmlFor="rk-note">
            <Textarea id="rk-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Already covered by R-012, and the rating is still right" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!note.trim()}
              onClick={() => {
                update("ncs", nc.id, { riskCheck: { note: note.trim(), by: user.name, when: "Today" } })
                onLog("checked the risk register, no change needed")
                toast("Risk check recorded")
                setNoChange(false)
              }}
            >
              Record check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
