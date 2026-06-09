import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      crcTable[n] = c
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createIHDR(width, height) {
  const buf = Buffer.alloc(13)
  buf.writeUInt32BE(width, 0)
  buf.writeUInt32BE(height, 4)
  buf[8] = 8
  buf[9] = 6
  buf[10] = 0
  buf[11] = 0
  buf[12] = 0
  return buf
}

function createChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type)
  const crc = crc32(Buffer.concat([typeBuf, data]))
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makePng(size) {
  const pixels = size * size * 4
  const raw = Buffer.alloc(pixels)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const cx = size / 2
      const cy = size / 2
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const radius = size * 0.42
      if (dist < radius) {
        raw[i] = 185
        raw[i + 1] = 28
        raw[i + 2] = 28
        raw[i + 3] = 255
      } else {
        raw[i + 3] = 0
      }
    }
  }
  const filtered = Buffer.alloc(raw.length + size)
  let offset = 0
  for (let y = 0; y < size; y++) {
    filtered[offset++] = 0
    raw.copy(filtered, offset, y * size * 4, (y + 1) * size * 4)
    offset += size * 4
  }
  const compressed = deflateSync(filtered)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = createChunk('IHDR', createIHDR(size, size))
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))
  return Buffer.concat([signature, ihdr, idat, iend])
}

writeFileSync(join(publicDir, 'pwa-192.png'), makePng(192))
writeFileSync(join(publicDir, 'pwa-512.png'), makePng(512))
console.log('Icons generated!')
