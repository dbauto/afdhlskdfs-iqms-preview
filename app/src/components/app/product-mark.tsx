import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import logo from "@/assets/thryvems-logo.png"
import logoDark from "@/assets/thryvems-logo-dark.png"
import mark from "@/assets/thryvems-mark.png"
import markDark from "@/assets/thryvems-mark-dark.png"

/**
 * Product identity, deliberately separate from a customer's white-label logo. The official ThryveMS logo with a
 * transparent background: forest green and teal on light surfaces, and a version whose green parts are light on
 * dark surfaces so it stays readable. `showName` shows the full logo; without it, the mark alone.
 *
 * `sidebar` picks the version from the sidebar's own fill (`data-sidebar-tone` set by applyTheme), because a Brand
 * sidebar can be dark while the page is in light view.
 */
export function ProductMark({ className, showName = true, sidebar = false }: { className?: string; showName?: boolean; sidebar?: boolean }) {
  const [light, dark] = showName ? [logo, logoDark] : [mark, markDark]
  const size = showName ? "h-7" : "h-8"
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img src={light} alt="ThryveMS" className={cn(size, "w-auto", sidebar ? "[[data-sidebar-tone=dark]_&]:hidden" : "[.dark_&]:hidden")} />
      <img src={dark} alt="ThryveMS" className={cn(size, "hidden w-auto", sidebar ? "[[data-sidebar-tone=dark]_&]:block" : "[.dark_&]:block")} />
    </span>
  )
}

/**
 * The logo at the top of the sidebar and on the sign-in page: the company's logo once Settings › Branding has one,
 * otherwise ThryveMS. `surface` says what it sits on: the sidebar (follows the sidebar's fill) or the page (follows
 * light or dark view).
 */
export function WorkspaceLogo({ className, compact = false, surface = "sidebar" }: { className?: string; compact?: boolean; surface?: "sidebar" | "page" }) {
  const { brand } = useStore()
  const lightSrc = brand.logo ?? brand.logoDark
  const darkSrc = brand.logoDark ?? brand.logo
  // Collapsed sidebar: the company favicon reads best in a small square; fall back to the logo, then ThryveMS.
  const compactSrc = compact ? brand.favicon : undefined
  if (!lightSrc && !compactSrc) return <ProductMark className={className} showName={!compact} sidebar={surface === "sidebar"} />
  const onSidebar = surface === "sidebar"
  const box = compact ? "size-8 object-contain" : "h-8 max-w-[10.5rem] object-contain object-left"
  if (compactSrc) return <img src={compactSrc} alt="Company logo" className={cn(box, className)} />
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img src={lightSrc} alt="Company logo" className={cn(box, onSidebar ? "[[data-sidebar-tone=dark]_&]:hidden" : "[.dark_&]:hidden")} />
      <img src={darkSrc} alt="Company logo" className={cn(box, "hidden", onSidebar ? "[[data-sidebar-tone=dark]_&]:block" : "[.dark_&]:block")} />
    </span>
  )
}
