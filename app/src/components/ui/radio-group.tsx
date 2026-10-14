import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#8a93a1] bg-card data-[state=checked]:border-primary",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="block size-2.5 rounded-full bg-primary" />
    </RadioGroupPrimitive.Item>
  )
}

/**
 * A choice card: a radio with a title and a line of help, used for
 * classification, severity, document kind and similar one-of choices.
 */
function RadioCard({
  value,
  title,
  help,
  icon,
  className,
}: {
  value: string
  title: string
  help?: string
  icon?: React.ReactNode
  className?: string
}) {
  const id = React.useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-input bg-card p-3.5 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-[#f6f7fd]",
        className
      )}
    >
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          {icon}
        </span>
        {help && <span className="text-[13px] leading-normal text-muted-foreground">{help}</span>}
      </span>
    </label>
  )
}

export { RadioGroup, RadioGroupItem, RadioCard }
