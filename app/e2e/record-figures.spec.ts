import { test, expect } from '@playwright/test'
import { clauseCoverage } from '../src/lib/record-figures'
import type { State } from '../src/lib/store'
test('empty and restricted evidence do not fabricate coverage', () => {
  const s = { documents: [], evidence: [{ id: 'EV-1', title: 'Restricted', classification: 'Confidential', processes: [], clauses: ['7.4'], addedDate: '2026-10-15' }] } as unknown as State
  const hidden = clauseCoverage(s, c => c !== 'Confidential', '2026-10-15')
  expect(hidden.hasData).toBe(false)
  expect(hidden.evidence).toHaveLength(0)
  expect(hidden.groups.every(g => g.frac === 'No data')).toBe(true)
  const visible = clauseCoverage(s, () => true, '2026-10-15')
  expect(visible.rows.find(r => r.no === '7.4')?.state).toBe('Evidence current')
  expect(visible.current).toBe(1)
})
