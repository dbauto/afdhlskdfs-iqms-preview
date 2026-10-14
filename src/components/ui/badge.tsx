import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Status badges. Tone is the meaning, never decoration. */
const badgeVariants = cva(
  "inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] px-2 text-xs font-semibold [&_svg]:size-3",
  {
    variants: {
      tone: {
        done: "bg-done-tint text-done",
        progress: "bg-progress-tint text-progress",
        soon: "bg-soon-tint text-soon",
        overdue: "bg-overdue-tint text-overdue",
        draft: "bg-draft-tint text-draft",
        solid: "bg-foreground text-white",
        outline: "border border-input bg-card text-foreground",
      },
    },
    defaultVariants: { tone: "draft" },
  }
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
