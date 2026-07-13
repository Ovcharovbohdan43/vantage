/**
 * Rasterize Vantage brand marks from SVG → PNG / ICO.
 * Run: node scripts/render-brand-icons.mjs
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const brandDir = join(root, 'public', 'brand')
const appDir = join(root, 'src', 'app')
const publicDir = join(root, 'public')

mkdirSync(brandDir, { recursive: true })

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path fill="#E8FF47" d="M3.2 3.75h4.05L12 15.35 16.75 3.75H20.8L13.55 20.5h-3.1L3.2 3.75Z"/>
  <rect x="1.75" y="9.85" width="20.5" height="1.55" rx="0.35" fill="#E8FF47"/>
</svg>`

function appIconSvg(size, radius) {
  const pad = size * 0.125
  const mark = size - pad * 2
  const scale = mark / 24
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#050505"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">
    <path fill="#E8FF47" d="M3.2 3.75h4.05L12 15.35 16.75 3.75H20.8L13.55 20.5h-3.1L3.2 3.75Z"/>
    <rect x="1.75" y="9.85" width="20.5" height="1.55" rx="0.35" fill="#E8FF47"/>
  </g>
</svg>`
}

/** Transparent mark for in-app raster fallbacks (dark UI). */
function markOnTransparent(size) {
  const scale = size / 24
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <g transform="scale(${scale})">
    <path fill="#F2F4F7" d="M3.2 3.75h4.05L12 15.35 16.75 3.75H20.8L13.55 20.5h-3.1L3.2 3.75Z"/>
    <rect x="1.75" y="9.85" width="20.5" height="1.55" rx="0.35" fill="#F2F4F7"/>
  </g>
</svg>`
}

async function pngFromSvg(svg, size, path) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  writeFileSync(path, buf)
  console.log('wrote', path, `(${size}×${size})`)
}

async function main() {
  writeFileSync(join(brandDir, 'logo-mark.svg'), MARK_SVG)
  writeFileSync(join(brandDir, 'app-icon.svg'), appIconSvg(32, 8))

  // In-app mark rasters (light mark on transparent)
  await pngFromSvg(markOnTransparent(64), 64, join(brandDir, 'logo-mark.png'))
  await pngFromSvg(markOnTransparent(128), 128, join(brandDir, 'logo-mark@2x.png'))
  await sharp(Buffer.from(markOnTransparent(128)))
    .resize(128, 128)
    .webp({ quality: 92 })
    .toFile(join(brandDir, 'logo-mark.webp'))
  await sharp(Buffer.from(markOnTransparent(256)))
    .resize(256, 256)
    .webp({ quality: 92 })
    .toFile(join(brandDir, 'logo-mark@2x.webp'))
  console.log('wrote logo-mark.webp variants')

  // Favicon / app icons — dark squircle + lime mark
  await pngFromSvg(appIconSvg(32, 8), 32, join(appDir, 'icon.png'))
  await pngFromSvg(appIconSvg(180, 40), 180, join(appDir, 'apple-icon.png'))
  await pngFromSvg(appIconSvg(512, 114), 512, join(brandDir, 'app-icon-512.png'))
  await pngFromSvg(appIconSvg(192, 43), 192, join(brandDir, 'app-icon-192.png'))

  // Multi-size ICO for legacy /public/favicon.ico
  const icoPngs = await Promise.all(
    [16, 32, 48].map((s) => sharp(Buffer.from(appIconSvg(s, Math.round(s * 0.25)))).resize(s, s).png().toBuffer()),
  )
  // Minimal ICO writer (PNG-compressed entries)
  writeFileSync(join(publicDir, 'favicon.ico'), buildIco(icoPngs))
  console.log('wrote public/favicon.ico')
}

/** Build a simple ICO file from PNG buffers. */
function buildIco(pngBuffers) {
  const count = pngBuffers.length
  const headerSize = 6 + count * 16
  let offset = headerSize
  const entries = []
  for (const png of pngBuffers) {
    const size = sharpMetaSize(png)
    entries.push({ width: size, height: size, png, offset })
    offset += png.length
  }
  const buf = Buffer.alloc(offset)
  buf.writeUInt16LE(0, 0)
  buf.writeUInt16LE(1, 2)
  buf.writeUInt16LE(count, 4)
  let entryAt = 6
  for (const e of entries) {
    buf.writeUInt8(e.width >= 256 ? 0 : e.width, entryAt)
    buf.writeUInt8(e.height >= 256 ? 0 : e.height, entryAt + 1)
    buf.writeUInt8(0, entryAt + 2)
    buf.writeUInt8(0, entryAt + 3)
    buf.writeUInt16LE(1, entryAt + 4)
    buf.writeUInt16LE(32, entryAt + 6)
    buf.writeUInt32LE(e.png.length, entryAt + 8)
    buf.writeUInt32LE(e.offset, entryAt + 12)
    e.png.copy(buf, e.offset)
    entryAt += 16
  }
  return buf
}

function sharpMetaSize(png) {
  // IHDR width at byte 16
  return png.readUInt32BE(16)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
