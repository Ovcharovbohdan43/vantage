import net from 'node:net'

/**
 * Returns true if something is already accepting connections on the port.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => {
      resolve(false)
    })
  })
}

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export async function isPortFree(port) {
  return !(await isPortInUse(port))
}

/**
 * @param {number} [start]
 * @param {number} [max]
 * @returns {Promise<number>}
 */
export async function findFreePort(start = 3000, max = 3010) {
  for (let port = start; port <= max; port++) {
    if (await isPortFree(port)) return port
  }
  throw new Error(`No free port between ${start} and ${max}`)
}
