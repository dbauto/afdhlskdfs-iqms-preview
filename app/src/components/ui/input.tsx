import * as React from "react"
import { CheckIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const fieldBase =
  "w-full min-w-0 rounded-sm border border-input bg-card px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-faint focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_var(--accent)] focus-visible:outline-none aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_var(--overdue-tint)] disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldBase, "h-10", className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-24 py-2.5 leading-normal", className)} {...props} />
}

type SelectOption = { value: string; label: string; disabled: boolean; selected: boolean }

/**
 * Retain the native select (and its form value, onChange, keyboard and Playwright contracts),
 * while offering keyword search on desktop and touch devices. Option lists are read from
 * the rendered select so dynamic PeopleOptions and optgroups are searched too.
 */
function NativeSelect({ className, children, disabled, multiple, ...props }: React.ComponentProps<"select">) {
  const select = React.useRef<HTMLSelectElement>(null)
  const search = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [options, setOptions] = React.useState<SelectOption[]>([])
  const [menuWidth, setMenuWidth] = React.useState(240)
  const shown = options.filter((o) => o.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) || o.value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))

  const onOpenChange = (next: boolean) => {
    if (next && select.current) {
      setOptions(Array.from(select.current.options, (o) => ({
        value: o.value,
        label: o.textContent?.trim() || o.value,
        disabled: o.disabled || Boolean(o.closest("optgroup[disabled]")),
        selected: o.selected,
      })))
      setMenuWidth(Math.min(select.current.getBoundingClientRect().width, window.innerWidth - 32))
      setQuery("")
    }
    setOpen(next)
    if (next) setTimeout(() => search.current?.focus(), 0)
  }
  const choose = (value: string) => {
    const el = select.current
    if (!el) return
    if (multiple) {
      const option = Array.from(el.options).find((o) => o.value === value)
      if (option && !option.disabled) option.selected = !option.selected
      setOptions((previous) => previous.map((o) => o.value === value ? { ...o, selected: !o.selected } : o))
    } else {
      el.value = value
      setOpen(false)
    }
    // React listens for the native change event on select; controlled form owners
    // continue to receive exactly the same value as from the native dropdown.
    el.dispatchEvent(new Event("change", { bubbles: true }))
    if (!multiple) el.focus()
  }

  return (
    <span className={cn("relative inline-flex min-w-0 max-w-full", className?.includes("w-auto") ? "w-auto" : "w-full")}>
      <select
        ref={select}
        data-slot="native-select"
        className={cn(fieldBase, "h-10 cursor-pointer appearance-none pr-12", className)}
        disabled={disabled}
        multiple={multiple}
        {...props}
      >
        {children}
      </select>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Search ${props["aria-label"] || "dropdown options"}`}
            title="Search options"
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SearchIcon className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          style={{ width: menuWidth }}
          className="flex max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height,22rem))] min-w-0 flex-col p-0"
        >
          <div className="flex items-center gap-2 border-b border-rule-soft px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation() }}
              placeholder="Type to find an option"
              aria-label="Search options"
              className="h-10 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            {shown.length === 0 && <p className="px-2.5 py-3 text-[0.8125rem] text-muted-foreground">No matching options.</p>}
            {shown.map((option, index) => (
              <DropdownMenuItem
                key={option.value + ":" + index}
                disabled={option.disabled}
                onSelect={(event) => { event.preventDefault(); choose(option.value) }}
                className="min-h-9 h-auto"
              >
                <span className="min-w-0 flex-1 break-words">{option.label}</span>
                {option.selected && <CheckIcon className="size-4 shrink-0 text-primary" aria-label="Selected" />}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}

export { Input, Textarea, NativeSelect, fieldBase }
