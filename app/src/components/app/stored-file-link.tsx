import type { StoredFile } from "@/data/types"
import { previewUrl } from "@/lib/uploads"

/**
 * Opens a file kept in ThryveMS storage. The backend serves it through an authenticated route
 * after the same access checks as the record; the preview can only open files added in this session.
 */
export function StoredFileLink({ file, className = "text-[0.8125rem]" }: { file: StoredFile; className?: string }) {
  const url = previewUrl(file.key)
  if (!url) return <span className={`${className} shrink-0 text-muted-foreground`}>Opens once ThryveMS storage is live</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={file.name} className={`${className} shrink-0 font-medium text-primary hover:underline`} aria-label={`Open ${file.name}`}>
      Open
    </a>
  )
}
