import type { ReactNode } from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router-dom"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Breadcrumbs } from "@/components/app/page"

type Need = "admin" | "quality" | "all"

export const SETTINGS: { label: string; items: { label: string; to: string; need: Need }[] }[] = [
  {
    label: "Workspace",
    items: [
      { label: "Organization profile", to: "/settings/organization", need: "admin" },
      { label: "Users and access", to: "/settings/users", need: "admin" },
      { label: "Roles and permissions", to: "/settings/roles", need: "admin" },
      { label: "Sign-in and security", to: "/settings/security", need: "admin" },
      { label: "Integrations", to: "/settings/integrations", need: "admin" },
      { label: "Branding", to: "/settings/branding", need: "admin" },
      { label: "Activity log", to: "/settings/activity", need: "admin" },
    ],
  },
  {
    label: "Quality system",
    items: [
      { label: "Process structure", to: "/settings/process-structure", need: "quality" },
      { label: "Certification", to: "/settings/certification", need: "quality" },
      { label: "QMS rules", to: "/settings/qms-rules", need: "quality" },
      { label: "Document numbering", to: "/settings/numbering", need: "quality" },
      { label: "Review and approval", to: "/settings/review", need: "quality" },
      { label: "Record retention", to: "/settings/retention", need: "quality" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile and security", to: "/settings/profile", need: "all" },
      { label: "Appearance", to: "/settings/appearance", need: "all" },
      { label: "Notifications", to: "/settings/notifications", need: "all" },
      { label: "Data export", to: "/settings/data-export", need: "quality" },
      { label: "Billing", to: "/settings/billing", need: "admin" },
      { label: "Privacy", to: "/settings/privacy", need: "all" },
      { label: "Legal and agreements", to: "/settings/legal", need: "all" },
      { label: "Contact support", to: "/settings/support", need: "all" },
      { label: "About", to: "/settings/about", need: "all" },
    ],
  },
]

/** Who sees which settings page. Admins run the workspace; quality managers run the QMS settings. */
export function useSettingsAccess() {
  const { can } = useStore()
  return (need: Need) => need === "all" || (need === "admin" ? can("Settings", "Manage") : can("QMS", "Manage") || can("Settings", "Manage"))
}

export function SettingsLayout() {
  const { pathname } = useLocation()
  const allowed = useSettingsAccess()
  const all = SETTINGS.flatMap((g) => g.items)
  const current = all.find((i) => pathname === i.to || pathname.startsWith(i.to + "/"))
  const blocked = current && !allowed(current.need)

  return (
    <>
      <Breadcrumbs items={[{ label: "Settings", to: "/settings" }, ...(current ? [{ label: current.label }] : [])]} />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="flex gap-6 overflow-x-auto lg:flex-col lg:gap-5">
          {SETTINGS.map((g) => {
            const items = g.items.filter((i) => allowed(i.need))
            if (!items.length) return null
            return (
              <div key={g.label} className="flex min-w-max flex-col gap-0.5">
                <span className="px-2.5 pb-1.5 text-xs text-muted-foreground">{g.label}</span>
                {items.map((i) => {
                  const on = current?.to === i.to
                  return (
                    <Link key={i.to} to={i.to} aria-current={on ? "page" : undefined} className={cn("flex h-[34px] items-center rounded-sm px-2.5 text-sm hover:bg-secondary", on && "bg-accent font-semibold")}>
                      {i.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="flex min-w-0 flex-col gap-6">
          {blocked ? (
            <div className="rounded-md border bg-card px-6 py-10 text-center">
              <h1 className="text-[0.9375rem] font-semibold">Only administrators can open {current!.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Ask your ThryveMS administrator if you need a change here.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </>
  )
}

export function SettingsIndex() {
  const allowed = useSettingsAccess()
  const first = SETTINGS.flatMap((g) => g.items).find((i) => allowed(i.need))
  return <Navigate to={first?.to ?? "/settings/notifications"} replace />
}

/** Heading used at the top of every settings page */
export function SettingsHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-[680px] flex-col gap-1.5">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em] short:text-[1.5rem]">{title}</h1>
        {description && <p className="text-sm leading-normal text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
