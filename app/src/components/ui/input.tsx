import * as React from "react"

import { cn } from "@/lib/utils"

const fieldBase =
  "w-full min-w-0 rounded-sm border border-input bg-card px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-[#8a93a1] focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_var(--accent)] focus-visible:outline-none aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_var(--overdue-tint)] disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldBase, "h-10", className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-24 py-2.5 leading-normal", className)} {...props} />
}

/** Native select, styled to match. Used for short option lists and rows per page. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        fieldBase,
        "h-10 cursor-pointer appearance-none pr-9",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { Input, Textarea, NativeSelect, fieldBase }
