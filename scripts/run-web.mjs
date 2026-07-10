#!/usr/bin/env node
/**
 * Starts Next.js dev server on first free port (3000–3010).
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFreePort, isPortFree } from './find-port.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webDir = join(__dirname, '..', 'apps', 'web')
const preferredPort = Number(process.env.WEB_PORT || process.env.PORT || 3000)
const portLocked = process.env.DEV_WEB_PORT_LOCKED === '1'

let port
if (portLocked) {
  port = preferredPort
  if (!(await isPortFree(port))) {
    console.error(`[web] Port ${port} is busy but required by dev orchestrator. Stop the other process and retry.`)
    process.exit(1)
  }
} else {
  port = preferredPort
  if (!(await isPortFree(preferredPort))) {
    port = await findFreePort(preferredPort + 1, preferredPort + 10)
    console.warn(`[web] Port ${preferredPort} is busy — using http://localhost:${port}`)
  } else {
    console.log(`[web] http://localhost:${port}`)
  }
}

const child = spawn(`npm run dev -- -p ${port}`, {
  cwd: webDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: String(port) },
})

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
child.on('exit', (code) => process.exit(code ?? 0))
