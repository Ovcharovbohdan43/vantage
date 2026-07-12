#!/usr/bin/env node
/**
 * Coordinates dev ports so web always talks to the API instance we start.
 */
import { spawn } from 'node:child_process'
import { execPath } from 'node:process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFreePort, isPortFree } from './find-port.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const preferredWebPort = Number(process.env.PORT || 3000)
const preferredApiPort = Number(process.env.API_PORT || 8000)

let webPort = preferredWebPort
if (!(await isPortFree(preferredWebPort))) {
  webPort = await findFreePort(preferredWebPort + 1, preferredWebPort + 10)
  console.warn(`[dev] Port ${preferredWebPort} is busy — web on http://localhost:${webPort}`)
} else {
  console.log(`[dev] Web http://localhost:${webPort}`)
}

let apiPort = preferredApiPort
if (!(await isPortFree(preferredApiPort))) {
  apiPort = await findFreePort(preferredApiPort + 1, preferredApiPort + 10)
  console.warn(`[dev] Port ${preferredApiPort} is busy — API on http://localhost:${apiPort}`)
  console.warn(
    `[dev] Stop stale processes on :${preferredApiPort} (netstat / Task Manager) for a clean setup.`,
  )
} else {
  console.log(`[dev] API http://localhost:${apiPort}`)
}

const apiUrl = `http://localhost:${apiPort}`
const webUrl = `http://localhost:${webPort}`
const corsOrigins = Array.from(
  new Set([
    webUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ]),
).join(',')

console.log(`[dev] Open the app at ${webUrl}`)
console.log(`[dev] API proxy → ${apiUrl}/api/v1/*`)

const env = {
  ...process.env,
  PORT: String(webPort),
  WEB_PORT: String(webPort),
  API_PORT: String(apiPort),
  API_INTERNAL_URL: apiUrl,
  NEXT_PUBLIC_API_PROXY: '1',
  CORS_ORIGINS: corsOrigins,
  DEV_WEB_PORT_LOCKED: '1',
  DEV_API_PORT_LOCKED: '1',
}

const concurrentlyBin = join(root, 'node_modules', 'concurrently', 'dist', 'bin', 'concurrently.js')

const child = spawn(
  execPath,
  [
    concurrentlyBin,
    '-k',
    '-n',
    'web,api,worker,collector',
    '-c',
    'cyan,magenta,yellow,green',
    'node scripts/run-web.mjs',
    'node scripts/run-api.mjs',
    'node scripts/run-worker.mjs',
    'node scripts/run-collector.mjs',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env,
  },
)

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
child.on('exit', (code) => process.exit(code ?? 0))
