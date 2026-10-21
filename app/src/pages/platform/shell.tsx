import type { ReactNode } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { ArrowLeftIcon, Building2Icon, CogIcon, HeadsetIcon, ScrollTextIcon, ShieldIcon, UserPlusIcon, LifeBuoyIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { PLATFORM_REQUESTS, SUPPORT_SESSIONS } from "@/data/admin"
import { Avatar } from "@/components/ui/avatar"
import { NativeSelect } from "@/components/ui/input"
import { ProductMark } from "@/components/app/product-mark"
import { CONSOLE_USERS, usePlatform } from "@/lib/platform-store"
import NotFound from "@/pages/not-found"

type Space = "developer" | "business"

/** "View as" for the preview console. In production the server decides who gets in. */
function PreviewUserPicker() {
  const { user, setUser } = usePlatform()
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="whitespace-nowrap">Preview, view as</span>
      <NativeSelect aria-label="Preview, view console as" value={user.id} onChange={(e) => setUser(e.target.value)} className="h-8 w-auto min-w-44 text-[0.8125rem]">
        {CONSOLE_USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.label})
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

/**
 * The platform console (Developer space, /platform) and the business space for partners (/business).
 * Both use the same dark sidebar so it's obvious you are not inside a client workspace.
 * A person without access to a space gets the same "doesn't exist" page as any hidden record.
 */
export function PlatformShell({ space = "developer" }: { space?: Space }) {
  const { pathname } = useLocation()
  const { state, user } = usePlatform()
  const allowed = space === "developer" ? user.role === "developer" : user.role === "partner" || user.role === "developer"
  const pending = PLATFORM_REQUESTS.filter((r) => !state.requestDecisions[r.id]).length
  const active = SUPPORT_SESSIONS.filter((s) => s.state === "Active").length
  const NAV: { label: string; to: string; icon: typeof Building2Icon; count?: number; red?: boolean }[] =
    space === "developer"
      ? [
          { label: "Organisations", to: "/platform", icon: Building2Icon },
          { label: "Requests", to: "/platform/requests", icon: UserPlusIcon, count: pending },
          { label: "Logs", to: "/platform/logs", icon: ScrollTextIcon, count: 7, red: true },
          { label: "Background jobs", to: "/platform/jobs", icon: CogIcon },
          { label: "Support reports", to: "/platform/reports", icon: LifeBuoyIcon, count: 2, red: true },
          { label: "Support access", to: "/platform/support", icon: HeadsetIcon, count: active + state.supportRequests.length },
          { label: "Platform team", to: "/platform/team", icon: ShieldIcon },
        ]
      : [{ label: "Clients", to: "/business", icon: Building2Icon }]
  const root = space === "developer" ? "/platform" : "/business"

  if (!allowed) {
    return (
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 pb-16 pt-6 md:px-8">
        <div className="flex justify-end">
          <PreviewUserPicker />
        </div>
        <NotFound />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen">
      <nav aria-label="Platform" className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col gap-5 bg-console px-3 py-4 text-white md:flex">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <ProductMark showName={false} />
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{space === "developer" ? "ThryveMS Platform" : "ThryveMS Business"}</span>
            <span className="text-xs text-console-text">{space === "developer" ? "All organisations" : user.role === "partner" ? user.name : "Partner view"}</span>
          </span>
        </div>
        <ul className="flex flex-1 flex-col gap-0.5">
          {NAV.map((n) => {
            const on = n.to === root ? pathname === root || (root === "/business" && pathname.startsWith("/business/clients")) : pathname.startsWith(n.to)
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
          <Avatar name={user.name} size={30} tone="dark" />
          <span className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-console-text">{user.role === "developer" ? "Platform admin" : user.label}</span>
          </span>
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 flex-wrap items-center gap-3 border-b px-4 py-2 md:px-8">
          <nav className="flex gap-1 overflow-x-auto md:hidden" aria-label="Platform">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="whitespace-nowrap rounded-sm px-2 py-1 text-[0.8125rem]">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto flex items-center gap-3">
            <PreviewUserPicker />
            {space === "developer" && (
              <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-overdue-tint px-2.5 text-xs font-semibold text-overdue">
                <span className="size-1.5 rounded-full bg-overdue" /> Production
              </span>
            )}
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
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
