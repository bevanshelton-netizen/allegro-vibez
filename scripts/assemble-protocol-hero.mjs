import fs from 'node:fs'
import path from 'node:path'

const partsDir = path.resolve('assets/protocol-hero')
const output = path.resolve('public/sa/protocol/allegro-protocol-hero.webp')
const parts = fs.readdirSync(partsDir)
  .filter(name => /^part-\d+\.b64$/.test(name))
  .sort()

const base64 = parts
  .map(name => fs.readFileSync(path.join(partsDir, name), 'utf8').trim())
  .join('')

if (base64.length !== 83024) {
  throw new Error(`Protocol hero base64 length mismatch: ${base64.length}`)
}

fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, Buffer.from(base64, 'base64'))

const size = fs.statSync(output).size
if (size < 50000) {
  throw new Error(`Protocol hero output too small: ${size}`)
}

console.log(`Assembled ${output} (${size} bytes)`)
