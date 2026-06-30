#!/usr/bin/env node
// Real-runtime check: boots the integration Worker in workerd via `wrangler dev`,
// drives DurableObjectStore through an actual Durable Object, and asserts the
// observed behavior. Exit 0 = pass. Requires network (npx fetches wrangler).
//
// Run:  node integration/verify.mjs   (from the @redtuma/store-do package root)
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const cwd = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 8788)
const URL = `http://127.0.0.1:${PORT}/?t=demo`

const child = spawn('npx', ['--yes', 'wrangler', 'dev', '--port', String(PORT), '--local'], {
  cwd,
  detached: true,
  stdio: ['ignore', 'inherit', 'inherit'],
})

function shutdown() {
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    /* already gone */
  }
}

async function main() {
  // Poll until workerd is ready (cold start can take ~10s).
  let body
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(URL)
      if (res.ok) {
        body = await res.json()
        break
      }
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  if (!body) throw new Error('Worker did not respond within 60s.')

  const checks = [
    ['ok flag', body.ok === true],
    ['thread persisted', body.threadFound === true],
    ['message order', JSON.stringify(body.ids) === JSON.stringify(['m1', 'm2', 'm3'])],
    ['last window', JSON.stringify(body.last2) === JSON.stringify(['m2', 'm3'])],
    ['snapshot persisted', body.snap && body.snap.cursor === 5],
  ]

  let failed = false
  for (const [name, pass] of checks) {
    console.log(`${pass ? '✓' : '✗'} ${name}`)
    if (!pass) failed = true
  }
  if (failed) throw new Error(`Assertions failed: ${JSON.stringify(body)}`)
  console.log('\nPASS — DurableObjectStore verified on real workerd.')
}

main()
  .then(() => {
    shutdown()
    process.exit(0)
  })
  .catch((err) => {
    console.error(`\nFAIL — ${err.message}`)
    shutdown()
    process.exit(1)
  })
