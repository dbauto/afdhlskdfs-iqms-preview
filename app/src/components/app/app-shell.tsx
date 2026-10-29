import * as React from "react"
import { ContentLink } from "./content-link"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { BellIcon, CheckIcon, InfoIcon, LockIcon, LogOutIcon, MenuIcon, MonitorIcon, MoonIcon, SearchIcon, SettingsIcon, SquareTerminalIcon, SunIcon, UserRoundIcon, XIcon, MessageSquareTextIcon, LifeBuoyIcon } from "lucide-react"

import { toast } from "sonner"
import { ORG } from "@/data/org"
import { NotificationBell } from "@/components/app/notifications"
import { useStore } from "@/lib/store"
import { Avatar } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sidebar, SidebarNav } from "./sidebar"
import { WorkspaceLogo } from "./product-mark"
import { PageLoading } from "./page-loading"
import { NAV } from "./nav"
import NotFound from "@/pages/not-found"
import type { Area } from "@/data/types"
import { allows, peopleAllowed, personAllowed } from "@/lib/permissions"

/** People you can switch to in the prototype, to see what each role sees. */
/** Clients that invited the consultant (prototype). */
const CLIENTS = ["Arden & Co.", "Northwind Foods", "Kalayaan Builders"]

const DEMO_PEOPLE = ["p-al", "p-ms", "p-en", "p-dr", "p-bc", "p-ja", "p-kd", "p-ro", "p-ec"]

function UserMenu() {
  const { user, role, state, setUserId, appearance, setAppearance } = useStore()
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-sm hover:bg-secondary">
        <Avatar name={user.name} size={30} tone="accent" />
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="font-medium">{user.name}</span>
          <span className="text-xs text-muted-foreground">{role.name}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[min(80dvh,36rem)] w-72 overflow-y-auto">
        <DropdownMenuLabel>
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate("/settings/profile")}>
          <UserRoundIcon /> Profile and security
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings/support")}>
          <LifeBuoyIcon /> Contact support
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings/notifications")}>
          <BellIcon /> Notification settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings/privacy")}>
          <LockIcon /> Privacy and your data
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings/about")}>
          <InfoIcon /> About ThryveMS
        </DropdownMenuItem>
        {allows(role, "remarks.consultant") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Your clients</DropdownMenuLabel>
            {CLIENTS.map((c) => (
              <DropdownMenuItem
                key={c}
                onSelect={() => c !== ORG.name && toast(`Opening ${c}`, { description: "In the live app this switches to their workspace without signing in again. Each client invites you and sets an end date." })}
                aria-checked={c === ORG.name}
                role="menuitemradio"
              >
                <span className="flex-1">{c}</span>
                {c === ORG.name && <CheckIcon className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {([["Light", SunIcon, "Light"], ["Dark", MoonIcon, "Dark"], ["Device", MonitorIcon, "Match my device"]] as const).map(([v, Icon, label]) => (
          <DropdownMenuItem key={v} onSelect={(e) => { e.preventDefault(); setAppearance(v) }} aria-checked={appearance === v} role="menuitemradio">
            <Icon /> <span className="flex-1">{label}</span>
            {appearance === v && <CheckIcon className="text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Prototype: view as</DropdownMenuLabel>
        {state.people.filter(p => p.status !== "Deactivated").map((p) => {
          const id = p.id
          const r = state.roles.find((x) => x.id === p.roleId)
          return (
            <DropdownMenuItem key={id} onSelect={() => setUserId(id)} className={id === user.id ? "bg-accent" : undefined}>
              <Avatar name={p.name} size={22} />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">{r?.name}</span>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuItem onSelect={() => navigate("/platform")}>
          <SquareTerminalIcon /> Platform admin console
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/sign-in")}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Top bar link to the consultant remarks, with the open count. Hidden when there are none and no consultant. */
function RemarksLink() {
  const { state, can, role } = useStore()
  const open = state.remarks.filter((r) => r.status === "Open" && can(r.area)).length
  const hasConsultant = peopleAllowed(state.people, state.roles, "remarks.consultant").length > 0
  if (!hasConsultant && !open) return null
  const label = allows(role, "remarks.consultant") ? "Your remarks" : "Consultant remarks"
  return (
    <ContentLink to="/remarks" className="relative flex h-10 items-center gap-2 rounded-sm px-2.5 text-sm hover:bg-secondary" aria-label={`${label}, ${open} open`}>
      <MessageSquareTextIcon className="size-[1.125rem] text-muted-foreground" />
      <span className="hidden lg:inline">{label}</span>
      {open > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-soon px-1.5 text-[0.6875rem] font-semibold text-background">{open}</span>}
    </ContentLink>
  )
}

function SearchBox() {
  const navigate = useNavigate()
  const [q, setQ] = React.useState("")
  const ref = React.useRef<HTMLInputElement>(null)

  // "/" focuses search, like most work apps
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <form
      role="search"
      className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-sm border border-input bg-card px-3 md:max-w-[480px]"
      onSubmit={(e) => {
        e.preventDefault()
        navigate(`/search?q=${encodeURIComponent(q)}`)
      }}
    >
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
      <label htmlFor="global-search" className="sr-only">
        Search
      </label>
      <input
        ref={ref}
        id="global-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search records, documents and people"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
      />
      <kbd className="hidden rounded-[4px] border px-1.5 text-[0.6875rem] text-muted-foreground lg:inline">/</kbd>
    </form>
  )
}

function MobileNav() {
  const [open, setOpen] = React.useState(false)
  const { pathname } = useLocation()
  React.useEffect(() => setOpen(false), [pathname])
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger className="flex size-10 cursor-pointer items-center justify-center rounded-sm hover:bg-secondary md:hidden" aria-label="Open menu">
        <MenuIcon className="size-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col gap-5 bg-sidebar px-3 py-4 text-sidebar-foreground">
          <DialogPrimitive.Title className="flex flex-col items-start gap-2 px-2">
            <WorkspaceLogo />
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-sm hover:bg-secondary" aria-label="Close menu">
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
          </div>
          <Link to="/settings" className="flex h-9 items-center gap-2.5 rounded-sm border-t px-2.5 pt-3 text-sm">
            <SettingsIcon className="size-4" /> Settings
          </Link>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Which section a page belongs to, from the menu: the longest matching link wins. */
function areaFor(pathname: string): Area | undefined {
  const links = NAV.flatMap((n) => [{ to: n.to, area: n.area }, ...(n.children ?? []).map((c) => ({ to: c.to, area: c.area }))]).filter((l) => l.to !== "/")
  return links.filter((l) => pathname === l.to || pathname.startsWith(l.to + "/")).sort((a, b) => b.to.length - a.to.length)[0]?.area
}

/** Shown instead of a page whose section is turned off for this client. */
function ModuleOff({ area }: { area: Area }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-md border bg-card px-6 py-12 text-center">
      <p className="text-[0.9375rem] font-semibold">{area} isn’t turned on for {ORG.name}</p>
      <p className="text-sm text-muted-foreground">Your ThryveMS plan or setup doesn’t include this section. Ask your administrator if you need it.</p>
      <Link to="/" className="text-sm font-medium text-primary">
        Go to Overview
      </Link>
    </div>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  // remember the last page, so a support report can say where the problem was
  React.useEffect(() => {
    if (pathname.startsWith("/settings/support")) return
    try {
      sessionStorage.setItem("iqms.lastPage", pathname)
    } catch {
      /* storage blocked; the report just won't say the page */
    }
  }, [pathname])
  const { moduleOn, can } = useStore()
  const area = areaFor(pathname)
  const off = area && !moduleOn(area) ? area : undefined
  // a section the role has no access to answers "not found" by direct link too (plan v3 §9), not only in the menu
  const denied = !!area && !off && !can(area)
  React.useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8 short:h-14">
          <MobileNav />
          <SearchBox />
          <div className="ml-auto flex items-center gap-1">
            <RemarksLink />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        {/* keyed on the page, so its entrance plays each time a page opens */}
        <main id="main" key={pathname} className="page-enter mx-auto flex w-full max-w-[80rem] flex-1 flex-col gap-6 px-4 pb-16 pt-6 md:px-8 short:gap-4 short:pb-10 short:pt-4">
          {off ? <ModuleOff area={off} /> : denied ? <NotFound /> : <React.Suspense fallback={<PageLoading />}><Outlet /></React.Suspense>}
        </main>
      </div>
    </div>
  )
}
