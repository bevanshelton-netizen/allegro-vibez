import fs from 'node:fs'

const checks = [
  ['src/pages/SheltonProtocol.jsx', ['SHELTON PROTOCOL™','South African creative','shelton_protocol_passports']],
  ['src/styles/shelton-protocol.css', ['protocol-hero','protocol-stage-rail','protocol-passport-wrap']],
  ['supabase/migrations/20260911_shelton_protocol_sa.sql', ['shelton_protocol_passports','enable row level security','licensed_partner_reference']],
  ['src/App.jsx', ['/sa/protocol','SheltonProtocol']],
  ['src/main.jsx', ['shelton-protocol.css']],
]

let failed = false
for (const [path, needles] of checks) {
  if (!fs.existsSync(path)) {
    console.error('Missing:', path)
    failed = true
    continue
  }
  const text = fs.readFileSync(path,'utf8')
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`Missing "${needle}" in ${path}`)
      failed = true
    }
  }
}
if (failed) process.exit(1)
console.log('SHELTON PROTOCOL™ South Africa integration checks passed.')
