import * as React from "react"
import { ChevronDownIcon, FileTextIcon, FolderIcon, LinkIcon, UploadIcon, XIcon } from "lucide-react"

import type { EvidenceFile } from "@/data/types"
import { cn } from "@/lib/utils"
import { formatBytes } from "@/lib/uploads"

interface Folder {
  name: string
  path: string
  files: { file: EvidenceFile; index: number }[]
  folders: Folder[]
}

/** files grouped into their folders and subfolders, folders first, both sorted by name */
export function folderTree(files: EvidenceFile[]): Folder {
  const root: Folder = { name: "", path: "", files: [], folders: [] }
  files.forEach((file, index) => {
    let at = root
    for (const part of (file.folder ?? "").split("/").filter(Boolean)) {
      const path = at.path ? `${at.path}/${part}` : part
      let next = at.folders.find((f) => f.name === part)
      if (!next) at.folders.push((next = { name: part, path, files: [], folders: [] }))
      at = next
    }
    at.files.push({ file, index })
  })
  const sort = (f: Folder) => {
    f.folders.sort((a, b) => a.name.localeCompare(b.name))
    f.folders.forEach(sort)
  }
  sort(root)
  return root
}

const countFiles = (f: Folder): number => f.files.length + f.folders.reduce((n, x) => n + countFiles(x), 0)

/**
 * An evidence pack as a tree: folders open and close, each file or link on its own row.
 * Used in the evidence panel (with Remove) and on the evidence page (with Open).
 */
export function FileTree({ files, onRemove, action, label }: { files: EvidenceFile[]; onRemove?: (index: number) => void; action?: (file: EvidenceFile) => React.ReactNode; label: string }) {
  const root = folderTree(files)
  return (
    <ul aria-label={label} className="flex flex-col">
      <FolderRows folder={root} depth={0} onRemove={onRemove} action={action} />
    </ul>
  )
}

function FolderRows({ folder, depth, onRemove, action }: { folder: Folder; depth: number; onRemove?: (index: number) => void; action?: (file: EvidenceFile) => React.ReactNode }) {
  const pad = { paddingLeft: `${0.75 + depth * 1.25}rem` }
  return (
    <>
      {folder.folders.map((f) => (
        <li key={f.path} className="border-t border-rule-soft first:border-t-0">
          <details open className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-2 pr-3 text-[0.8125rem] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden" style={pad}>
              <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground -rotate-90 transition-transform group-open:rotate-0" aria-hidden="true" />
              <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{countFiles(f) === 1 ? "1 item" : `${countFiles(f)} items`}</span>
            </summary>
            <ul>
              <FolderRows folder={f} depth={depth + 1} onRemove={onRemove} action={action} />
            </ul>
          </details>
        </li>
      ))}
      {folder.files.map(({ file, index }) => (
        <li key={`${file.name}-${index}`} className={cn("flex items-center gap-2 border-t border-rule-soft py-2 pr-3 text-[0.8125rem] first:border-t-0")} style={pad}>
          {file.stored ? <UploadIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Uploaded" /> : file.kind === "Link" ? <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Link" /> : <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Linked file" />}
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          {file.stored && <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.stored.size)}</span>}
          {action?.(file)}
          {onRemove && (
            <button type="button" onClick={() => onRemove(index)} className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove ${file.name}`}>
              <XIcon className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </>
  )
}
