import * as React from "react"
import { toast } from "sonner"

import type { CoverTint, Process, ProcessCover } from "@/data/types"
import { COVER_EMOJIS, COVER_TINTS, coverOf, defaultCover, emojiLabel, tintClass } from "@/lib/process-cover"
import { isSafeUrl } from "@/lib/record-links"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field } from "@/components/app/form"

/** A process's cover: its linked photo, or its emoji on a tint. A photo that won't load falls back to the default emoji. */
export function CoverArt({ cover, fallback, className, emojiClassName }: { cover: ProcessCover; fallback: ProcessCover; className?: string; emojiClassName?: string }) {
  const [broken, setBroken] = React.useState(false)
  React.useEffect(() => setBroken(false), [cover.kind === "photo" ? cover.url : ""])
  const shown = cover.kind === "photo" && broken ? fallback : cover
  if (shown.kind === "photo")
    return (
      <div className={cn("overflow-hidden bg-muted", className)}>
        <img src={shown.url} alt="" className="block size-full object-cover" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      </div>
    )
  return (
    <div className={cn("flex items-center justify-center", tintClass(shown.tint), className)}>
      <span role="img" aria-label={emojiLabel(shown.emoji)} className={cn("text-[3.25rem] leading-none", emojiClassName)}>
        {shown.emoji}
      </span>
    </div>
  )
}

export function ProcessCoverArt({ process, className, emojiClassName }: { process: Process; className?: string; emojiClassName?: string }) {
  return <CoverArt cover={coverOf(process)} fallback={defaultCover(process)} className={className} emojiClassName={emojiClassName} />
}

/** Choose a process cover: an emoji on a tint, or a link to a photo. ThryveMS stores the link, never the file. */
export function CoverDialog({ process, open, onOpenChange }: { process: Process; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { update } = useStore()
  const current = coverOf(process)
  const [tab, setTab] = React.useState<"emoji" | "photo">("emoji")
  const [emoji, setEmoji] = React.useState("⚙️")
  const [tint, setTint] = React.useState<CoverTint>("slate")
  const [url, setUrl] = React.useState("")
  const [error, setError] = React.useState("")
  React.useEffect(() => {
    if (!open) return
    const base = current.kind === "emoji" ? current : defaultCover(process)
    setTab(current.kind)
    setEmoji(base.kind === "emoji" ? base.emoji : "⚙️")
    setTint(base.kind === "emoji" ? base.tint : "slate")
    setUrl(current.kind === "photo" ? current.url : "")
    setError("")
  }, [open])
  const preview: ProcessCover = tab === "photo" && isSafeUrl(url) ? { kind: "photo", url: url.trim() } : tab === "photo" ? defaultCover(process) : { kind: "emoji", emoji, tint }
  function save(cover: ProcessCover | undefined, message: string) {
    update("processes", process.id, { cover })
    toast(message)
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Process cover</DialogTitle>
          <DialogDescription>Shown on the Processes page and at the top of {process.name}. Without a photo, the emoji is used.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <CoverArt cover={preview} fallback={defaultCover(process)} className="h-32 rounded-md border" />
          <span className="absolute bottom-2.5 left-3 rounded-sm bg-card px-2 py-0.5 text-xs font-medium shadow-sm">Preview</span>
        </div>
        <div role="tablist" aria-label="Cover type" className="inline-flex self-start rounded-md bg-muted p-[3px]">
          {(["emoji", "photo"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("h-8 cursor-pointer rounded-sm px-3.5 text-sm font-medium", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              {t === "emoji" ? "Emoji" : "Photo link"}
            </button>
          ))}
        </div>
        {tab === "emoji" ? (
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Emoji</legend>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {COVER_EMOJIS.map(([c, label]) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={label}
                    aria-pressed={emoji === c}
                    onClick={() => setEmoji(c)}
                    className={cn("flex h-11 cursor-pointer items-center justify-center rounded-md border text-[1.375rem] leading-none hover:bg-hover", emoji === c && "border-2 border-foreground bg-muted")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Background</legend>
              <div className="flex flex-wrap gap-2">
                {COVER_TINTS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-label={t.label}
                    aria-pressed={tint === t.id}
                    onClick={() => setTint(t.id)}
                    className={cn("size-11 cursor-pointer rounded-full border", t.className, tint === t.id && "border-2 border-foreground ring-2 ring-inset ring-card")}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <Field label="Photo link" htmlFor="cover-url" error={error || undefined} help="A full https:// link to an image, for example from SharePoint. ThryveMS keeps the link, not the photo. Landscape pictures work best.">
            <Input id="cover-url" type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError("") }} placeholder="https://yourcompany.sharepoint.com/…/line-3.jpg" />
          </Field>
        )}
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => save(undefined, "Default cover restored")}>
            Use the default
          </Button>
          <span className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (tab === "photo") {
                  if (!isSafeUrl(url)) return setError("Use a full https:// link to the image.")
                  return save({ kind: "photo", url: url.trim() }, "Cover saved")
                }
                save({ kind: "emoji", emoji, tint }, "Cover saved")
              }}
            >
              Save cover
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
