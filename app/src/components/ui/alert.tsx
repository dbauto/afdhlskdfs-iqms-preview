import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TriangleAlertIcon, CircleCheckIcon, InfoIcon, OctagonAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva("flex items-start gap-3 rounded-md border px-4 py-3 text-sm leading-normal", {
  variants: {
    tone: {
      info: "border-[#cfd4f5] bg-progress-tint",
      warning: "border-[#f0ddb8] bg-soon-tint",
      danger: "border-[#f2c9c5] bg-overdue-tint",
      success: "border-[#c5e3d3] bg-done-tint",
    },
  },
  defaultVariants: { tone: "info" },
})

const ICON = {
  info: <InfoIcon className="mt-0.5 size-[18px] shrink-0 text-progress" />,
  warning: <TriangleAlertIcon className="mt-0.5 size-[18px] shrink-0 text-soon" />,
  danger: <OctagonAlertIcon className="mt-0.5 size-[18px] shrink-0 text-overdue" />,
  success: <CircleCheckIcon className="mt-0.5 size-[18px] shrink-0 text-done" />,
}

function Alert({
  className,
  tone = "info",
  title,
  children,
  action,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & { title?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn(alertVariants({ tone }), className)} {...props}>
      {ICON[tone ?? "info"]}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground">{children}</div>}
      </div>
      {action}
    </div>
  )
}

export { Alert }
