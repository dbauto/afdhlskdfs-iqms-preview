import * as React from "react"
import { ArchiveIcon, EyeIcon, EllipsisIcon, PencilIcon, Trash2Icon, UndoIcon } from "lucide-react"
import { toast } from "sonner"
import type { To } from "react-router-dom"
import { ContentLink } from "./content-link"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/app/form"
import { Textarea } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/**
 * ISO-aware removal. Quality records are evidence, so:
 *  - drafts are deleted
 *  - records in a workflow are withdrawn (kept, marked withdrawn)
 *  - published or closed records are archived (kept, read-only)
 */
export type RemoveKind = "delete" | "withdraw" | "archive"

const COPY: Record<RemoveKind, { verb: string; title: (n: string) => string; body: string; done: (n: string) => string; icon: React.ReactNode }> = {
  delete: {
    verb: "Delete",
    title: (n) => `Delete ${n}?`,
    body: "This is a draft, so it is removed for good. Nothing else links to it.",
    done: (n) => `${n} deleted`,
    icon: <Trash2Icon />,
  },
  withdraw: {
    verb: "Withdraw",
    title: (n) => `Withdraw ${n}?`,
    body: "The review stops and everyone on the route is told. The record stays in the history as withdrawn, as ISO 9001 needs a trail.",
    done: (n) => `${n} withdrawn`,
    icon: <UndoIcon />,
  },
  archive: {
    verb: "Move to archive",
    title: (n) => `Move ${n} to the archive?`,
    body: "It is no longer in force and becomes read-only. It stays searchable as a record, for the retention period set in Settings.",
    done: (n) => `${n} moved to the archive`,
    icon: <ArchiveIcon />,
  },
}

export function ConfirmRemove({
  open,
  onOpenChange,
  kind,
  name,
  onConfirm,
  reason,
  onReasonChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  kind: RemoveKind
  name: string
  onConfirm: () => void | boolean
  reason?: string
  onReasonChange?: (value: string) => void
}) {
  const c = COPY[kind]
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{c.title(name)}</AlertDialogTitle>
          <AlertDialogDescription>{c.body}</AlertDialogDescription>
        </AlertDialogHeader>
        {onReasonChange && <Field label="Reason" htmlFor="remove-reason"><Textarea id="remove-reason" value={reason ?? ""} onChange={e => onReasonChange(e.target.value)} /></Field>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive-solid"
            disabled={!!onReasonChange && !reason?.trim()}
            onClick={() => {
              if (onConfirm() === false) return
              onOpenChange(false)
              toast(c.done(name))
            }}
          >
            {c.verb}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** The ⋯ menu on every row: open, edit, and the right kind of removal. */
export function RowActions({
  name,
  onOpen,
  openTo,
  onEdit,
  removeKind,
  onRemove,
  extra,
}: {
  name: string
  onOpen?: () => void
  openTo?: To
  onEdit?: () => void
  removeKind?: RemoveKind
  onRemove?: () => void
  extra?: { label: string; onSelect?: () => void; to?: To; icon?: React.ReactNode }[]
}) {
  const [confirm, setConfirm] = React.useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {openTo ? (
            <DropdownMenuItem asChild>
              <ContentLink to={openTo}><EyeIcon /> Open</ContentLink>
            </DropdownMenuItem>
          ) : onOpen && (
            <DropdownMenuItem onSelect={onOpen}>
              <EyeIcon /> Open
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
          )}
          {extra?.map((x) => x.to ? (
            <DropdownMenuItem key={x.label} asChild>
              <ContentLink to={x.to}>{x.icon}{x.label}</ContentLink>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={x.label} onSelect={x.onSelect}>
              {x.icon}
              {x.label}
            </DropdownMenuItem>
          ))}
          {removeKind && onRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
                {COPY[removeKind].icon}
                {COPY[removeKind].verb}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {removeKind && onRemove && <ConfirmRemove open={confirm} onOpenChange={setConfirm} kind={removeKind} name={name} onConfirm={onRemove} />}
    </>
  )
}
