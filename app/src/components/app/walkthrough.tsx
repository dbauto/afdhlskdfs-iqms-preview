import * as React from "react"
import { CircleHelpIcon, PlayIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useOptionalStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { walkthroughForRoute, type WalkthroughGuide } from "@/lib/walkthroughs"

interface SavedProgress {
  guideId: string
  version: string
  step: number
  status: "in_progress" | "completed" | "skipped"
}

const STORAGE_PREFIX = "thryvems.walkthrough.v1"

function storageKey(userId: string, guide: WalkthroughGuide) {
  return `${STORAGE_PREFIX}:${userId}:${guide.id}`
}

function readProgress(userId: string, guide: WalkthroughGuide): SavedProgress | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId, guide)) ?? "null") as SavedProgress | null
    return parsed?.guideId === guide.id && parsed.version === guide.version ? parsed : undefined
  } catch {
    return undefined
  }
}

function writeProgress(userId: string, guide: WalkthroughGuide, step: number, status: SavedProgress["status"]) {
  try {
    localStorage.setItem(storageKey(userId, guide), JSON.stringify({ guideId: guide.id, version: guide.version, step, status } satisfies SavedProgress))
  } catch {
    // Storage can be blocked; the active walkthrough still works.
  }
}

function findVisibleTarget(selectors: string[]) {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))
    const target = elements.find((element) => {
      const box = element.getBoundingClientRect()
      return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== "hidden"
    })
    if (target) return target
  }
}

export function WalkthroughControl() {
  const { pathname } = useLocation()
  const store = useOptionalStore()
  const guide = walkthroughForRoute(pathname)
  const userId = store?.userId ?? "platform-admin"
  const eligible = !store?.user || (store.user.status !== "Deactivated" && (!store.user.accessEndsOn || store.user.accessEndsOn >= new Date().toISOString().slice(0, 10)))
  const [open, setOpen] = React.useState(false)
  const [stepIndex, setStepIndex] = React.useState(0)
  const [missingTarget, setMissingTarget] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLElement>(null)

  const close = React.useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  React.useEffect(() => {
    setOpen(false)
    setStepIndex(0)
  }, [pathname])

  React.useEffect(() => {
    if (!open || !guide || !eligible) return
    panelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close, eligible, guide, open])

  React.useEffect(() => {
    document.querySelectorAll("[data-walkthrough-target]").forEach((node) => node.removeAttribute("data-walkthrough-target"))
    if (!open || !guide || !eligible || walkthroughForRoute(pathname)?.id !== guide.id) return
    const target = findVisibleTarget(guide.steps[stepIndex].selectors)
    setMissingTarget(!target)
    if (!target) return
    target.dataset.walkthroughTarget = "true"
    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
    return () => target.removeAttribute("data-walkthrough-target")
  }, [eligible, guide, open, pathname, stepIndex])

  if (!guide || !eligible) return null
  const saved = readProgress(userId, guide)
  const last = stepIndex === guide.steps.length - 1
  const start = () => {
    const resumeAt = saved?.status === "in_progress" ? Math.min(saved.step, guide.steps.length - 1) : 0
    setStepIndex(resumeAt)
    setOpen(true)
  }
  const restart = () => {
    setStepIndex(0)
    writeProgress(userId, guide, 0, "in_progress")
    setOpen(true)
  }
  const next = () => {
    if (last) {
      writeProgress(userId, guide, stepIndex, "completed")
      close()
      return
    }
    const nextStep = stepIndex + 1
    writeProgress(userId, guide, nextStep, "in_progress")
    setStepIndex(nextStep)
  }

  return (
    <>
      <Button ref={triggerRef} type="button" variant="outline" size="sm" aria-label="Play walkthrough" onClick={start}>
        <PlayIcon aria-hidden="true" />
        <span className="hidden sm:inline">Play walkthrough</span>
      </Button>
      {open && (
        <aside
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="walkthrough-title"
          aria-describedby="walkthrough-description"
          tabIndex={-1}
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(70dvh,34rem)] min-w-0 flex-col overflow-hidden rounded-md border bg-card shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(25rem,calc(100vw-2.5rem))]"
        >
          <div className="flex items-start gap-3 border-b px-5 py-4 pr-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"><CircleHelpIcon className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{guide.page} · Step {stepIndex + 1} of {guide.steps.length}</p>
              <h2 id="walkthrough-title" className="mt-1 text-lg font-semibold leading-tight">{guide.steps[stepIndex].title}</h2>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close walkthrough" onClick={close}><XIcon /></Button>
          </div>
          <div className="min-w-0 overflow-y-auto px-5 py-4">
            <p id="walkthrough-description" className="text-sm leading-relaxed text-muted-foreground">{guide.steps[stepIndex].body}</p>
            {missingTarget && <p role="status" className="mt-3 rounded-sm bg-secondary px-3 py-2 text-[0.8125rem]">This item is not available in the current view. You can continue safely.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={restart}><RotateCcwIcon /> Start again</Button>
            <span className="flex-1" />
            <Button type="button" variant="ghost" size="sm" onClick={() => { writeProgress(userId, guide, stepIndex, "skipped"); close() }}>Skip</Button>
            <Button type="button" variant="outline" size="sm" disabled={stepIndex === 0} onClick={() => { const previous = stepIndex - 1; writeProgress(userId, guide, previous, "in_progress"); setStepIndex(previous) }}>Back</Button>
            <Button type="button" size="sm" onClick={next}>{last ? "Finish" : "Next"}</Button>
          </div>
        </aside>
      )}
    </>
  )
}

export function WalkthroughHeaderActions({ children, className }: { children?: React.ReactNode; className?: string }) {
  const { pathname } = useLocation()
  const store = useOptionalStore()
  const guide = walkthroughForRoute(pathname)
  const eligible = !store?.user || (store.user.status !== "Deactivated" && (!store.user.accessEndsOn || store.user.accessEndsOn >= new Date().toISOString().slice(0, 10)))
  if (!children && (!guide || !eligible)) return null
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}<WalkthroughControl /></div>
}
