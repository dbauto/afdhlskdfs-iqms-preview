import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDownIcon, ChevronRightIcon, PanelLeftIcon, SettingsIcon } from "lucide-react"

import { ORG } from "@/data/org"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NAV, type NavItem } from "./nav"

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
  const { can } = useStore()
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
          "flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-sm text-foreground transition-colors hover:bg-secondary",
          collapsed && "justify-center px-0",
          active && (!item.children || collapsed || !expanded) && "bg-accent font-semibold",
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
                {item.count ? <span className="text-xs font-normal text-muted-foreground">{item.count}</span> : null}
                {expanded ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
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
                  {!collapsed && item.count ? <span className="text-xs text-muted-foreground">{item.count}</span> : null}
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
                            "flex h-8 items-center gap-2 rounded-sm pl-9 pr-2.5 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground",
                            on && "bg-accent font-semibold text-foreground"
                          )}
                        >
                          <span className="flex-1 truncate">{c.label}</span>
                          {c.count ? <span className="text-xs font-normal text-muted-foreground">{c.count}</span> : null}
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

export function Sidebar() {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed } = useStore()
  const { pathname } = useLocation()
  const settingsOn = pathname.startsWith("/settings")

  return (
    <nav
      aria-label="Main"
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col gap-5 border-r bg-card px-3 py-4 transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      <div className={cn("flex min-h-10 items-center gap-2", collapsed && "justify-center")}>
        <MaybeTip show label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <PanelLeftIcon className="size-[18px]" />
          </button>
        </MaybeTip>
        {!collapsed && (
          <Link to="/" className="flex min-w-0 items-center gap-2.5 text-foreground">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-foreground text-[13px] font-semibold text-white">{ORG.short}</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{ORG.name}</span>
              <span className="text-xs text-muted-foreground">ISO 9001 QMS</span>
            </span>
          </Link>
        )}
      </div>

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <SidebarNav collapsed={collapsed} />
      </div>

      {/* Everyone sees Settings: personal pages (notifications, privacy, about) live there too. */}
      <div className="border-t pt-3">
          <MaybeTip show={collapsed} label="Settings">
            <Link
              to="/settings"
              aria-current={settingsOn ? "page" : undefined}
              aria-label={collapsed ? "Settings" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm hover:bg-secondary",
                collapsed && "justify-center px-0",
                settingsOn && "bg-accent font-semibold"
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
