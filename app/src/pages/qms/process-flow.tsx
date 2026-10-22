import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/periods"
import type { DocRecord, InputLink, Process } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field } from "@/components/app/form"

/** Procedures and work instructions say how the work is done; forms and records are what it produces. */
export const HOW_TYPES = ["Procedure", "Work instruction"]
export const RECORD_TYPES = ["Form", "Record", "Register"]

const live = (d: DocRecord) => d.stage !== "Archived"

/** The latest evidence recorded against a form or record. */
function useLatest() {
  const { state } = useStore()
  return (docId: string) =>
    state.evidence
      .filter((e) => e.usedIn?.includes(docId) && e.addedDate)
      .map((e) => e.addedDate!)
      .sort()
      .at(-1)
}

function DocChip({ d, note }: { d: DocRecord; note?: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md border bg-card px-3 py-2">
      <Link to={`/documents/${d.id}`} className="text-sm font-medium hover:text-primary hover:underline">
        {d.title}
      </Link>
      <span className="text-xs text-muted-foreground">
        {d.id} · {d.type}
        {note ? <> · {note}</> : null}
      </span>
    </li>
  )
}

/**
 * How the process works, filled from the documents: procedures and work instructions under Activities,
 * this process's forms and records under Outputs, and inputs linked to the processes that send them.
 */
export function ProcessFlow({ p }: { p: Process }) {
  const { state, update, can } = useStore()
  const latest = useLatest()
  const [adding, setAdding] = React.useState(false)
  const canEdit = can("Processes", "Add and edit")
  const docs = state.documents.filter((d) => live(d) && d.process === p.name)
  const how = docs.filter((d) => HOW_TYPES.includes(d.type))
  const made = docs.filter((d) => RECORD_TYPES.includes(d.type))
  const links = p.inputLinks ?? []
  // who receives each of this process's outputs
  const goesTo = (docId: string) => state.processes.filter((x) => x.id !== p.id && x.inputLinks?.some((l) => l.docId === docId)).map((x) => x.name)

  const column = (title: string, hint: string, children: React.ReactNode, steps: string[]) => (
    <div className="flex min-w-0 flex-col gap-3 rounded-md bg-background p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.8125rem] font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      {steps.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
          {steps.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {children}
    </div>
  )

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {column(
          "Inputs",
          "From the processes that feed this one, or from outside",
          <>
            {links.length > 0 && (
              <ul className="flex flex-col gap-2">
                {links.map((l) => {
                  const d = l.docId ? state.documents.find((x) => x.id === l.docId) : undefined
                  const from = state.processes.find((x) => x.id === l.fromProcess)
                  return (
                    <li key={l.id} className="flex items-start gap-2 rounded-md border bg-card px-3 py-2">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        {d ? (
                          <Link to={`/documents/${d.id}`} className="text-sm font-medium hover:text-primary hover:underline">{d.title}</Link>
                        ) : (
                          <span className="text-sm font-medium">{l.outside ?? "Removed document"}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{from ? `Output of ${from.name}` : "From outside the company"}</span>
                      </span>
                      {canEdit && (
                        <button type="button" aria-label="Remove this input" className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-hover hover:text-foreground" onClick={() => update("processes", p.id, { inputLinks: links.filter((x) => x.id !== l.id) })}>
                          <XIcon className="size-3.5" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)}>
                <PlusIcon /> Add input
              </Button>
            )}
          </>,
          p.inputs
        )}
        {column(
          "Activities",
          "The steps, and the procedures and work instructions for them",
          how.length ? <ul className="flex flex-col gap-2">{how.map((d) => <DocChip key={d.id} d={d} />)}</ul> : <p className="text-xs text-muted-foreground">No procedures or work instructions for this process. That’s fine where trained staff don’t need one.</p>,
          p.activities
        )}
        {column(
          "Outputs",
          "This process’s forms and records",
          made.length ? (
            <ul className="flex flex-col gap-2">
              {made.map((d) => {
                const last = latest(d.id)
                const to = goesTo(d.id)
                return <DocChip key={d.id} d={d} note={<>{last ? `latest record ${formatDate(last)}` : "no records yet"}{to.length ? ` · goes to ${to.join(", ")}` : ""}</>} />
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No forms or records for this process yet.</p>
          ),
          p.outputs
        )}
      </div>
      <AddInputDialog open={adding} onOpenChange={setAdding} p={p} />
    </>
  )
}

function AddInputDialog({ open, onOpenChange, p }: { open: boolean; onOpenChange: (v: boolean) => void; p: Process }) {
  const { state, update } = useStore()
  const others = state.processes.filter((x) => x.id !== p.id)
  const [source, setSource] = React.useState<"process" | "outside">("process")
  const [from, setFrom] = React.useState(others[0]?.id ?? "")
  const [doc, setDoc] = React.useState("")
  const [outside, setOutside] = React.useState("")
  const [error, setError] = React.useState("")
  const fromName = others.find((x) => x.id === from)?.name
  const outputs = state.documents.filter((d) => live(d) && d.process === fromName && RECORD_TYPES.includes(d.type))
  React.useEffect(() => {
    if (open) {
      setSource("process")
      setFrom(others[0]?.id ?? "")
      setOutside("")
      setError("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  React.useEffect(() => setDoc(outputs[0]?.id ?? ""), [from]) // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    const links = p.inputLinks ?? []
    let link: InputLink
    if (source === "process") {
      if (!doc) return setError("Choose one of that process’s outputs. If it has none yet, add its form or record in Documents first.")
      if (links.some((l) => l.docId === doc)) return setError("That output is already an input here.")
      link = { id: `in-${Date.now()}`, fromProcess: from, docId: doc }
    } else {
      if (!outside.trim()) return setError("Say what comes in, such as customer drawings.")
      link = { id: `in-${Date.now()}`, outside: outside.trim() }
    }
    update("processes", p.id, { inputLinks: [...links, link] })
    toast("Input added", { description: source === "process" ? `${fromName} shows it goes to ${p.name}.` : undefined })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add input to {p.name}</DialogTitle>
          <DialogDescription>Where does it come from? Linking to another process’s output keeps both sides in step.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Where it comes from" className="grid gap-2 sm:grid-cols-2">
          {([
            ["process", "Another process", "Links to one of its outputs"],
            ["outside", "Outside the company", "Customer, supplier, regulator"],
          ] as const).map(([v, label, hint]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={source === v}
              onClick={() => setSource(v)}
              className={cn("flex cursor-pointer flex-col items-start gap-0.5 rounded-md border bg-card p-3 text-left hover:bg-hover", source === v && "border-primary ring-1 ring-primary")}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
        {source === "process" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="in-p">
              <NativeSelect id="in-p" value={from} onChange={(e) => setFrom(e.target.value)}>
                {others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Its output" htmlFor="in-d" error={error}>
              <NativeSelect id="in-d" value={doc} onChange={(e) => setDoc(e.target.value)} disabled={!outputs.length}>
                {outputs.length ? outputs.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.id})</option>) : <option value="">No forms or records yet</option>}
              </NativeSelect>
            </Field>
          </div>
        ) : (
          <Field label="What comes in" htmlFor="in-o" error={error}>
            <Input id="in-o" value={outside} onChange={(e) => setOutside(e.target.value)} placeholder="Customer drawings" />
          </Field>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Add input</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
