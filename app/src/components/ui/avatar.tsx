import * as React from "react"

import { cn, initials } from "@/lib/utils"

function Avatar({
  name,
  size = 32,
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { name: string; size?: number; tone?: "neutral" | "accent" | "dark" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        tone === "neutral" && "bg-secondary text-foreground",
        tone === "accent" && "bg-accent text-primary",
        tone === "dark" && "bg-console-raised text-white",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      {...props}
    >
      {initials(name)}
    </span>
  )
}

export { Avatar }
