import * as React from "react"
import { ExpandIcon, MaximizeIcon, MinimizeIcon, UsersIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"

import { cn, initials } from "@/lib/utils"
import type { OrgNode, OrgNodeType } from "@/lib/settings"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Field, PeopleOptions } from "@/components/app/form"

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

function Card({ p, print, selected, onSelect, renaming, onRename, onRenameDone }: { p: Placed; print?: boolean; selected?: boolean; onSelect?: (n: OrgNode) => void; renaming?: boolean; onRename?: (n: OrgNode) => void; onRenameDone?: (title?: string) => void }) {
  const n = p.node
  const draft = n.id === DRAFT_ID
  const label = n.person || (n.type === "Position" ? "Role only, no name" : n.type)
  const [title, setTitle] = React.useState(n.title)
  React.useEffect(() => setTitle(n.title), [n.title, renaming])
  const done = React.useRef(false)
  React.useEffect(() => {
    if (renaming) done.current = false
  }, [renaming])
  const finish = (t?: string) => {
    if (done.current) return
    done.current = true
    onRenameDone?.(t)
  }
  const cls = "relative flex h-full w-full flex-col justify-between gap-1 overflow-hidden rounded-md border bg-card py-2.5 pl-4 pr-3 text-left shadow-[0_1px_2px_rgb(24_32_43/0.06)]"
  if (draft || renaming) {
    return (
      <div data-card className="absolute" style={{ left: p.x, top: p.y, width: FW, height: FH }}>
        <div className={cn(cls, "border-dashed border-primary bg-highlight")}>
          <input
            autoFocus
            aria-label={draft ? "Name of the new box" : `Rename ${n.title}`}
            value={title}
            placeholder={draft ? "Type a name, such as General Manager" : ""}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") finish(title.trim() || undefined)
              if (e.key === "Escape") finish(undefined)
            }}
            onBlur={() => finish(title.trim() || undefined)}
            className="h-8 w-full rounded-sm border border-input bg-card px-2 text-[0.8125rem] outline-none focus-visible:border-ring"
          />
          <span className="text-[0.6875rem] text-muted-foreground">Enter to save · Esc to cancel</span>
        </div>
      </div>
    )
  }
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
  return (
    <div className="absolute" style={{ left: p.x, top: p.y, width: FW, height: FH }}>
      {print || !onSelect ? (
        <div className={cls}>{inner}</div>
      ) : (
        <button
          type="button"
          data-card
          aria-pressed={selected}
          onClick={() => onSelect(n)}
          onDoubleClick={() => onRename?.(n)}
          className={cn(cls, "cursor-pointer hover:border-primary focus-visible:outline-2 focus-visible:outline-primary", selected && "border-primary ring-2 ring-primary")}
          aria-label={`${n.title}, ${n.type}${n.person ? `, ${n.person}` : ""}`}
        >
          {inner}
        </button>
      )}
    </div>
  )
}

const DRAFT_ID = "__new"

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
      {placed.map((p) => <Card key={p.node.id} p={p} print />)}
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

type Win = { kind: "edit" | "delete"; id: string } | null

export function OrgFlow({ nodes, canEdit, onSave, onRemove }: { nodes: OrgNode[]; canEdit: boolean; onSave: (n: OrgNode) => void; onRemove: (id: string, withBoxesUnder: boolean) => void }) {
  const [draft, setDraft] = React.useState<{ parent?: string } | null>(null)
  const [selected, setSelected] = React.useState<string>()
  const [renaming, setRenaming] = React.useState<string>()
  const [win, setWin] = React.useState<Win>(null)
  const [moveUp, setMoveUp] = React.useState(true)
  // an empty chart starts with one box to type the top of the company into
  const empty = nodes.length === 0
  const active = draft ?? (empty && canEdit ? {} : null)
  const shown = React.useMemo(() => (active ? [...nodes, { id: DRAFT_ID, type: "Department" as OrgNodeType, title: "", parent: active.parent }] : nodes), [nodes, active?.parent, !!active]) // eslint-disable-line react-hooks/exhaustive-deps
  const { placed, paths, W, H } = React.useMemo(() => build(shown), [shown])
  const vp = React.useRef<HTMLDivElement>(null)
  const fullScreenRoot = React.useRef<HTMLDivElement>(null)
  const [fullScreen, setFullScreen] = React.useState(false)
  const [view, setView] = React.useState({ k: 1, tx: 0, ty: 0 })
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

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

  const sel = selected ? placed.find((p) => p.node.id === selected) : undefined
  const winNode = win ? nodes.find((n) => n.id === win.id) : undefined
  const winPlaced = win ? placed.find((p) => p.node.id === win.id) : undefined
  const blocked = winNode ? new Set([winNode.id, ...under(nodes, winNode.id)]) : new Set<string>()
  const vw = vp.current?.clientWidth ?? 1000
  const at = (p: Placed) => ({ x: p.x * view.k + view.tx, y: p.y * view.k + view.ty, w: FW * view.k, h: FH * view.k })
  const close = () => setWin(null)
  const startAdd = (parent?: string) => {
    setWin(null)
    setRenaming(undefined)
    setDraft({ parent })
  }
  const finishDraft = (title?: string) => {
    const d = active
    setDraft(null)
    if (!d || !title) return
    const node: OrgNode = { id: `oc-${Date.now().toString(36)}`, type: d.parent ? "Department" : "Position", title, parent: d.parent }
    onSave(node)
    setSelected(node.id)
  }
  const ask = (id: string) => {
    setMoveUp(true)
    setWin({ kind: "delete", id })
  }

  return (
    <div ref={fullScreenRoot} className="relative overflow-hidden rounded-md border bg-background fullscreen:rounded-none fullscreen:border-0" onKeyDown={(e) => e.key === "Escape" && (win ? close() : setSelected(undefined))}>
      <div
        ref={vp}
        tabIndex={0}
        aria-label="Org chart canvas. Drag to move; use the buttons to zoom."
        className={cn("h-[38rem] cursor-grab touch-none select-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary", fullScreen && "h-screen")}
        style={{ backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-card]")) return
          drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false }
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true
          setView((v) => ({ ...v, tx: d.tx + e.clientX - d.x, ty: d.ty + e.clientY - d.y }))
        }}
        onPointerUp={() => {
          // a click on the empty canvas clears the selection
          if (drag.current && !drag.current.moved) {
            setSelected(undefined)
            setWin(null)
          }
          drag.current = null
        }}
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
          {placed.map((p) => (
            <Card
              key={p.node.id}
              p={p}
              selected={p.node.id === selected}
              onSelect={canEdit ? (n) => { setSelected(n.id); setWin(null) } : undefined}
              renaming={p.node.id === renaming}
              onRename={canEdit ? (n) => setRenaming(n.id) : undefined}
              onRenameDone={p.node.id === DRAFT_ID ? finishDraft : (title) => {
                setRenaming(undefined)
                if (title && title !== p.node.title) onSave({ ...p.node, title })
              }}
            />
          ))}
        </div>
      </div>

      {canEdit && sel && !renaming && win?.kind !== "delete" && (() => {
        const r = at(sel)
        return (
          <div data-card role="toolbar" aria-label={`Actions for ${sel.node.title}`} className="absolute z-10 flex items-center gap-0.5 rounded-md bg-foreground p-1 text-background shadow-md" style={{ left: Math.max(8, r.x), top: Math.max(8, r.y - 42) }}>
            {[
              ["Edit", () => setWin({ kind: "edit", id: sel.node.id })],
              ["Add under", () => startAdd(sel.node.id)],
              ["Add beside", () => startAdd(sel.node.parent)],
              ["Delete", () => ask(sel.node.id)],
            ].map(([label, fn]) => (
              <button key={label as string} type="button" onClick={fn as () => void} className={cn("h-7 cursor-pointer rounded-sm px-2.5 text-xs font-semibold hover:bg-background/15", win?.kind === "edit" && label === "Edit" && "bg-background/15")}>
                {label as string}
              </button>
            ))}
          </div>
        )
      })()}

      {canEdit && win && winNode && winPlaced && (() => {
        const r = at(winPlaced)
        const width = 300
        const right = r.x + r.w + 12
        const left = right + width > vw - 8 ? Math.max(8, r.x - width - 12) : right
        return (
          <div data-card role="dialog" aria-label={win.kind === "edit" ? `Edit ${winNode.title}` : `Delete ${winNode.title}?`} className="absolute z-20 flex flex-col rounded-lg border bg-popover text-popover-foreground shadow-[0_18px_48px_-18px_rgba(24,32,43,0.45)]" style={{ left, top: Math.max(8, r.y), width }}>
            {win.kind === "edit" ? (
              <>
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <span className="truncate text-sm font-semibold">{winNode.title || "New box"}</span>
                  <button type="button" aria-label="Close" onClick={close} className="ml-auto flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-hover"><XIcon className="size-4" /></button>
                </div>
                <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto px-4 py-3">
                  <Field label="Name" htmlFor="oc-ti">
                    <Input id="oc-ti" autoFocus value={winNode.title} onChange={(e) => onSave({ ...winNode, title: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Kind" htmlFor="oc-t">
                      <NativeSelect id="oc-t" value={winNode.type} onChange={(e) => onSave({ ...winNode, type: e.target.value as OrgNodeType })}>
                        {NODE_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </NativeSelect>
                    </Field>
                    <Field label="People" htmlFor="oc-p" optional>
                      <Input id="oc-p" type="number" min={0} value={winNode.people ?? ""} onChange={(e) => onSave({ ...winNode, people: e.target.value ? Math.max(0, Number(e.target.value) || 0) : undefined })} />
                    </Field>
                  </div>
                  <Field label="Person" htmlFor="oc-pe" optional help="Leave empty to show the role only.">
                    <Input id="oc-pe" value={winNode.person ?? ""} list="oc-people" onChange={(e) => onSave({ ...winNode, person: e.target.value || undefined })} />
                    <datalist id="oc-people"><PeopleOptions /></datalist>
                  </Field>
                  <Field label="Reports to" htmlFor="oc-r">
                    <NativeSelect id="oc-r" value={winNode.parent ?? ""} onChange={(e) => onSave({ ...winNode, parent: e.target.value || undefined })}>
                      <option value="">Nobody (top of the chart)</option>
                      {nodes.filter((n) => !blocked.has(n.id)).map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Responsibilities" htmlFor="oc-d" optional>
                    <Textarea id="oc-d" value={winNode.duties ?? ""} onChange={(e) => onSave({ ...winNode, duties: e.target.value || undefined })} className="min-h-14" />
                  </Field>
                  <p className="text-xs text-muted-foreground">Saves as you type. Esc or click the canvas to close.</p>
                </div>
                <div className="border-t px-4 py-2.5">
                  <button type="button" onClick={() => ask(winNode.id)} className="cursor-pointer text-[0.8125rem] font-semibold text-overdue hover:underline">Delete box</button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3 p-4">
                <span className="text-[0.9375rem] font-semibold">Delete {winNode.title}?</span>
                {under(nodes, winNode.id).length === 0 ? (
                  <p className="text-[0.8125rem] text-muted-foreground">Nothing sits under it.</p>
                ) : (
                  <fieldset className="flex flex-col gap-2 text-[0.8125rem]">
                    <legend className="mb-1 text-muted-foreground">It has {under(nodes, winNode.id).length} box{under(nodes, winNode.id).length === 1 ? "" : "es"} under it. Where do they go?</legend>
                    <label className="flex cursor-pointer items-center gap-2"><input type="radio" name="oc-move" checked={moveUp} onChange={() => setMoveUp(true)} className="accent-primary" />Move them up a level</label>
                    <label className="flex cursor-pointer items-center gap-2"><input type="radio" name="oc-move" checked={!moveUp} onChange={() => setMoveUp(false)} className="accent-primary" />Delete them too</label>
                  </fieldset>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={() => { onRemove(winNode.id, !moveUp); setWin(null); setSelected(undefined) }}>Delete box</Button>
                </div>
              </div>
            )}
          </div>
        )
      })()}

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

const NODE_TYPES: OrgNodeType[] = ["Position", "Department", "Site", "Team", "Company"]
const under = (nodes: OrgNode[], id: string): string[] => nodes.filter((n) => n.parent === id).flatMap((n) => [n.id, ...under(nodes, n.id)])
