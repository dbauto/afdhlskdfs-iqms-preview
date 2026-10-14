import * as React from "react"
import { ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { Avatar } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"

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
      {error ? <p className="text-[13px] text-destructive">{error}</p> : help ? <p className="text-[13px] leading-normal text-muted-foreground">{help}</p> : null}
    </div>
  )
}

export function FieldGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{title}</span>
        {description && <span className="text-[13px] leading-normal text-muted-foreground">{description}</span>}
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
              "inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-[13px] font-medium",
              on ? "border-foreground bg-foreground text-white" : "border-input bg-card hover:bg-background"
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
}: {
  value: string[]
  onChange: (v: string[]) => void
  label: string
  exclude?: string[]
  single?: boolean
  placeholder?: string
}) {
  const { state } = useStore()
  const people = state.people.filter((p) => p.status !== "Deactivated" && !exclude.includes(p.name)).slice(0, 16)
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label}, chosen`}>
          {value.map((name) => (
            <li key={name} className="inline-flex h-8 items-center gap-2 rounded-full border bg-card pl-1 pr-1.5 text-[13px]">
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

/** Process select options in the "05 Operations" form */
export function ProcessOptions() {
  const { state } = useStore()
  return (
    <>
      {state.processes.map((p) => (
        <option key={p.id} value={p.name}>
          {p.id} {p.name}
        </option>
      ))}
    </>
  )
}

export function PeopleOptions() {
  const { state } = useStore()
  return (
    <>
      {state.people
        .filter((p) => p.status === "Active")
        .slice(0, 14)
        .map((p) => (
          <option key={p.id} value={p.name}>
            {p.name}
          </option>
        ))}
    </>
  )
}
