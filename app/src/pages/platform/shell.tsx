import type { ReactNode } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { ArrowLeftIcon, Building2Icon, CogIcon, HeadsetIcon, ScrollTextIcon, ShieldIcon, UserPlusIcon, LifeBuoyIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { PLATFORM_REQUESTS } from "@/data/admin"
import { Avatar } from "@/components/ui/avatar"
import { ProductMark } from "@/components/app/product-mark"
import { WalkthroughHeaderActions } from "@/components/app/walkthrough"

const NAV = [
  { label: "Organisations", to: "/platform", icon: Building2Icon },
  { label: "Requests", to: "/platform/requests", icon: UserPlusIcon, count: PLATFORM_REQUESTS.length },
  { label: "Logs", to: "/platform/logs", icon: ScrollTextIcon, count: 7, red: true },
  { label: "Background jobs", to: "/platform/jobs", icon: CogIcon },
  { label: "Support reports", to: "/platform/reports", icon: LifeBuoyIcon, count: 2, red: true },
  { label: "Support access", to: "/platform/support", icon: HeadsetIcon, count: 1 },
  { label: "Platform team", to: "/platform/team", icon: ShieldIcon },
]

/**
 * The platform admin console, for your team only.
 * The dark sidebar and the environment label make it obvious you are not inside a client workspace.
 */
export function PlatformShell() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen">
      <nav aria-label="Platform" className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col gap-5 bg-console px-3 py-4 text-white md:flex">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <ProductMark showName={false} />
          <span className="flex flex-col">
            <span className="text-sm font-semibold">ThryveMS Platform</span>
            <span className="text-xs text-console-text">All organisations</span>
          </span>
        </div>
        <ul className="flex flex-1 flex-col gap-0.5">
          {NAV.map((n) => {
            const on = n.to === "/platform" ? pathname === "/platform" : pathname.startsWith(n.to)
            return (
              <li key={n.to}>
                <Link to={n.to} aria-current={on ? "page" : undefined} className={cn("flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm", on ? "bg-console-raised font-semibold text-white" : "text-console-text hover:bg-[#263140]")}>
                  <n.icon className="size-4" />
                  <span className="flex-1">{n.label}</span>
                  {n.count ? <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white", n.red ? "bg-overdue" : "bg-primary")}>{n.count}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
        <Link to="/" className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-[0.8125rem] text-console-text hover:bg-[#263140]">
          <ArrowLeftIcon className="size-4" /> Back to a client workspace (prototype)
        </Link>
        <div className="flex items-center gap-2.5 border-t border-console-raised px-1 pt-3 text-[0.8125rem]">
          <Avatar name="Leo Navarro" size={30} tone="dark" />
          <span className="flex flex-col">
            <span className="font-medium">Leo Navarro</span>
            <span className="text-xs text-console-text">Platform admin</span>
          </span>
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b px-4 md:px-8">
          <nav className="flex gap-1 overflow-x-auto md:hidden" aria-label="Platform">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="whitespace-nowrap rounded-sm px-2 py-1 text-[0.8125rem]">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto inline-flex h-[26px] items-center gap-1.5 rounded-full bg-overdue-tint px-2.5 text-xs font-semibold text-overdue">
            <span className="size-1.5 rounded-full bg-overdue" /> Production
          </span>
        </header>
        <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PlatformHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-[720px] flex-col gap-1.5">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
        {description && <p className="text-sm leading-normal text-muted-foreground">{description}</p>}
      </div>
      <WalkthroughHeaderActions>{actions}</WalkthroughHeaderActions>
    </div>
  )
}
