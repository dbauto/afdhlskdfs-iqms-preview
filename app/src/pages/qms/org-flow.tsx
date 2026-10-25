import * as React from "react"
import { ExpandIcon, MaximizeIcon, MinimizeIcon, PlusIcon, UsersIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"

import { cn, initials } from "@/lib/utils"
import type { OrgNode, OrgNodeType } from "@/lib/settings"
import { Avatar } from "@/components/ui/avatar"

/**
 * The org chart as a tree on a canvas: the top box, then the boxes under it side by side, joined by
 * square connectors. Below the second level, teams stack under their head on a rail so a wide company
 * stays readable. Drag to move, zoom with the buttons (or Ctrl and the wheel), Fit shows it all.
 */

const FW = 216
const FH = 84
const GX = 28
const GAP = 64
const IND = 26
const GS = 14
const PAD = 32

export const TYPE_COLOR: Record<OrgNodeType, string> = {
  Company: "#16191d",
  Position: "#2b3a9e",
  Department: "#1f6f4a",
  Site: "#b4540a",
  Team: "#6e56cf",
}

type Box = { node: OrgNode; mode: "leaf" | "tree" | "stack"; w: number; h: number; kids: Box[] }
type Placed = { node: OrgNode; x: number; y: number; reports: number; total: number }

function build(nodes: OrgNode[]) {
  const ids = new Set(nodes.map((n) => n.id))
  const kidsOf = (id: string) => nodes.filter((n) => n.parent === id)
  const count = (id: string): number => kidsOf(id).reduce((t, k) => t + 1 + count(k.id), 0)
  const measure = (n: OrgNode, depth: number): Box => {
    const kids = kidsOf(n.id).map((k) => measure(k, depth + 1))
    if (!kids.length) return { node: n, mode: "leaf", w: FW, h: FH, kids }
    // the first two levels spread out; deeper teams stack under their head
    if (depth >= 1) return { node: n, mode: "stack", w: Math.max(FW, IND + Math.max(...kids.map((k) => k.w))), h: FH + kids.reduce((t, k) => t + GS + k.h, 0), kids }
    const w = Math.max(FW, kids.reduce((t, k) => t + k.w, 0) + GX * (kids.length - 1))
    return { node: n, mode: "tree", w, h: FH + GAP + Math.max(...kids.map((k) => k.h)), kids }
  }
  const roots = nodes.filter((n) => !n.parent || !ids.has(n.parent)).map((r) => measure(r, 0))
  const placed: Placed[] = []
  const paths: string[] = []
  const cardX = (b: Box, x: number) => (b.mode === "tree" ? x + (b.w - FW) / 2 : x)
  const lay = (b: Box, x: number, y: number) => {
    const px = cardX(b, x)
    placed.push({ node: b.node, x: px, y, reports: b.kids.length, total: count(b.node.id) })
    if (b.mode === "stack") {
      const rx = x + 12
      let cy = y + FH + GS
      let last = cy
      for (const c of b.kids) {
        last = cy + FH / 2
        paths.push(`M${rx} ${last} H${x + IND}`)
        lay(c, x + IND, cy)
        cy += c.h + GS
      }
      paths.push(`M${rx} ${y + FH} V${last}`)
    } else if (b.mode === "tree") {
      const busY = y + FH + GAP / 2
      const cy = y + FH + GAP
      let cx = x + (b.w - (b.kids.reduce((t, c) => t + c.w, 0) + GX * (b.kids.length - 1))) / 2
      const mids: number[] = []
      for (const c of b.kids) {
        const mid = cardX(c, cx) + FW / 2
        mids.push(mid)
        paths.push(`M${mid} ${busY} V${cy}`)
        lay(c, cx, cy)
        cx += c.w + GX
      }
      paths.push(`M${px + FW / 2} ${y + FH} V${busY}`)
      if (mids.length > 1) paths.push(`M${Math.min(...mids)} ${busY} H${Math.max(...mids)}`)
    }
  }
  let x = PAD
  for (const r of roots) {
    lay(r, x, PAD)
    x += r.w + GX * 2
  }
  const W = Math.max(FW + PAD * 2, x - GX * 2 + PAD)
  const H = PAD * 2 + Math.max(FH, ...roots.map((r) => r.h))
  return { placed, paths, W, H }
}

function Card({ p, canEdit, print, onEdit, onAdd }: { p: Placed; canEdit: boolean; print?: boolean; onEdit?: (n: OrgNode) => void; onAdd?: (parent: string) => void }) {
  const n = p.node
  const label = n.person || (n.type === "Position" ? "Role only, no name" : n.type)
  const inner = (
    <>
      <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-md" style={{ background: TYPE_COLOR[n.type] }} aria-hidden="true" />
      <span className="flex min-w-0 items-center gap-2.5">
        {n.person ? (
          <Avatar name={n.person} size={34} className="text-[0.75rem]" />
        ) : (
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[0.75rem] font-semibold text-white" style={{ background: TYPE_COLOR[n.type] }} aria-hidden="true">
            {initials(n.title)}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[0.8125rem] font-semibold leading-tight">{n.title}</span>
          <span className="truncate text-xs leading-tight text-muted-foreground">{label}</span>
        </span>
      </span>
      <span className="flex items-center justify-between gap-2 text-[0.6875rem] text-muted-foreground">
        <span className="font-medium uppercase tracking-wide" style={{ color: TYPE_COLOR[n.type] }}>{n.type}</span>
        <span className="flex items-center gap-1 tabular-nums">
          {n.people ? <><UsersIcon className="size-3" aria-hidden="true" />{n.people}</> : p.total ? `${p.reports} direct` : ""}
        </span>
      </span>
    </>
  )
  const cls = "relative flex h-full w-full flex-col justify-between gap-1 overflow-hidden rounded-md border bg-card py-2.5 pl-4 pr-3 text-left shadow-[0_1px_2px_rgb(24_32_43/0.06)]"
  return (
    <div className="group absolute" style={{ left: p.x, top: p.y, width: FW, height: FH }}>
      {print || !onEdit ? (
        <div className={cls}>{inner}</div>
      ) : (
        <button type="button" data-card onClick={() => onEdit(n)} className={cn(cls, "cursor-pointer hover:border-primary focus-visible:outline-2 focus-visible:outline-primary")} aria-label={`${n.title}, ${n.type}${n.person ? `, ${n.person}` : ""}. Open to edit`}>
          {inner}
        </button>
      )}
      {canEdit && !print && onAdd && (
        <button
          type="button"
          data-card
          onClick={() => onAdd(n.id)}
          aria-label={`Add a box under ${n.title}`}
          title={`Add a box under ${n.title}`}
          className="absolute -bottom-3 left-1/2 flex size-6 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border bg-card text-primary opacity-0 shadow-sm transition-opacity hover:bg-primary hover:text-primary-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <PlusIcon className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/** A4/Letter-friendly chart box with room for the section heading and page margins. */
export function chartPrintScale(width: number, height: number) {
  return Math.min(1, 680 / width, 780 / height)
}

/** The same cards/connectors as the canvas, scaled instead of clipped in PDF exports. */
export function OrgChartPicture({ nodes }: { nodes: OrgNode[] }) {
  const { placed, paths, W, H } = React.useMemo(() => build(nodes), [nodes])
  const host = React.useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = React.useState(W)
  React.useEffect(() => {
    const el = host.current
    if (!el) return
    const update = () => setAvailableWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [W])

  const screenScale = Math.min(1, availableWidth / W)
  const printScale = chartPrintScale(W, H)
  const picture = (scale: number) => (
    <div className="relative origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }} role="img" aria-label={`Org chart with ${nodes.length} boxes`}>
      <svg className="absolute inset-0" width={W} height={H} aria-hidden="true">
        {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-border" />)}
      </svg>
      {placed.map((p) => <Card key={p.node.id} p={p} canEdit={false} print />)}
    </div>
  )

  return (
    <>
      <div ref={host} className="w-full overflow-hidden print:hidden">
        <div style={{ width: W * screenScale, height: H * screenScale }}>{picture(screenScale)}</div>
      </div>
      <div data-org-chart-print className="hidden print:block" style={{ width: W * printScale, height: H * printScale }}>
        {picture(printScale)}
      </div>
    </>
  )
}

export function OrgFlow({ nodes, canEdit, onEdit, onAdd }: { nodes: OrgNode[]; canEdit: boolean; onEdit: (n: OrgNode) => void; onAdd: (parent: string) => void }) {
  const { placed, paths, W, H } = React.useMemo(() => build(nodes), [nodes])
  const vp = React.useRef<HTMLDivElement>(null)
  const fullScreenRoot = React.useRef<HTMLDivElement>(null)
  const [fullScreen, setFullScreen] = React.useState(false)
  const [view, setView] = React.useState({ k: 1, tx: 0, ty: 0 })
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  const fit = React.useCallback(() => {
    const el = vp.current
    if (!el) return
    const vw = el.clientWidth
    const vh = el.clientHeight
    const k = Math.max(0.3, Math.min(1, (vw - 32) / W, (vh - 32) / H))
    setView({ k, tx: (vw - W * k) / 2, ty: Math.max(8, (vh - H * k) / 2) })
  }, [W, H])
  React.useEffect(() => {
    const el = vp.current
    if (!el) return
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    fit()
    return () => observer.disconnect()
  }, [fit])
  React.useEffect(() => {
    const sync = () => setFullScreen(document.fullscreenElement === fullScreenRoot.current)
    document.addEventListener("fullscreenchange", sync)
    return () => document.removeEventListener("fullscreenchange", sync)
  }, [])
  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement === fullScreenRoot.current) await document.exitFullscreen()
      else await fullScreenRoot.current?.requestFullscreen()
    } catch {
      // The browser may refuse fullscreen (e.g. an embedded or locked-down context).
      // Keep the canvas usable with Fit to view instead.
    }
  }
  const zoom = (f: number) =>
    setView((v) => {
      const el = vp.current
      const cx = (el?.clientWidth ?? 0) / 2
      const cy = (el?.clientHeight ?? 0) / 2
      const k = Math.max(0.3, Math.min(1.6, v.k * f))
      return { k, tx: cx - ((cx - v.tx) * k) / v.k, ty: cy - ((cy - v.ty) * k) / v.k }
    })

  return (
    <div ref={fullScreenRoot} className="relative overflow-hidden rounded-md border bg-background fullscreen:rounded-none fullscreen:border-0">
      <div
        ref={vp}
        tabIndex={0}
        aria-label="Org chart canvas. Drag to move; use the buttons to zoom."
        className={cn("h-[34rem] cursor-grab touch-none select-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary", fullScreen && "h-screen")}
        style={{ backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-card]")) return
          drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (d) setView((v) => ({ ...v, tx: d.tx + e.clientX - d.x, ty: d.ty + e.clientY - d.y }))
        }}
        onPointerUp={() => (drag.current = null)}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1)
        }}
        onKeyDown={(e) => {
          const m: Record<string, [number, number]> = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }
          const d = m[e.key]
          if (d && e.target === e.currentTarget) {
            e.preventDefault()
            setView((v) => ({ ...v, tx: v.tx + d[0], ty: v.ty + d[1] }))
          }
        }}
      >
        <div className="relative origin-top-left" style={{ width: W, height: H, transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})` }}>
          <svg className="absolute inset-0" width={W} height={H} aria-hidden="true">
            {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-faint" />)}
          </svg>
          {placed.map((p) => <Card key={p.node.id} p={p} canEdit={canEdit} onEdit={onEdit} onAdd={onAdd} />)}
        </div>
      </div>
      <div role="toolbar" aria-label="Canvas controls" className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border bg-card p-1 shadow-sm">
        <button type="button" aria-label="Zoom out" onClick={() => zoom(1 / 1.2)} className="flex size-8 cursor-pointer items-center justify-center rounded-sm hover:bg-hover"><ZoomOutIcon className="size-4" /></button>
        <span className="w-11 text-center text-xs tabular-nums">{Math.round(view.k * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => zoom(1.2)} className="flex size-8 cursor-pointer items-center justify-center rounded-sm hover:bg-hover"><ZoomInIcon className="size-4" /></button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <button type="button" aria-label="Fit to view" title="Fit to view" onClick={fit} className="flex size-8 cursor-pointer items-center justify-center rounded-sm hover:bg-hover"><MaximizeIcon className="size-4" /></button>
        <button type="button" aria-label={fullScreen ? "Exit fullscreen" : "Fullscreen"} title={fullScreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullScreen} className="flex size-8 cursor-pointer items-center justify-center rounded-sm hover:bg-hover">{fullScreen ? <MinimizeIcon className="size-4" /> : <ExpandIcon className="size-4" />}</button>
      </div>
      <ul className="absolute left-3 top-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md border bg-card/90 px-3 py-1.5 text-[0.6875rem]" aria-label="Box types">
        {(Object.keys(TYPE_COLOR) as OrgNodeType[]).map((t) => (
          <li key={t} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: TYPE_COLOR[t] }} aria-hidden="true" />{t}</li>
        ))}
      </ul>
    </div>
  )
}
