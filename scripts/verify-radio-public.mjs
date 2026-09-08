import fs from 'node:fs'

const required = [
  'radio/owner-node/Caddyfile',
  'radio/owner-node/docker-compose.public.yml',
  'radio/owner-node/public_monitor.py',
  'radio/owner-node/publish-radio.ps1',
]

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`missing public radio file: ${file}`)
}

const windowsCompose = fs.readFileSync('radio/owner-node/docker-compose.windows.yml', 'utf8')
if (!windowsCompose.includes('127.0.0.1:8000:8000')) {
  throw new Error('Icecast must remain localhost-bound in the Windows owner-node stack')
}
if (!windowsCompose.includes('127.0.0.1:8080:8080')) {
  throw new Error('Live ingest must remain localhost-bound in the Windows owner-node stack')
}

const edge = fs.readFileSync('radio/owner-node/docker-compose.public.yml', 'utf8')
if (!edge.includes('"443:443"') || !edge.includes('"80:80"')) {
  throw new Error('Public edge must publish standard HTTPS/HTTP ports')
}

const caddy = fs.readFileSync('radio/owner-node/Caddyfile', 'utf8')
if (!caddy.includes('{$ALLEGRO_RADIO_PUBLIC_HOST}')) {
  throw new Error('Caddy must use the configured public radio hostname')
}
if (!caddy.includes('reverse_proxy @stream icecast:8000')) {
  throw new Error('Public stream must proxy to private Icecast')
}
if (!caddy.includes('respond @admin 404')) {
  throw new Error('Icecast admin routes must not be exposed by the public edge')
}

const radioPage = fs.readFileSync('src/pages/Radio.jsx', 'utf8')
if (!radioPage.includes('VITE_ALLEGRO_RADIO_STREAM_URL')) {
  throw new Error('Radio page must consume VITE_ALLEGRO_RADIO_STREAM_URL')
}

console.log('ALLEGRO_RADIO_PUBLIC_STACK=PASS')
