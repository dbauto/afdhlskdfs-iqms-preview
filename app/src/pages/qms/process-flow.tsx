import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { DocRecord, IpoLink, Process } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, Textarea } from "@/components/ui/input"

/** Procedures and work instructions say how the work is done; forms and records are what it produces. */
export const HOW_TYPES = ["Procedure", "Work instruction"]
export const RECORD_TYPES = ["Form", "Record", "Register"]

type Column = IpoLink["column"]
const live = (d: DocRecord) => d.stage !== "Archived"
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean)

const COLUMNS: { key: Column; title: string; hint: string; link: string; placeholder: string }[] = [
  { key: "inputs", title: "Inputs", hint: "Describe what comes in and where from.", link: "Link input", placeholder: "Accepted orders from Sales, with quantity and due date" },
  { key: "activities", title: "Activities", hint: "Describe the main steps.", link: "Link activity", placeholder: "Plan the work, do it, check it" },
  { key: "outputs", title: "Outputs", hint: "Describe what goes out and to whom.", link: "Link output", placeholder: "Finished parts to Inspection & release" },
]

type Option = { kind: IpoLink["kind"]; ref: string; title: string; meta: string; to: string }

/** What each Link button offers. */
function useOptions(p: Process) {
  const { state } = useStore()
  const processes = state.processes.filter((x) => x.id !== p.id)
  const docs = state.documents.filter(live)
  const proc = (meta: string): Option[] => processes.map((x) => ({ kind: "Process", ref: x.id, title: x.name, meta, to: `/qms/processes/${x.id}` }))
  const doc = (types?: string[]): Option[] => docs.filter((d) => !types || types.includes(d.type)).map((d) => ({ kind: "Document", ref: d.id, title: `${d.id} ${d.title}`, meta: d.type, to: `/documents/${d.id}` }))
  const groups: Record<Column, { label: string; items: Option[] }[]> = {
    inputs: [
      { label: "Processes that feed this one", items: proc("Process") },
      { label: "Documents, such as specifications and standards", items: doc() },
    ],
    activities: [
      { label: "Procedures and work instructions", items: doc(HOW_TYPES) },
      { label: "Risks and opportunities", items: state.risks.filter((r) => r.process === p.name).map((r) => ({ kind: "Risk" as const, ref: r.id, title: `${r.id} ${r.title}`, meta: r.kind, to: `/risks/${r.id}` })) },
    ],
    outputs: [
      { label: "Processes that receive it", items: proc("Process") },
      { label: "Forms and records", items: doc(RECORD_TYPES) },
      { label: "Objectives & KPIs", items: state.objectives.filter((o) => o.process === p.name).map((o) => ({ kind: "Objective" as const, ref: o.id, title: o.name, meta: o.id, to: `/qms/objectives/${o.id}` })) },
    ],
  }
  const find = (kind: IpoLink["kind"], ref?: string) => Object.values(groups).flat().flatMap((g) => g.items).find((o) => o.kind === kind && o.ref === ref)
  return { groups, find }
}

/**
 * How the process works: Inputs, Activities and Outputs are each one description, with the records they
 * link to. A process linked under Outputs shows this process under its Inputs, and the other way round.
 */
export function ProcessFlow({ p }: { p: Process }) {
  const { state, update, can } = useStore()
  const canEdit = can("Processes", "Add and edit")
  const { groups, find } = useOptions(p)
  const [open, setOpen] = React.useState<Column>()
  // until someone links by hand, the process's own procedures and forms are linked for them
  const own: IpoLink[] =
    p.ipoLinks ??
    state.documents
      .filter((d) => live(d) && d.process === p.name && (HOW_TYPES.includes(d.type) || RECORD_TYPES.includes(d.type)))
      .map((d) => ({ id: `auto-${d.id}`, column: HOW_TYPES.includes(d.type) ? "activities" : "outputs", kind: "Document", ref: d.id }))
  // earlier inputs linked to another process's output, kept
  const legacy: (IpoLink & { fixed?: boolean })[] = (p.inputLinks ?? []).map((l) => (l.docId ? { id: l.id, column: "inputs", kind: "Document", ref: l.docId, fixed: true } : { id: l.id, column: "inputs", kind: "Outside", label: l.outside, fixed: true }))
  // processes that link this one: it receives their output, or it sends them its own
  const reverse = (col: Column): (IpoLink & { from: string })[] =>
    state.processes
      .filter((x) => x.id !== p.id)
      .flatMap((x) => (x.ipoLinks ?? []).filter((l) => l.kind === "Process" && l.ref === p.id && l.column === (col === "inputs" ? "outputs" : "inputs")).map((l) => ({ ...l, id: `${x.id}-${l.id}`, ref: x.id, from: x.name })))

  function save(col: Column, text: string) {
    if (text === p[col].join("\n")) return
    update("processes", p.id, { [col]: lines(text) })
  }
  function unlink(id: string) {
    update("processes", p.id, { ipoLinks: own.filter((l) => l.id !== id), inputLinks: (p.inputLinks ?? []).filter((l) => l.id !== id) })
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((c) => {
        const linked = [...(c.key === "inputs" ? legacy : []), ...own.filter((l) => l.column === c.key)]
        const back = reverse(c.key)
        return (
          <section key={c.key} aria-label={c.title} className="relative flex min-w-0 flex-col gap-2.5 rounded-md bg-background p-4">
            <span className="text-[0.8125rem] font-semibold">{c.title}</span>
            {canEdit ? (
              <Textarea
                key={p[c.key].join("\n")}
                aria-label={`${c.title} description`}
                defaultValue={p[c.key].join("\n")}
                placeholder={c.placeholder}
                onBlur={(e) => save(c.key, e.target.value)}
                className="min-h-28 bg-card text-[0.8125rem] leading-relaxed"
              />
            ) : p[c.key].length ? (
              <p className="whitespace-pre-line rounded-md border bg-card px-3 py-2 text-[0.8125rem] leading-relaxed">{p[c.key].join("\n")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Not described yet.</p>
            )}
            {canEdit && <span className="text-xs text-muted-foreground">{c.hint}</span>}
            {(linked.length > 0 || back.length > 0) && (
              <>
                <span className="mt-1 text-xs font-semibold">Linked</span>
                <ul className="flex flex-col gap-2">
                  {linked.map((l) => {
                    const o = find(l.kind, l.ref)
                    const doc = l.kind === "Document" ? state.documents.find((d) => d.id === l.ref) : undefined
                    const title = l.kind === "Outside" ? l.label : o?.title ?? (doc ? `${doc.id} ${doc.title}` : "Removed record")
                    const to = o?.to ?? (doc ? `/documents/${doc.id}` : undefined)
                    const meta = l.kind === "Outside" ? "From outside the company" : l.kind === "Process" ? (c.key === "outputs" ? "Process · receives this output" : "Process · its output feeds this one") : o?.meta ?? doc?.type ?? l.kind
                    return (
                      <li key={l.id} className="flex items-start gap-2 rounded-md border bg-card px-3 py-2">
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          {to ? <Link to={to} className="text-[0.8125rem] font-medium text-primary hover:underline">{title}</Link> : <span className="text-[0.8125rem] font-medium">{title}</span>}
                          <span className="text-xs text-muted-foreground">{meta}</span>
                        </span>
                        {canEdit && (
                          <button type="button" aria-label={`Unlink ${title}`} className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-hover hover:text-foreground" onClick={() => unlink(l.id)}>
                            <XIcon className="size-3.5" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                  {back.map((l) => (
                    <li key={l.id} className="flex flex-col gap-0.5 rounded-md border bg-card px-3 py-2">
                      <Link to={`/qms/processes/${l.ref}`} className="text-[0.8125rem] font-medium text-primary hover:underline">{l.from}</Link>
                      <span className="text-xs text-muted-foreground">{c.key === "inputs" ? "Process · sends its output here" : "Process · receives this output"} (linked on {l.from})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" className="self-start" aria-expanded={open === c.key} onClick={() => setOpen(open === c.key ? undefined : c.key)}>
                {c.link} <ChevronDownIcon />
              </Button>
            )}
            {open === c.key && (
              <LinkPicker
                groups={groups[c.key]}
                taken={new Set(linked.map((l) => `${l.kind}:${l.ref}`))}
                allowOutside={c.key === "inputs"}
                onClose={() => setOpen(undefined)}
                onLink={(picked, outside) => {
                  const add: IpoLink[] = picked.map((o, i) => ({ id: `ipo-${Date.now().toString(36)}${i}`, column: c.key, kind: o.kind, ref: o.ref }))
                  if (outside) add.push({ id: `ipo-${Date.now().toString(36)}o`, column: c.key, kind: "Outside", label: outside })
                  update("processes", p.id, { ipoLinks: [...own, ...add] })
                  toast(`${add.length} linked under ${c.title}`)
                  setOpen(undefined)
                }}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}

function LinkPicker({ groups, taken, allowOutside, onClose, onLink }: { groups: { label: string; items: Option[] }[]; taken: Set<string>; allowOutside: boolean; onClose: () => void; onLink: (picked: Option[], outside?: string) => void }) {
  const [q, setQ] = React.useState("")
  const [picked, setPicked] = React.useState<Option[]>([])
  const [outside, setOutside] = React.useState("")
  const key = (o: Option) => `${o.kind}:${o.ref}`
  const match = (o: Option) => !q || `${o.title} ${o.meta}`.toLowerCase().includes(q.toLowerCase())
  const n = picked.length + (outside.trim() ? 1 : 0)
  return (
    <div role="dialog" aria-label="Choose what to link" className="absolute left-3 right-3 top-full z-20 -mt-2 flex flex-col gap-2 rounded-lg border bg-popover p-3 text-popover-foreground shadow-[0_18px_48px_-18px_rgba(24,32,43,0.45)]" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <Input autoFocus aria-label="Search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-[0.8125rem]" />
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {groups.map((g) => {
          const items = g.items.filter((o) => !taken.has(key(o)) && match(o))
          return (
            <div key={g.label} className="flex flex-col">
              <span className="py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</span>
              {items.length === 0 ? (
                <span className="py-1 text-xs text-muted-foreground">Nothing to link</span>
              ) : (
                items.map((o) => {
                  const on = picked.some((x) => key(x) === key(o))
                  return (
                    <label key={key(o)} className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1.5 text-[0.8125rem] hover:bg-hover">
                      <Checkbox checked={on} onCheckedChange={() => setPicked(on ? picked.filter((x) => key(x) !== key(o)) : [...picked, o])} className="mt-0.5" />
                      <span className="flex min-w-0 flex-col"><span className="truncate">{o.title}</span><span className="text-xs text-muted-foreground">{o.meta}</span></span>
                    </label>
                  )
                })
              )}
            </div>
          )
        })}
        {allowOutside && (
          <div className="flex flex-col gap-1">
            <span className="py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">From outside the company</span>
            <Input aria-label="Something from outside" placeholder="Customer drawings" value={outside} onChange={(e) => setOutside(e.target.value)} className="h-8 text-[0.8125rem]" />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={n === 0} onClick={() => onLink(picked, outside.trim() || undefined)}>{n ? `Link ${n}` : "Link"}</Button>
      </div>
    </div>
  )
}
