import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "./page"

export interface Column<T> {
  id: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
  headClassName?: string
}

const PAGE_SIZES = [10, 50, 100]

/**
 * The standard register table.
 * - 10 rows fit in view; more rows scroll inside the panel, with a sticky header
 * - footer with rows per page (10, 50, 100) and previous / next
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  toolbar,
  empty,
  minWidth = 880,
  label,
  rowClassName,
  pageSize: initialSize = 10,
}: {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  toolbar?: React.ReactNode
  empty?: { title: string; body?: string; action?: React.ReactNode }
  minWidth?: number
  label: string
  rowClassName?: (row: T) => string | undefined
  pageSize?: number
}) {
  const [size, setSize] = React.useState(initialSize)
  const [page, setPage] = React.useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pageCount - 1)
  const start = p * size
  const end = Math.min(rows.length, start + size)
  const visible = rows.slice(start, end)

  // back to page 1 when the filter changes the row count
  React.useEffect(() => setPage(0), [rows.length])

  return (
    <section className="min-w-0 rounded-md border bg-card" aria-label={label}>
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-rule-soft px-4 py-3">{toolbar}</div>}
      {rows.length === 0 ? (
        <EmptyState icon={InboxIcon} title={empty?.title ?? "Nothing here yet"} body={empty?.body} action={empty?.action} />
      ) : (
        <div className="max-h-[612px] overflow-auto">
          <Table style={{ minWidth }}>
            <TableHeader>
              <tr>
                {columns.map((c) => (
                  <TableHead key={c.id} className={c.headClassName}>
                    {c.header}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={getRowId(row)} className={cn("hover:bg-[#fafafb]", rowClassName?.(row))}>
                  {columns.map((c) => (
                    <TableCell key={c.id} className={c.className}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 text-[13px] text-muted-foreground">
        <label className="flex items-center gap-2">
          Rows per page
          <NativeSelect
            value={String(size)}
            onChange={(e) => {
              setSize(parseInt(e.target.value, 10))
              setPage(0)
            }}
            className="h-8 w-[76px] text-[13px]"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </label>
        <span aria-live="polite">{rows.length ? `${start + 1}–${end} of ${rows.length}` : "0 of 0"}</span>
        <span className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, p - 1))} disabled={p === 0} aria-label="Previous page">
            <ChevronLeftIcon /> Previous
          </Button>
          <span className="px-2">
            Page {p + 1} of {pageCount}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pageCount - 1, p + 1))} disabled={p >= pageCount - 1} aria-label="Next page">
            Next <ChevronRightIcon />
          </Button>
        </span>
      </div>
    </section>
  )
}
