import * as React from "react"
import type { ReactNode } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Building2Icon, ChevronDownIcon, ChevronRightIcon, LayoutGridIcon, LifeBuoyIcon, PanelLeftIcon, ServerIcon, SettingsIcon, ShieldIcon, SparklesIcon, UserPlusIcon, WalletIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { PLATFORM_REQUESTS } from "@/data/admin"
import { FINDINGS } from "@/data/platform"
import { ProductMark } from "@/components/app/product-mark"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Child {
  label: string
  to: string
  count?: number
  red?: boolean
}
interface Item {
  label: string
  to: string
  icon: LucideIcon
  count?: number
  red?: boolean
  children?: Child[]
}

/**
 * The platform console menu (ADR-038). Same building blocks as the client sidebar:
 * collapse button beside the logo, groups that open and close, Settings pinned at the bottom.
 * The top bar says "Platform console" and shows the environment, so it can't be mistaken for a client workspace.
 */
function useNav(): Item[] {
  const { state } = useStore()
  const openReports = state.supportReports.filter((r) => r.state !== "Closed" && r.state !== "Deployed").length
  const overdueFindings = FINDINGS.filter((f) => f.overdue).length
  return [
    { label: "Overview", to: "/platform", icon: LayoutGridIcon },
    { label: "Organisations", to: "/platform/organisations", icon: Building2Icon },
    { label: "Finance", to: "/platform/finance", icon: WalletIcon },
    { label: "Requests", to: "/platform/requests", icon: UserPlusIcon, count: PLATFORM_REQUESTS.length },
    {
      label: "Operations",
      to: "/platform/logs",
      icon: ServerIcon,
      children: [
        { label: "Logs", to: "/platform/logs", count: 7, red: true },
        { label: "Background jobs", to: "/platform/jobs" },
        { label: "Security scans", to: "/platform/scans", count: overdueFindings, red: true },
      ],
    },
    {
      label: "Support",
      to: "/platform/reports",
      icon: LifeBuoyIcon,
      children: [
        { label: "Support reports", to: "/platform/reports", count: openReports, red: true },
        { label: "Support access", to: "/platform/support", count: 1 },
      ],
    },
    { label: "AI assistants", to: "/platform/ai", icon: SparklesIcon },
    { label: "Platform team", to: "/platform/team", icon: ShieldIcon },
  ]
}

const isActive = (pathname: string, to: string) => (to === "/platform" ? pathname === "/platform" || pathname === "/platform/" : pathname === to || pathname.startsWith(to + "/"))

function Tip({ show, label, children }: { show: boolean; label: string; children: React.ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function Count({ n, red }: { n?: number; red?: boolean }) {
  if (!n) return null
  return <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold", red ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground")}>{n}</span>
}

function PlatformSidebar() {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed } = useStore()
  const { pathname } = useLocation()
  const nav = useNav()
  const [open, setOpen] = React.useState<Record<string, boolean>>({ Operations: true, Support: true })
  const settingsOn = pathname.startsWith("/platform/settings")
  return (
    <nav aria-label="Platform" className={cn("sticky top-0 hidden h-screen shrink-0 flex-col gap-5 border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground transition-[width] duration-200 md:flex", collapsed ? "w-[4.5rem]" : "w-[15.5rem]")}>
      {collapsed && (
        <Link to="/platform" aria-label="Platform overview" className="flex justify-center [&_img]:!h-[1.6rem] [&_img]:!w-auto">
          <ProductMark showName={false} sidebar />
        </Link>
      )}
      <div className={cn("flex min-h-10 items-center gap-2", collapsed && "justify-center")}>
        <Tip show label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            <PanelLeftIcon className="size-[18px]" />
          </button>
        </Tip>
        {!collapsed && (
          <Link to="/platform" aria-label="Platform overview" className="flex min-w-0 items-center">
            <ProductMark sidebar />
          </Link>
        )}
      </div>

      <ul className="-mx-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {nav.map((item) => {
          const active = isActive(pathname, item.to) || !!item.children?.some((c) => isActive(pathname, c.to))
          const expanded = !!open[item.label]
          const total = item.children ? item.children.reduce((s, c) => s + (c.red ? c.count ?? 0 : 0), 0) : item.count
          const red = item.children ? total! > 0 : item.red
          return (
            <li key={item.label}>
              {item.children && !collapsed ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen({ ...open, [item.label]: !expanded })}
                  className={cn("flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-left text-sm hover:bg-sidebar-hover", active && "font-semibold", active && !expanded && "bg-sidebar-active text-sidebar-active-foreground")}
                >
                  <item.icon className="size-4" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!expanded && <Count n={total} red={red} />}
                  {expanded ? <ChevronDownIcon className="size-4 text-sidebar-muted" /> : <ChevronRightIcon className="size-4 text-sidebar-muted" />}
                </button>
              ) : (
                <Tip show={collapsed} label={total ? `${item.label}, ${total}` : item.label}>
                  <Link
                    to={item.to}
                    aria-current={isActive(pathname, item.to) && !item.children ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn("relative flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm hover:bg-sidebar-hover", collapsed && "justify-center px-0", active && "bg-sidebar-active font-semibold text-sidebar-active-foreground")}
                  >
                    <item.icon className="size-4" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && <Count n={total} red={red} />}
                    {collapsed && total ? <span className={cn("absolute right-1.5 top-1.5 size-1.5 rounded-full", red ? "bg-overdue" : "bg-primary")} aria-hidden="true" /> : null}
                  </Link>
                </Tip>
              )}
              {item.children && expanded && !collapsed && (
                <ul className="ml-[1.125rem] mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">
                  {item.children.map((c) => {
                    const on = isActive(pathname, c.to)
                    return (
                      <li key={c.to}>
                        <Link to={c.to} aria-current={on ? "page" : undefined} className={cn("flex h-8 items-center gap-2 rounded-sm px-2.5 text-[0.8125rem] hover:bg-sidebar-hover", on ? "bg-sidebar-active font-semibold text-sidebar-active-foreground" : "text-sidebar-muted")}>
                          <span className="flex-1 truncate">{c.label}</span>
                          <Count n={c.count} red={c.red} />
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

      <div className="border-t border-sidebar-border pt-3">
        <Tip show={collapsed} label="Settings">
          <Link
            to="/platform/settings"
            aria-current={settingsOn ? "page" : undefined}
            aria-label={collapsed ? "Settings" : undefined}
            className={cn("flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm hover:bg-sidebar-hover", collapsed && "justify-center px-0", settingsOn && "bg-sidebar-active font-semibold text-sidebar-active-foreground")}
          >
            <SettingsIcon className="size-4" />
            {!collapsed && "Settings"}
          </Link>
        </Tip>
      </div>
    </nav>
  )
}

export function PlatformShell() {
  const nav = useNav()
  const flat = nav.flatMap((n) => (n.children ? n.children.map((c) => ({ label: c.label, to: c.to })) : [{ label: n.label, to: n.to }])).concat([{ label: "Settings", to: "/platform/settings" }])
  return (
    <div className="flex min-h-screen bg-background">
      <PlatformSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 flex-wrap items-center gap-3 border-b bg-card px-4 py-2 md:px-8">
          <nav className="flex w-full gap-1 overflow-x-auto md:hidden" aria-label="Platform pages">
            {flat.map((n) => (
              <Link key={n.to} to={n.to} className="whitespace-nowrap rounded-sm px-2 py-1 text-[0.8125rem] hover:bg-secondary">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="text-[0.8125rem] text-muted-foreground">Platform console · All organisations</span>
          <span className="ml-auto inline-flex h-[26px] items-center gap-1.5 rounded-full bg-overdue-tint px-2.5 text-xs font-semibold text-overdue">
            <span className="size-1.5 rounded-full bg-overdue" /> Production
          </span>
          <Link to="/platform/settings" aria-label="Leo Navarro, Platform admin. Your settings" className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            LN
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PlatformHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-[720px] flex-col gap-1.5">
        {eyebrow && <span className="text-xs text-muted-foreground">{eyebrow}</span>}
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
        {description && <p className="text-sm leading-normal text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
