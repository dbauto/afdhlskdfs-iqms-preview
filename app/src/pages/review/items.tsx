import * as React from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { isSafeUrl } from "@/lib/record-links"
import { todayIso } from "@/lib/periods"
import { REVIEW_ITEM_TYPES, type ReviewInput, type ReviewItem, type ReviewItemType } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { ChipChoice, Field, PeopleOptions, RecordPicker } from "@/components/app/form"
import { OutsideLink, RecordLink } from "@/components/app/record-link"
import { ITEM_KIND, reviewPeople } from "./shared"

/** A topic waiting to be added: its name, what it points at and who prepares it. */
export interface NewTopic {
  name: string
  item: ReviewItem
  preparedBy?: string
}

const NOUN: Record<ReviewItemType, string> = {
  Process: "process",
  Document: "document",
  Evidence: "evidence",
  Link: "link",
  "Objective or KPI": "objective or KPI",
  Risk: "risk",
  Nonconformity: "nonconformity",
  Audit: "audit",
  "Own topic": "topic",
}

/** The records of one type this person may see, for the picker. */
function useOptions(type: ReviewItemType) {
  const { state, canSee } = useStore()
  return React.useMemo((): { id: string; title: string; meta?: string }[] => {
    switch (type) {
      case "Process":
        return state.processes.map((p) => ({ id: p.id, title: p.name, meta: `Owner ${p.owner}` }))
      case "Document":
        return state.documents.filter((d) => canSee(d.classification, d.viewers, d.owner, [...d.reviewers, ...d.approvers])).map((d) => ({ id: d.id, title: d.title, meta: `${d.type}, revision ${d.rev} · ${d.process} · ${d.owner}` }))
      case "Evidence":
        return state.evidence.filter((e) => canSee(e.classification, [], e.addedBy)).map((e) => ({ id: e.id, title: e.title, meta: e.processes.join(", ") }))
      case "Objective or KPI":
        return state.objectives.map((o) => ({ id: o.id, title: o.name, meta: `${o.process} · ${o.owner}` }))
      case "Risk":
        return state.risks.map((r) => ({ id: r.id, title: r.title, meta: r.process }))
      case "Nonconformity":
        return state.ncs.map((n) => ({ id: n.id, title: n.title, meta: `${n.process} · ${n.owner}` }))
      case "Audit":
        return state.audits.map((a) => ({ id: a.id, title: `${a.process} audit`, meta: a.id }))
      default:
        return []
    }
  }, [type, state, canSee])
}

/** The record or link behind a topic added by hand, as a link people can open. */
export function TopicSource({ input, className }: { input: ReviewInput; className?: string }) {
  const it = input.item
  if (!it) return null
  if (it.type === "Link") return <OutsideLink url={it.url} label={input.name} className={className} />
  const kind = ITEM_KIND[it.type]
  if (kind && it.recordId) return <RecordLink kind={kind} id={it.recordId} className={className} />
  return null
}

/**
 * Add what top management wants to review: a record from ThryveMS, a link (with a name, so people know what it is
 * before opening it) or a topic in their own words. Used in Start a review and in Add to review; never in a dialog of its own.
 */
export function TopicAdder({ onAdd, defaultPreparer, exclude = [] }: { onAdd: (t: NewTopic[]) => void; defaultPreparer: string; exclude?: string[] }) {
  const { state, user } = useStore()
  const [type, setType] = React.useState<ReviewItemType>("Document")
  const [picked, setPicked] = React.useState<string[]>([])
  const [name, setName] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [why, setWhy] = React.useState("")
  const [prep, setPrep] = React.useState(defaultPreparer)
  const [error, setError] = React.useState("")
  const options = useOptions(type).filter((o) => !exclude.includes(o.id))
  const people = reviewPeople(state)
  React.useEffect(() => setPrep(defaultPreparer), [defaultPreparer])

  function reset(t = type) {
    setType(t)
    setPicked([])
    setName("")
    setUrl("")
    setWhy("")
    setError("")
  }

  function add() {
    const base = { addedBy: user.name, addedOn: todayIso(), why: why.trim() || undefined }
    if (type === "Link") {
      if (!name.trim()) return setError("Give the link a name, so top management knows what it is before opening it.")
      if (!isSafeUrl(url.trim())) return setError("Paste a full https:// link, for example from SharePoint’s Copy link.")
      onAdd([{ name: name.trim(), item: { ...base, type, url: url.trim() }, preparedBy: prep }])
    } else if (type === "Own topic") {
      if (!name.trim()) return setError("Write the topic in a few words.")
      onAdd([{ name: name.trim(), item: { ...base, type }, preparedBy: prep }])
    } else {
      if (!picked.length) return setError(`Choose at least one ${NOUN[type]}.`)
      onAdd(picked.map((id) => ({ name: options.find((o) => o.id === id)?.title ?? id, item: { ...base, type, recordId: id }, preparedBy: prep })))
    }
    reset()
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border bg-card p-4">
      <Field label="What is it?">
        <ChipChoice label="What is it?" options={REVIEW_ITEM_TYPES} value={type} onChange={(t) => reset(t)} />
      </Field>
      {type === "Link" || type === "Own topic" ? (
        <Field label={type === "Link" ? "Name" : "Topic"} htmlFor="ti-name" help={type === "Link" ? "Shown in the review instead of the address." : undefined} error={error && !name.trim() ? error : undefined}>
          <Input id="ti-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "Link" ? "Courier delivery report, August to October" : "Is our courier for Visayas still right for us?"} />
        </Field>
      ) : (
        <Field label={`Which ${NOUN[type]}`} error={error && !picked.length ? error : undefined} help={type === "Evidence" ? "Files are uploaded in Evidence, then chosen here." : undefined}>
          <RecordPicker label={`Choose ${NOUN[type]}`} value={picked} onChange={setPicked} options={options} empty={`No ${NOUN[type]} you can see yet.`} />
        </Field>
      )}
      {type === "Link" && (
        <Field label="Link" htmlFor="ti-url" error={error && name.trim() ? error : undefined}>
          <Input id="ti-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Field>
      )}
      <Field label="Why top management wants to look at it" htmlFor="ti-why" optional>
        <Textarea id="ti-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Check that contract review asks for the delivery lead time before an order is accepted." />
      </Field>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Prepared by" htmlFor="ti-prep" className="min-w-[220px] flex-1">
          <NativeSelect id="ti-prep" value={prep} onChange={(e) => setPrep(e.target.value)}>
            <PeopleOptions names={people} />
          </NativeSelect>
        </Field>
        <Button type="button" variant="outline" onClick={add}>
          <PlusIcon /> Add to review
        </Button>
      </div>
    </div>
  )
}

/** Topics chosen but not saved yet, with a way to take one out. */
export function PendingTopics({ topics, onRemove }: { topics: NewTopic[]; onRemove: (k: number) => void }) {
  if (!topics.length) return <p className="text-[0.8125rem] text-muted-foreground">Nothing added yet. Add at least one thing to review.</p>
  return (
    <ul className="flex flex-col gap-2">
      {topics.map((t, k) => (
        <li key={k} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5 text-sm">
          <Badge tone="draft">{t.item.type}</Badge>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">{t.name}</span>
            <span className="text-xs text-muted-foreground">{t.item.recordId ?? (t.item.url ? "Link" : "In your words")} · prepared by {t.preparedBy}</span>
          </span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${t.name}`} onClick={() => onRemove(k)}>
            <XIcon />
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Turn chosen topics into review inputs. */
export function toInputs(topics: NewTopic[], existing: ReviewInput[], nextRef: (all: ReviewInput[]) => string): ReviewInput[] {
  const out: ReviewInput[] = []
  for (const t of topics) {
    const ref = nextRef([...existing, ...out])
    out.push({ ref, name: t.name, source: t.item.type === "Link" ? "Outside ThryveMS" : t.item.type === "Own topic" ? "Top management" : t.item.type, item: t.item, handedTo: t.preparedBy })
  }
  return out
}
