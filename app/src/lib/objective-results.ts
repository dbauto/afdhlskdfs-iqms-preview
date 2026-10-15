import type { Objective, ObjectiveResult } from '@/data/types'
import { resultsOf } from '@/data/records'
import { resultInPeriod, type Period } from '@/lib/periods'

/** Shared by dashboard/process health and management review: a missing period is never zero. */
export function latestIn(o: Objective, period: Period): ObjectiveResult | undefined {
  return resultsOf(o).filter(r => resultInPeriod(r.period, period)).sort((a, b) => a.period.localeCompare(b.period)).pop()
}
