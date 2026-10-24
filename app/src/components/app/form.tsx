import * as React from "react"
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { Avatar } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { ISO_CLAUSES, clauseTitle } from "@/data/iso"

/** Label, control, help text and error, laid out the same way everywhere. */
export function Field({
  label,
  htmlFor,
  help,
  error,
  optional,
  children,
  className,
}: {
  label: React.ReactNode
  htmlFor?: string
  help?: React.ReactNode
  error?: string
  optional?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error ? <p className="text-[0.8125rem] text-destructive">{error}</p> : help ? <p className="text-[0.8125rem] leading-normal text-muted-foreground">{help}</p> : null}
    </div>
  )
}

export function FieldGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 flex flex-col gap-1">
        <span className="text-[0.9375rem] font-semibold">{title}</span>
        {description && <span className="text-[0.8125rem] leading-normal text-muted-foreground">{description}</span>}
      </legend>
      {children}
    </fieldset>
  )
}

/** One-of chips, for short choice lists like "Found by" */
export function ChipChoice<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o === value
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-[0.8125rem] font-medium",
              on ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:bg-background"
            )}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

/** Pick one or more people. Used for tasks, routes, reports, sharing. */
export function PeoplePicker({
  value,
  onChange,
  label,
  exclude = [],
  single,
  placeholder = "Choose people",
  searchable = true,
}: {
  value: string[]
  onChange: (v: string[]) => void
  label: string
  exclude?: string[]
  single?: boolean
  placeholder?: string
  /** search everyone in the workspace instead of showing a short list */
  searchable?: boolean
}) {
  const { state } = useStore()
  const [q, setQ] = React.useState("")
  const query = q.trim().toLowerCase()
  const active = state.people.filter((p) => p.status !== "Deactivated" && !exclude.includes(p.name))
  const people = searchable
    ? active.filter((p) => !query || `${p.name} ${p.title}`.toLowerCase().includes(query))
    : active.slice(0, 16)
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label}, chosen`}>
          {value.map((name) => (
            <li key={name} className="inline-flex h-8 items-center gap-2 rounded-full border bg-card pl-1 pr-1.5 text-[0.8125rem]">
              <Avatar name={name} size={24} />
              {name}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== name))} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove ${name}`}>
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-10 w-full cursor-pointer items-center justify-between rounded-sm border border-input bg-card px-3 text-left text-sm text-muted-foreground hover:bg-background" aria-label={label}>
          {single && value[0] ? "Change person" : placeholder}
          <ChevronDownIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
          <DropdownMenuLabel>{single ? "Choose one person" : "Choose one or more people"}</DropdownMenuLabel>
          {searchable && (
            <div className="px-2 pb-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search by name or job title"
                aria-label={`Search ${label.toLowerCase()}`}
                className="h-9 w-full rounded-sm border border-input bg-card px-2.5 text-sm outline-none"
              />
            </div>
          )}
          {searchable && people.length === 0 && <p className="px-2 py-1.5 text-[0.8125rem] text-muted-foreground">No one matches “{q.trim()}”.</p>}
          {people.map((p) => (
            <DropdownMenuCheckboxItem
              key={p.id}
              checked={value.includes(p.name)}
              onSelect={(e) => {
                if (!single) e.preventDefault()
              }}
              onCheckedChange={(on) => {
                if (single) onChange(on ? [p.name] : [])
                else onChange(on ? [...value, p.name] : value.filter((v) => v !== p.name))
              }}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{p.name}</span>
                <span className="truncate text-xs text-muted-foreground">{p.title}</span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Pick one or more processes. */
export function ProcessPicker({ value, onChange, label, id }: { value: string[]; onChange: (v: string[]) => void; label: string; id?: string }) {
  const { state } = useStore()
  const [query, setQuery] = React.useState("")
  const order = (name: string) => state.processes.findIndex((p) => p.name === name)
  const toggle = (name: string, on: boolean) => onChange((on ? [...value, name] : value.filter((v) => v !== name)).sort((a, b) => order(a) - order(b)))
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label}, chosen`}>
          {value.map((name) => (
            <li key={name} className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card pl-2.5 pr-1 text-[0.8125rem]">
              {name}
              <button type="button" onClick={() => toggle(name, false)} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove ${name}`}>
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger id={id} className="flex h-10 w-full cursor-pointer items-center justify-between rounded-sm border border-input bg-card px-3 text-left text-sm text-muted-foreground hover:bg-background" aria-label={label}>
          {value.length ? `${value.length} process${value.length > 1 ? "es" : ""} chosen` : "Choose processes"}
          <ChevronDownIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height,24rem))] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto overscroll-contain">
          <DropdownMenuLabel>Choose one or more processes</DropdownMenuLabel>
          <div className="px-2 pb-2"><input aria-label={`Search ${label.toLowerCase()}`} placeholder="Search processes" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} className="h-9 w-full rounded-sm border border-input bg-card px-2.5 text-sm outline-none" /></div>
          {state.processes.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase())).map((p) => (
            <DropdownMenuCheckboxItem key={p.id} checked={value.includes(p.name)} onSelect={(e) => e.preventDefault()} onCheckedChange={(on) => toggle(p.name, on === true)}>
              {p.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Process select options */
export function ProcessOptions() {
  const { state } = useStore()
  return (
    <>
      {state.processes.map((p) => (
        <option key={p.id} value={p.name}>
          {p.name}
        </option>
      ))}
    </>
  )
}

/** Active people as select options. Pass names to offer only those people (no cap). */
export function PeopleOptions({ names }: { names?: string[] } = {}) {
  const { state } = useStore()
  return (
    <>
      {state.people
        .filter((p) => p.status === "Active" && (!names || names.includes(p.name)))
        .slice(0, names ? undefined : 14)
        .map((p) => (
          <option key={p.id} value={p.name}>
            {p.name}
          </option>
        ))}
    </>
  )
}

/**
 * Pick one or more ISO 9001 clauses from the standard's list, with search.
 * Whole clauses (for example 5 Leadership) can be picked as well as sub-clauses.
 */
export function ClausePicker({
  value,
  onChange,
  label,
  id,
}: {
  value: string[]
  onChange: (v: string[]) => void
  label: string
  id?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)
  const query = q.trim().toLowerCase()
  const shown = query
    ? ISO_CLAUSES.filter((c) => c.no.startsWith(query) || c.title.toLowerCase().includes(query))
    : ISO_CLAUSES
  const order = (no: string) => ISO_CLAUSES.findIndex((c) => c.no === no)
  const toggle = (no: string, on: boolean) =>
    onChange((on ? [...value, no] : value.filter((v) => v !== no)).sort((a, b) => order(a) - order(b)))

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label}, chosen`}>
          {value.map((no) => (
            <li key={no} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border bg-card pl-2.5 pr-1 text-[0.8125rem]" title={clauseTitle(no)}>
              <span className="font-semibold">{no}</span>
              <span className="max-w-[180px] truncate text-muted-foreground">{clauseTitle(no)}</span>
              <button type="button" onClick={() => toggle(no, false)} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove clause ${no}`}>
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DropdownMenu
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (o) {
            setQ("")
            setTimeout(() => search.current?.focus(), 0)
          }
        }}
      >
        <DropdownMenuTrigger id={id} className="flex h-10 w-full cursor-pointer items-center justify-between rounded-sm border border-input bg-card px-3 text-left text-sm text-muted-foreground hover:bg-background" aria-label={label}>
          {value.length ? `${value.length} clause${value.length > 1 ? "s" : ""} chosen` : "Choose clauses"}
          <ChevronDownIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="flex max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height,24rem))] w-[var(--radix-dropdown-menu-trigger-width)] flex-col p-0">
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") e.stopPropagation()
              }}
              placeholder="Search by number or name, for example 8.4 or audit"
              aria-label="Search clauses"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            {shown.length === 0 && <p className="px-2.5 py-3 text-sm text-muted-foreground">No clause matches “{q}”.</p>}
            {shown.map((c) => {
              const level = c.no.split(".").length
              return (
                <DropdownMenuCheckboxItem
                  key={c.no}
                  checked={value.includes(c.no)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(on) => toggle(c.no, on === true)}
                  className={cn("h-auto min-h-9 py-1.5", !query && level === 1 && "mt-1 font-semibold", !query && level === 3 && "pl-12")}
                >
                  <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{c.no}</span>
                  <span className="min-w-0">{c.title}</span>
                </DropdownMenuCheckboxItem>
              )
            })}
          </div>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>{value.length} chosen</span>
            {value.length > 0 && (
              <button type="button" className="cursor-pointer font-medium text-primary" onClick={() => onChange([])}>
                Clear all
              </button>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** One setting: what it is and why on the left, the control on the right. Stacks on phones. */
export function SettingRow({ title, hint, children, htmlFor, first }: { title: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string; first?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6", !first && "border-t border-rule-soft")}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {title}
          </label>
        ) : (
          <span className="text-sm font-medium">{title}</span>
        )}
        {hint && <span className="text-[0.8125rem] leading-normal text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

/**
 * Pick evidence items, with search. Items for the given process are listed first.
 * Confidential items show their classification so people link them knowingly.
 */
export function EvidencePicker({ value, onChange, process, label = "Supporting evidence" }: { value: string[]; onChange: (v: string[]) => void; process?: string; label?: string }) {
  const { state, canSee } = useStore()
  const [q, setQ] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)
  const items = state.evidence.filter((e) => canSee(e.classification, [], e.addedBy))
  const query = q.trim().toLowerCase()
  const shown = items
    .filter((e) => !query || e.id.toLowerCase().includes(query) || e.title.toLowerCase().includes(query))
    .sort((a, b) => Number(!!process && b.processes.includes(process)) - Number(!!process && a.processes.includes(process)))
  const byId = (id: string) => state.evidence.find((e) => e.id === id)
  const toggle = (id: string, on: boolean) => onChange(on ? [...value, id] : value.filter((v) => v !== id))
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label={`${label}, chosen`}>
          {value.map((id) => (
            <li key={id} className="flex items-center gap-2 rounded-sm border bg-card px-2.5 py-1.5 text-[0.8125rem]">
              <span className="font-medium text-primary">{id}</span>
              <span className="flex-1 truncate">{byId(id)?.title ?? "Removed evidence"}</span>
              <button type="button" onClick={() => toggle(id, false)} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Unlink ${id}`}>
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DropdownMenu onOpenChange={(o) => { if (o) { setQ(""); setTimeout(() => search.current?.focus(), 0) } }}>
        <DropdownMenuTrigger className="flex h-10 w-full cursor-pointer items-center justify-between rounded-sm border border-input bg-card px-3 text-left text-sm text-muted-foreground hover:bg-background" aria-label={label}>
          {value.length ? `${value.length} linked, link more` : "Link evidence"}
          <ChevronDownIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="flex max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height,24rem))] w-[var(--radix-dropdown-menu-trigger-width)] flex-col p-0">
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key !== "Escape") e.stopPropagation() }} placeholder="Search by number or title" aria-label="Search evidence" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            {shown.length === 0 && <p className="px-2.5 py-3 text-sm text-muted-foreground">{items.length ? `No evidence matches “${q}”.` : "No evidence yet. Add it in Evidence first."}</p>}
            {shown.map((e) => (
              <DropdownMenuCheckboxItem key={e.id} checked={value.includes(e.id)} onSelect={(ev) => ev.preventDefault()} onCheckedChange={(on) => toggle(e.id, on === true)} className="h-auto min-h-9 py-1.5">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    <span className="text-muted-foreground">{e.id}</span> {e.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {e.processes.join(", ")}, {e.kind.toLowerCase()}
                    {e.classification !== "Internal" && e.classification !== "Public" ? `, ${e.classification.toLowerCase()}` : ""}
                  </span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Generic searchable multi-select for records (documents, nonconformities). */
export function RecordPicker({ value, onChange, options, label, empty = "Nothing to choose from." }: { value: string[]; onChange: (v: string[]) => void; options: { id: string; title: string; meta?: string }[]; label: string; empty?: string }) {
  const [q, setQ] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)
  const query = q.trim().toLowerCase()
  const shown = options.filter((o) => !query || o.id.toLowerCase().includes(query) || o.title.toLowerCase().includes(query))
  const title = (id: string) => options.find((o) => o.id === id)?.title
  const toggle = (id: string, on: boolean) => onChange(on ? [...value, id] : value.filter((v) => v !== id))
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label}, chosen`}>
          {value.map((id) => (
            <li key={id} className="flex h-7 items-center gap-1.5 rounded-full border bg-card pl-2.5 pr-1 text-[0.8125rem]" title={title(id)}>
              <span className="font-medium">{id}</span>
              <button type="button" onClick={() => toggle(id, false)} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove ${id}`}>
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DropdownMenu onOpenChange={(o) => { if (o) { setQ(""); setTimeout(() => search.current?.focus(), 0) } }}>
        <DropdownMenuTrigger className="flex h-10 w-full cursor-pointer items-center justify-between rounded-sm border border-input bg-card px-3 text-left text-sm text-muted-foreground hover:bg-background" aria-label={label}>
          {value.length ? `${value.length} chosen, add more` : `Choose ${label.toLowerCase()}`}
          <ChevronDownIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="flex max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height,22rem))] w-[var(--radix-dropdown-menu-trigger-width)] flex-col p-0">
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key !== "Escape") e.stopPropagation() }} placeholder="Search by number or title" aria-label={`Search ${label.toLowerCase()}`} className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            {shown.length === 0 && <p className="px-2.5 py-3 text-sm text-muted-foreground">{options.length ? `Nothing matches “${q}”.` : empty}</p>}
            {shown.map((o) => (
              <DropdownMenuCheckboxItem key={o.id} checked={value.includes(o.id)} onSelect={(ev) => ev.preventDefault()} onCheckedChange={(on) => toggle(o.id, on === true)} className="h-auto min-h-9 py-1.5">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate"><span className="text-muted-foreground">{o.id}</span> {o.title}</span>
                  {o.meta && <span className="truncate text-xs text-muted-foreground">{o.meta}</span>}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
