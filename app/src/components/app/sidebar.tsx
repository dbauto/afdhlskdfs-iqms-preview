import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDownIcon, ChevronRightIcon, PanelLeftIcon, SettingsIcon } from "lucide-react"

import { ORG } from "@/data/org"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NAV, type NavItem } from "./nav"

/** The company mark: their uploaded logo, or initials on a tile. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  const { brand } = useStore()
  if (brand.logo)
    return <img src={brand.logo} alt="" className={cn("shrink-0 rounded-sm object-contain", className)} style={{ width: size, height: size }} />
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-sm bg-logo-tile text-[0.8125rem] font-semibold text-logo-tile-foreground", className)} style={{ width: size, height: size }}>
      {ORG.short}
    </span>
  )
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/"
  if (to === "/documents") return pathname === "/documents" || (pathname.startsWith("/documents/") && !pathname.startsWith("/documents/reviews"))
  return pathname === to || pathname.startsWith(to + "/")
}

function itemActive(pathname: string, item: NavItem) {
  if (item.children) return item.children.some((c) => isActive(pathname, c.to)) || isActive(pathname, item.to)
  return isActive(pathname, item.to)
}

/** Wraps an element in a tooltip only when the sidebar is collapsed. */
function MaybeTip({ show, label, children }: { show: boolean; label: string; children: React.ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { can, state } = useStore()
  // open consultant remarks per section, so clients see where to look
  const remarks = (item: NavItem) => {
    const areas = [item.area, ...(item.children ?? []).map((c) => c.area)]
    return state.remarks.filter((r) => r.status === "Open" && areas.includes(r.area)).length
  }
  // An amber dot keeps menu names whole; the count is in the top bar and the Remarks inbox.
  const RemarkPip = ({ n }: { n: number }) =>
    n ? (
      <span className="flex size-4 shrink-0 items-center justify-center" title={`${n} open consultant remark${n > 1 ? "s" : ""}`}>
        <span className="size-2 rounded-full bg-soon" aria-hidden="true" />
        <span className="sr-only">{`${n} open consultant remark${n > 1 ? "s" : ""}`}</span>
      </span>
    ) : null
  const [open, setOpen] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.map((n) => [n.label, !!n.defaultOpen || itemActive(pathname, n)]))
  )

  const items = NAV.filter((n) => can(n.area))

  return (
    <ul className="flex flex-col gap-0.5" role="list">
      {items.map((item) => {
        const active = itemActive(pathname, item)
        const childActive = !!item.children?.some((c) => isActive(pathname, c.to))
        const Icon = item.icon
        const expanded = !!open[item.label]
        const rowClass = cn(
          "flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-hover",
          collapsed && "justify-center px-0",
          active && (!item.children || collapsed || !expanded) && "bg-sidebar-active font-semibold text-sidebar-active-foreground",
          active && item.children && expanded && !collapsed && "font-semibold"
        )

        return (
          <li key={item.label}>
            {item.children && !collapsed ? (
              <button
                type="button"
                className={cn(rowClass, "cursor-pointer")}
                aria-expanded={expanded}
                onClick={() => setOpen((o) => ({ ...o, [item.label]: !expanded }))}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate text-left">{item.label}</span>
                {!expanded && <RemarkPip n={remarks(item)} />}
                {item.count ? <span className="text-xs font-normal text-sidebar-muted">{item.count}</span> : null}
                {expanded ? <ChevronDownIcon className="size-3.5 text-sidebar-muted" /> : <ChevronRightIcon className="size-3.5 text-sidebar-muted" />}
              </button>
            ) : (
              <MaybeTip show={collapsed} label={item.count ? `${item.label}, ${item.count}` : item.label}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active && !childActive ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(rowClass, "relative")}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && <RemarkPip n={remarks(item)} />}
                  {collapsed && remarks(item) > 0 && <span className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-soon" aria-hidden="true" />}
                  {!collapsed && item.count ? <span className="text-xs text-sidebar-muted">{item.count}</span> : null}
                  {collapsed && item.count ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
                </Link>
              </MaybeTip>
            )}

            {item.children && expanded && !collapsed && (
              <ul className="mt-0.5 flex flex-col gap-0.5" role="list">
                {item.children
                  .filter((c) => can(c.area))
                  .map((c) => {
                    const on = isActive(pathname, c.to)
                    return (
                      <li key={c.to}>
                        <Link
                          to={c.to}
                          onClick={onNavigate}
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "flex h-8 items-center gap-2 rounded-sm pl-9 pr-2.5 text-[0.8125rem] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                            on && "bg-sidebar-active font-semibold text-sidebar-active-foreground"
                          )}
                        >
                          <span className="flex-1 truncate">{c.label}</span>
                          {c.to !== "/documents/reviews" && <RemarkPip n={state.remarks.filter((r) => r.status === "Open" && r.area === c.area).length} />}
                          {c.count ? <span className="text-xs font-normal text-sidebar-muted">{c.count}</span> : null}
                        </Link>
                      </li>
                    )
                  })}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** True while a media query matches; false where matchMedia isn't available. */
function useMedia(query: string) {
  const get = () => {
    try {
      return window.matchMedia(query).matches
    } catch {
      return false
    }
  }
  const [on, setOn] = React.useState(get)
  React.useEffect(() => {
    let mq: MediaQueryList
    try {
      mq = window.matchMedia(query)
    } catch {
      return
    }
    const update = () => setOn(mq.matches)
    update()
    mq.addEventListener?.("change", update)
    return () => mq.removeEventListener?.("change", update)
  }, [query])
  return on
}

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useStore()
  // Mid-size screens (tablet to 1340px, e.g. a laptop at 150% is 1280px) start with icons only, to give the page room.
  // The toggle still opens it; that choice lasts until the window gets wider or narrower.
  const midSize = useMedia("(min-width: 768px) and (max-width: 1340px)")
  const [openOnMid, setOpenOnMid] = React.useState(false)
  React.useEffect(() => setOpenOnMid(false), [midSize])
  const collapsed = midSize ? !openOnMid : sidebarCollapsed
  const toggle = () => (midSize ? setOpenOnMid(!openOnMid) : setSidebarCollapsed(!collapsed))
  const { pathname } = useLocation()
  const settingsOn = pathname.startsWith("/settings")

  return (
    <nav
      aria-label="Main"
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col gap-5 border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-[15.5rem]"
      )}
    >
      <div className={cn("flex min-h-10 items-center gap-2", collapsed && "justify-center")}>
        <MaybeTip show label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            <PanelLeftIcon className="size-[18px]" />
          </button>
        </MaybeTip>
        {!collapsed && (
          <Link to="/" className="flex min-w-0 items-center gap-2.5 text-sidebar-foreground">
            <BrandMark />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{ORG.name}</span>
              <span className="text-xs text-sidebar-muted">ISO 9001 QMS</span>
            </span>
          </Link>
        )}
      </div>

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <SidebarNav collapsed={collapsed} />
      </div>

      {/* Everyone sees Settings: personal pages (notifications, privacy, about) live there too. */}
      <div className="border-t border-sidebar-border pt-3">
          <MaybeTip show={collapsed} label="Settings">
            <Link
              to="/settings"
              aria-current={settingsOn ? "page" : undefined}
              aria-label={collapsed ? "Settings" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm hover:bg-sidebar-hover",
                collapsed && "justify-center px-0",
                settingsOn && "bg-sidebar-active font-semibold text-sidebar-active-foreground"
              )}
            >
              <SettingsIcon className="size-4" />
              {!collapsed && "Settings"}
            </Link>
          </MaybeTip>
      </div>
    </nav>
  )
}
