import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolve a Python executable for local dev on Windows/macOS/Linux.
 * Windows: prefers `py` launcher (python.org installer).
 */
export function getVenvPython(apiDir) {
  return process.platform === 'win32'
    ? join(apiDir, '.venv', 'Scripts', 'python.exe')
    : join(apiDir, '.venv', 'bin', 'python')
}

function commandWorks(cmd, args = ['--version']) {
  const r = spawnSync(cmd, args, {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  return r.status === 0
}

export function resolveSystemPython() {
  const candidates =
    process.platform === 'win32'
      ? [
          ['py', ['-3.12']],
          ['py', ['-3.13']],
          ['py', ['-3']],
          ['py', []],
          ['python3', []],
          ['python', []],
        ]
      : [
          ['python3.12', []],
          ['python3', []],
          ['python', []],
        ]

  for (const [cmd, extraArgs] of candidates) {
    if (commandWorks(cmd, [...extraArgs, '--version'])) {
      return { cmd, args: extraArgs }
    }
  }

  return null
}

export function printPythonInstallHint() {
  console.error(`
Python not found.

Install Python 3.12+ and ensure it is on PATH:
  Windows: https://www.python.org/downloads/  (check "Add python.exe to PATH")
           or: winget install Python.Python.3.12

After install, reopen the terminal and run: npm run setup
`)
}
