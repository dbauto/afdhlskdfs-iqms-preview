import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import {
  CalendarClockIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FileTextIcon,
  HourglassIcon,
  ListTodoIcon,
  MessageSquareIcon,
  PresentationIcon,
  ShieldIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { TASK_GROUPS, TASK_TYPES, dueLabel, taskGroup, useMyTasks, type MyTask, type TaskType } from "@/lib/my-tasks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyLine, FigureGrid, PageHeader, ViewChips } from "@/components/app/page"

export const TASK_ICON: Record<TaskType, LucideIcon> = {
  nc: TriangleAlertIcon,
  doc: FileTextIcon,
  audit: ClipboardCheckIcon,
  review: PresentationIcon,
  risk: ShieldIcon,
  remark: MessageSquareIcon,
  cert: ListTodoIcon,
}

export function DueBadge({ task }: { task: Pick<MyTask, "due"> }) {
  const g = taskGroup(task)
  return (
    <Badge tone={g === "overdue" ? "overdue" : g === "week" ? "soon" : "draft"} className="whitespace-nowrap">
      {dueLabel(task)}
    </Badge>
  )
}

function TaskRow({ t }: { t: MyTask }) {
  const Icon = TASK_ICON[t.type]
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-rule-soft px-5 py-3.5 first:border-t-0">
      <div className="flex min-w-0 flex-[999_1_18rem] items-start gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-xs text-muted-foreground">
            {t.kind} · {t.ref} · {t.process}
          </span>
          <Link to={t.to} className="line-clamp-2 text-sm font-medium hover:underline">
            {t.title}
          </Link>
          <span className="text-[0.8125rem] text-foreground/80">Your step: {t.step}</span>
        </div>
      </div>
      <div className="flex flex-[1_0_auto] items-center justify-end gap-3">
        <DueBadge task={t} />
        <Button variant="outline" size="sm" asChild>
          <Link to={t.to} aria-label={`${t.action}: ${t.title}`}>
            {t.action}
          </Link>
        </Button>
      </div>
    </li>
  )
}

export default function MyTasksPage() {
  const { user } = useStore()
  const { tasks, waiting } = useMyTasks()
  const [type, setType] = React.useState<"all" | TaskType>("all")
  const [showWaiting, setShowWaiting] = React.useState(false)
  const shown = tasks.filter((t) => type === "all" || t.type === type)
  const count = (g: string) => tasks.filter((t) => taskGroup(t) === g).length
  const types = TASK_TYPES.filter((x) => tasks.some((t) => t.type === x.id))
  const first = user.name.split(" ")[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Overview", to: "/" }, { label: "My tasks" }]}
        title="My tasks"
        description={`Everything waiting on you, ${first}. A task leaves this list as soon as you’ve done your part.`}
      />
      <FigureGrid
        figures={[
          { value: count("overdue"), label: "Overdue", tone: "overdue", badge: count("overdue") ? "Act now" : undefined, icon: ClockIcon },
          { value: count("week"), label: "Due this week", icon: CalendarClockIcon },
          { value: count("later"), label: "Later or no date", icon: ListTodoIcon },
          { value: waiting.length, label: "Waiting on others", icon: HourglassIcon },
        ]}
      />

      {tasks.length === 0 ? (
        <Card>
          <EmptyLine title="You’re all caught up" body="Nothing is waiting on you. Approvals, actions, reviews and questionnaires show here when it’s your turn." />
        </Card>
      ) : (
        <>
          {types.length > 1 && (
            <ViewChips<"all" | TaskType>
              value={type}
              onChange={setType}
              views={[{ id: "all" as const, label: "All", count: tasks.length }, ...types.map((x) => ({ id: x.id, label: x.label, count: tasks.filter((t) => t.type === x.id).length }))]}
            />
          )}
          {TASK_GROUPS.map((g) => {
            const items = shown.filter((t) => taskGroup(t) === g.id)
            if (!items.length) return null
            return (
              <Card key={g.id} className="overflow-hidden" aria-labelledby={`tasks-${g.id}`}>
                  <header className="flex items-center gap-2 border-b px-5 py-3.5">
                    <h2 id={`tasks-${g.id}`} className="text-[0.9375rem] font-semibold">
                      {g.label}
                    </h2>
                    <Badge tone={g.id === "overdue" ? "overdue" : "draft"}>{items.length}</Badge>
                  </header>
                  <ul aria-label={g.label}>
                    {items.map((t) => (
                      <TaskRow key={t.id} t={t} />
                    ))}
                  </ul>
              </Card>
            )
          })}
        </>
      )}

      {waiting.length > 0 && (
        <Card className="overflow-hidden">
          <button
            type="button"
            aria-expanded={showWaiting}
            onClick={() => setShowWaiting((v) => !v)}
            className="flex min-h-12 w-full cursor-pointer flex-wrap items-center gap-2 px-5 py-2 text-left hover:bg-hover"
          >
            <ChevronRightIcon className={cn("size-4 transition-transform", showWaiting && "rotate-90")} aria-hidden="true" />
            <span className="text-[0.9375rem] font-semibold">Waiting on others</span>
            <Badge tone="draft">{waiting.length}</Badge>
            <span className="ml-auto text-[0.8125rem] text-muted-foreground">Your records where someone else has the next step</span>
          </button>
          {showWaiting && (
            <ul aria-label="Waiting on others" className="border-t">
              {waiting.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule-soft px-5 py-3.5 first:border-t-0">
                  <div className="flex min-w-0 flex-[999_1_18rem] flex-col gap-0.5">
                    <span className="truncate text-xs text-muted-foreground">
                      {w.kind} · {w.ref} · {w.process}
                    </span>
                    <Link to={w.to} className="truncate text-sm font-medium hover:underline">
                      {w.title}
                    </Link>
                  </div>
                  <span className="text-[0.8125rem] text-foreground/80">{w.next}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}
