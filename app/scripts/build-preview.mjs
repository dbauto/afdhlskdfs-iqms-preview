import { rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
// A preview must not retain assets from an earlier regular production build.
await rm('dist', { recursive: true, force: true })
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'hash'], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status || 1)
await import('./copy-preview.mjs')
