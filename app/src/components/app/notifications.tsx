/**
 * In-app notifications: the bell in the top bar and the shared list row.
 * Notifications are per person. Which kinds also go by email is set in Settings › Notifications.
 */
import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { BellIcon, CalendarCheckIcon, CircleAlertIcon, ClipboardCheckIcon, ScrollTextIcon, MessageCircleIcon, MessageSquareTextIcon, Share2Icon, UserPlusIcon, type LucideIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { AppNotification, NotificationKind } from "@/data/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export const KIND: Record<NotificationKind, { icon: LucideIcon; tone: string; label: string }> = {
  "Waiting on you": { icon: ClipboardCheckIcon, tone: "bg-progress-tint text-progress", label: "Waiting on you" },
  Overdue: { icon: CircleAlertIcon, tone: "bg-overdue-tint text-overdue", label: "Overdue" },
  Remark: { icon: MessageSquareTextIcon, tone: "bg-soon-tint text-soon", label: "Consultant remarks" },
  Comment: { icon: MessageCircleIcon, tone: "bg-secondary text-muted-foreground", label: "Comments and replies" },
  Shared: { icon: Share2Icon, tone: "bg-secondary text-muted-foreground", label: "Shared with you" },
  Audit: { icon: CalendarCheckIcon, tone: "bg-secondary text-muted-foreground", label: "Audits" },
  Policy: { icon: ScrollTextIcon, tone: "bg-secondary text-muted-foreground", label: "Policies" },
  Assigned: { icon: UserPlusIcon, tone: "bg-secondary text-muted-foreground", label: "Assigned to you" },
}

/** This person's notifications, newest first. */
export function useMyNotifications() {
  const { state, user, update } = useStore()
  const mine = state.notifications.filter((n) => n.to === user.name).sort((a, b) => a.age - b.age)
  const unread = mine.filter((n) => !n.read)
  return {
    mine,
    unread,
    markRead: (n: AppNotification, read = true) => update("notifications", n.id, { read }),
    markAllRead: () => unread.forEach((n) => update("notifications", n.id, { read: true })),
  }
}

export function NotificationRow({ n, onOpen, compact }: { n: AppNotification; onOpen: () => void; compact?: boolean }) {
  const k = KIND[n.kind]
  const Icon = k.icon
  return (
    <button type="button" onClick={onOpen} className={cn("flex w-full cursor-pointer items-start gap-3 text-left hover:bg-hover", compact ? "px-4 py-3" : "px-5 py-3.5", !n.read && "bg-highlight/40")}>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", k.tone)} aria-hidden>
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm leading-snug", !n.read && "font-semibold")}>{n.title}</span>
        {n.body && <span className={cn("text-[0.8125rem] leading-snug text-muted-foreground", compact && "line-clamp-2")}>{n.body}</span>}
        <span className="text-xs text-muted-foreground">
          {n.when}
          {n.from ? `, from ${n.from}` : ""}
        </span>
      </span>
      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
    </button>
  )
}

/** Bell in the top bar with the unread count and the latest notifications. */
export function NotificationBell() {
  const navigate = useNavigate()
  const { mine, unread, markRead, markAllRead } = useMyNotifications()
  const [open, setOpen] = React.useState(false)
  const [only, setOnly] = React.useState<"all" | "unread">("all")
  const list = (only === "unread" ? unread : mine).slice(0, 20)
  const label = unread.length ? `Notifications, ${unread.length} unread` : "Notifications"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative flex size-10 cursor-pointer items-center justify-center rounded-sm hover:bg-secondary" aria-label={label} title="Notifications">
        <BellIcon className="size-[1.125rem] text-muted-foreground" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-overdue px-1 text-[0.625rem] font-semibold text-background">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex max-h-[min(34rem,var(--radix-dropdown-menu-content-available-height,34rem))] w-[min(26rem,calc(100vw-2rem))] flex-col p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <span className="text-[0.9375rem] font-semibold">Notifications</span>
          {unread.length > 0 && (
            <button type="button" onClick={markAllRead} className="cursor-pointer text-[0.8125rem] font-medium text-primary hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        <div className="flex gap-1 border-b px-3 py-2" role="tablist" aria-label="Show">
          {(["all", "unread"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={only === v} onClick={() => setOnly(v)} className={cn("h-8 cursor-pointer rounded-full px-3 text-[0.8125rem]", only === v ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary")}>
              {v === "all" ? "All" : `Unread ${unread.length}`}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
              <BellIcon className="size-5 text-muted-foreground" />
              <p className="text-sm font-semibold">{only === "unread" ? "You’re all caught up" : "No notifications yet"}</p>
              <p className="text-[0.8125rem] text-muted-foreground">Approvals, overdue items and remarks for you show here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-rule-soft">
              {list.map((n) => (
                <li key={n.id}>
                  <NotificationRow
                    n={n}
                    compact
                    onOpen={() => {
                      markRead(n)
                      setOpen(false)
                      navigate(n.href)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-[0.8125rem]">
          <Link to="/notifications" onClick={() => setOpen(false)} className="font-medium text-primary">
            See all notifications
          </Link>
          <Link to="/settings/notifications" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
