import * as React from "react"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const fieldBase =
  "w-full min-w-0 rounded-sm border border-input bg-card px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-faint focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_var(--accent)] focus-visible:outline-none aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_var(--overdue-tint)] disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldBase, "h-10", className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-24 py-2.5 leading-normal", className)} {...props} />
}

/** A real native select with an optional searchable option list.
 * The native control stays in the form so existing labels, validation, change
 * handlers, and permission checks continue to work unchanged.
 */
function NativeSelect({ className, children, onChange, disabled, ...props }: React.ComponentProps<"select">) {
  const selectRef = React.useRef<HTMLSelectElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [options, setOptions] = React.useState<{ value: string; label: string; disabled: boolean }[]>([])
  const choose = (value: string) => {
    const node = selectRef.current
    if (!node) return
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set
    setter?.call(node, value)
    node.dispatchEvent(new Event("change", { bubbles: true }))
    setOpen(false)
    setQuery("")
    node.focus()
  }
  React.useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const close = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open])
  const matches = options.filter(o => !o.disabled && (o.label + " " + o.value).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return (
    <div ref={wrapperRef} className="relative w-full min-w-0">
      <select ref={selectRef} data-slot="native-select"
        className={cn(fieldBase, "h-10 cursor-pointer appearance-none pr-16", className)}
        disabled={disabled} onChange={onChange} {...props}>
        {children}
      </select>
      {!disabled && (
        <button type="button" aria-label="Search dropdown options" aria-expanded={open}
          className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => {
            if (!open) setOptions(Array.from(selectRef.current?.options ?? [], option => ({ value: option.value, label: option.text, disabled: option.disabled })))
            setQuery("")
            setOpen(!open)
          }}>
          <SearchIcon className="size-4" />
        </button>
      )}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-0 rounded-md border bg-card p-2 shadow-md">
          <Input ref={searchRef} aria-label="Search options" placeholder="Type to find an option" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") { e.preventDefault(); setOpen(false) }
              if (e.key === "Enter" && matches.length) { e.preventDefault(); choose(matches[0].value) }
            }} />
          <div role="listbox" aria-label="Matching options" className="mt-2 max-h-56 overflow-y-auto">
            {matches.length ? matches.map((option, i) => (
              <button type="button" role="option" aria-selected={selectRef.current?.value === option.value}
                key={option.value + i} className="flex min-h-9 w-full cursor-pointer items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => choose(option.value)}>{option.label}</button>
            )) : <p className="p-3 text-sm text-muted-foreground">No matching options</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export { Input, Textarea, NativeSelect, fieldBase }
