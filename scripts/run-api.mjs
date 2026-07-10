#!/usr/bin/env node
/**
 * Starts FastAPI with uvicorn. Uses apps/api/.venv if present, else system python.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFreePort, isPortFree } from './find-port.mjs'
import {
  getVenvPython,
  printPythonInstallHint,
  resolveSystemPython,
} from './resolve-python.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiDir = join(__dirname, '..', 'apps', 'api')
const venvPython = getVenvPython(apiDir)
const requirementsPath = join(apiDir, 'requirements.txt')

function ensureApiImports(pythonCmd, useShell) {
  const check = spawnSync(
    pythonCmd,
    ['-c', 'from app.main import app'],
    { cwd: apiDir, stdio: 'pipe', shell: useShell, encoding: 'utf8' },
  )
  if (check.status === 0) return true

  const err = `${check.stderr || ''}${check.stdout || ''}`
  if (!existsSync(requirementsPath)) {
    console.error('[api] Failed to import app.main:', err.trim())
    return false
  }

  console.warn('[api] Missing Python dependencies — running pip install -r requirements.txt')
  const install = spawnSync(
    pythonCmd,
    ['-m', 'pip', 'install', '-r', 'requirements.txt'],
    { cwd: apiDir, stdio: 'inherit', shell: useShell },
  )
  if (install.status !== 0) {
    console.error('[api] pip install failed. Run: npm run setup:api')
    return false
  }

  const retry = spawnSync(
    pythonCmd,
    ['-c', 'from app.main import app'],
    { cwd: apiDir, stdio: 'pipe', shell: useShell, encoding: 'utf8' },
  )
  if (retry.status !== 0) {
    console.error('[api] Still cannot import app.main:', (retry.stderr || retry.stdout || '').trim())
    return false
  }
  return true
}
const preferredPort = Number(process.env.API_PORT || 8000)
const portLocked = process.env.DEV_API_PORT_LOCKED === '1'

let port
if (portLocked) {
  port = preferredPort
  if (!(await isPortFree(port))) {
    console.error(`[api] Port ${port} is busy but required by dev orchestrator. Stop the other process and retry.`)
    process.exit(1)
  }
} else {
  port = (await isPortFree(preferredPort))
    ? preferredPort
    : await findFreePort(preferredPort + 1, preferredPort + 10)
}

if (port !== preferredPort) {
  console.warn(`[api] Port ${preferredPort} is busy — using http://localhost:${port}`)
} else {
  console.log(`[api] http://localhost:${port}`)
}

let cmd
let args

if (existsSync(venvPython)) {
  cmd = venvPython
  args = ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', String(port)]
} else {
  const systemPython = resolveSystemPython()
  if (!systemPython) {
    printPythonInstallHint()
    process.exit(1)
  }
  console.warn('[api] .venv not found — using system Python. Run: npm run setup')
  cmd = systemPython.cmd
  args = [
    ...systemPython.args,
    '-m',
    'uvicorn',
    'app.main:app',
    '--reload',
    '--host',
    '0.0.0.0',
    '--port',
    String(port),
  ]
}

const useShell = !existsSync(cmd)

if (!ensureApiImports(cmd, useShell)) {
  process.exit(1)
}

const child = spawn(cmd, args, {
  cwd: apiDir,
  stdio: 'inherit',
  shell: useShell,
  env: { ...process.env, PYTHONUNBUFFERED: '1' },
})

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
child.on('exit', (code) => process.exit(code ?? 0))
