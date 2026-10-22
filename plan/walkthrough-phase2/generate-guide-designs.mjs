import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const phase1 = path.resolve(here, '../walkthrough-phase1/menu-inventory.csv')
function parse(text) {
  const rows = []; let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (c === ',' && !quoted) { row.push(cell); cell = '' }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  const header = rows.shift().map(x => x.replace(/^\uFEFF/, ''))
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])))
}
const menus = parse(fs.readFileSync(phase1, 'utf8'))
assert.equal(menus.length, 43)
const rows = menus.map(m => {
  const excluded = m.route === '/management-review'
  return {
    guide_id: m.guide_id,
    version: '0.1.0-design',
    console: m.console,
    page_label: m.label,
    route: m.route,
    disposition: excluded ? 'OWNER-APPROVED EXCLUSION' : 'GUIDE DESIGN CANDIDATE',
    play_label: excluded ? '' : 'Play walkthrough',
    play_position: excluded ? '' : 'Existing page-header action area; secondary/outline button; compact icon with same accessible name',
    start_target: excluded ? '' : `role=heading name="${m.label}" or the page's exact rendered h1 when it differs`,
    step_sequence: excluded ? '' : 'Orient to page purpose > explain visible status/filters > explain permitted primary records/actions > explain help/recovery > finish without business mutation',
    permission_rule: excluded ? 'Retain normal application authorization; no walkthrough offered' : 'Re-evaluate organization, active user, area/module, process/classification, assignment and workflow state before every step',
    success_rule: excluded ? '' : 'All eligible explanatory steps viewed; business completion remains authoritative application state',
    recovery_rule: excluded ? 'Reassess after Management Review is finalized' : 'Use REC-001..015; never invent, reveal, enable or click a forbidden target',
    copy_status: excluded ? 'Approved exclusion rationale' : 'Candidate copy pattern; page-specific review pending',
    approval_status: excluded ? 'Owner approved 22 Oct 2026' : 'Owner review pending',
  }
})
const cols = Object.keys(rows[0])
const q = v => '"' + String(v ?? '').replaceAll('"', '""') + '"'
fs.writeFileSync(path.join(here, 'guide-designs.csv'), [cols, ...rows.map(r => cols.map(c => r[c]))].map(r => r.map(q).join(',')).join('\n') + '\n')
console.log(JSON.stringify({ menu_rows: menus.length, guide_candidates: rows.filter(r => r.disposition === 'GUIDE DESIGN CANDIDATE').length, approved_exclusions: rows.filter(r => r.disposition === 'OWNER-APPROVED EXCLUSION').length }))
