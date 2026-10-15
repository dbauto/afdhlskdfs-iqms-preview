import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { BellIcon, CheckCheckIcon, MailIcon, MailOpenIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { NotificationKind } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import { PageHeader, ViewChips } from "@/components/app/page"
import { KIND, NotificationRow, useMyNotifications } from "@/components/app/notifications"

/** Everything ThryveMS has told this person, with filters. */
export default function Notifications() {
  const navigate = useNavigate()
  const { remove } = useStore()
  const { mine, unread, markRead, markAllRead } = useMyNotifications()
  const [view, setView] = React.useState<"all" | "unread">("all")
  const [kind, setKind] = React.useState<"" | NotificationKind>("")
  const list = (view === "unread" ? unread : mine).filter((n) => !kind || n.kind === kind)
  // simple grouping by how old: today (under a day) and earlier
  const groups = [
    { label: "Today", items: list.filter((n) => n.age < 720) },
    { label: "Earlier", items: list.filter((n) => n.age >= 720) },
  ].filter((g) => g.items.length)

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Approvals, overdue items, remarks and anything shared with you. Choose what also comes by email in Settings › Notifications."
        actions={
          unread.length > 0 && (
            <Button variant="outline" onClick={markAllRead}>
              <CheckCheckIcon /> Mark all as read
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <ViewChips
          value={view}
          onChange={(v) => setView(v as "all" | "unread")}
          views={[
            { id: "all", label: "All", count: mine.length },
            { id: "unread", label: "Unread", count: unread.length, warn: true },
          ]}
        />
        <NativeSelect aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as NotificationKind | "")} className="ml-auto h-9 w-auto min-w-48 text-[0.8125rem]">
          <option value="">All types</option>
          {(Object.keys(KIND) as NotificationKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND[k].label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <BellIcon className="size-6 text-muted-foreground" />
          <p className="text-[0.9375rem] font-semibold">{view === "unread" ? "You’re all caught up" : "No notifications"}</p>
          <p className="text-sm text-muted-foreground">
            {kind ? "Nothing of this type. Try All types." : "When something needs you, or a record you follow changes, it shows here."}
          </p>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.label}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <span className="text-[0.9375rem] font-semibold">{g.label}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{g.items.length}</span>
            </div>
            <ul className="divide-y divide-rule-soft">
              {g.items.map((n) => (
                <li key={n.id} className={cn("flex items-stretch", !n.read && "bg-highlight/40")}>
                  <div className="min-w-0 flex-1">
                    <NotificationRow n={n} onOpen={() => { markRead(n); navigate(n.href) }} />
                  </div>
                  <div className="flex items-center gap-1 pr-4">
                    <button type="button" onClick={() => markRead(n, !n.read)} className="flex size-8 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary" aria-label={n.read ? "Mark as unread" : "Mark as read"} title={n.read ? "Mark as unread" : "Mark as read"}>
                      {n.read ? <MailIcon className="size-4" /> : <MailOpenIcon className="size-4" />}
                    </button>
                    <button type="button" onClick={() => { remove("notifications", n.id); toast("Notification removed") }} className="flex size-8 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary" aria-label="Remove notification" title="Remove">
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
      <p className="text-[0.8125rem] text-muted-foreground">
        Notifications are kept for 90 days. <Link to="/settings/notifications" className="font-medium text-primary">Notification settings</Link>
      </p>
    </>
  )
}
