import { cn } from "@/lib/utils"
import logo from "@/assets/thryvems-logo.png"
import logoDark from "@/assets/thryvems-logo-dark.png"
import mark from "@/assets/thryvems-mark.png"
import markDark from "@/assets/thryvems-mark-dark.png"

/**
 * Product identity, deliberately separate from a customer's white-label logo. The official ThryveMS logo with a
 * transparent background: forest green and teal on light surfaces, and a version whose green parts are light on
 * dark surfaces so it stays readable. `showName` shows the full logo; without it, the mark alone.
 */
export function ProductMark({ className, showName = true }: { className?: string; showName?: boolean; sidebar?: boolean }) {
  const [light, dark] = showName ? [logo, logoDark] : [mark, markDark]
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img src={light} alt="ThryveMS" className={cn("h-7 w-auto [.dark_&]:hidden", !showName && "h-8")} />
      <img src={dark} alt="ThryveMS" className={cn("hidden h-7 w-auto [.dark_&]:block", !showName && "h-8")} />
    </span>
  )
}
