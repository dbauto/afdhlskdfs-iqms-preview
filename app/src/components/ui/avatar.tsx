import * as React from "react"

import { cn, initials } from "@/lib/utils"
import { useOptionalStore } from "@/lib/store"

function Avatar({
  name,
  size = 32,
  tone = "neutral",
  className,
  src,
  ...props
}: React.ComponentProps<"span"> & { name: string; size?: number; tone?: "neutral" | "accent" | "dark"; src?: string }) {
  // the person's photo when they have one; initials otherwise, or when it can't load
  const store = useOptionalStore()
  const photo = src ?? store?.state.people.find((p) => p.name === name)?.photo
  const url = typeof photo === "string" ? photo : photo?.source === "upload" ? photo.url : undefined
  const [broken, setBroken] = React.useState(false)
  React.useEffect(() => setBroken(false), [url])
  if (url && !broken)
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        onError={() => setBroken(true)}
        className={cn("inline-block shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    )
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
