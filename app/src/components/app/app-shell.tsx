import * as React from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { BellIcon, CheckIcon, InfoIcon, LockIcon, LogOutIcon, MenuIcon, MonitorIcon, MoonIcon, SearchIcon, SettingsIcon, SquareTerminalIcon, SunIcon, UserRoundIcon, XIcon } from "lucide-react"

import { ORG } from "@/data/org"
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
import { BrandMark, Sidebar, SidebarNav } from "./sidebar"

/** People you can switch to in the prototype, to see what each role sees. */
const DEMO_PEOPLE = ["p-ms", "p-al", "p-ja", "p-kd", "p-ec"]

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
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate("/settings/profile")}>
          <UserRoundIcon /> Profile and security
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings/notifications")}>
          <BellIcon /> Notifications
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings/privacy")}>
          <LockIcon /> Privacy and your data
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings/about")}>
          <InfoIcon /> About iQMS
        </DropdownMenuItem>
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
        {DEMO_PEOPLE.map((id) => {
          const p = state.people.find((x) => x.id === id)
          if (!p) return null
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
      <kbd className="hidden rounded-[4px] border px-1.5 text-[11px] text-muted-foreground lg:inline">/</kbd>
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
          <DialogPrimitive.Title className="flex items-center gap-2.5 px-2">
            <BrandMark />
            <span className="text-sm font-semibold">{ORG.name}</span>
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

export function AppShell() {
  const { pathname } = useLocation()
  React.useEffect(() => window.scrollTo(0, 0), [pathname])

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <MobileNav />
          <SearchBox />
          <div className="ml-auto flex items-center gap-1">
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 pb-16 pt-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
