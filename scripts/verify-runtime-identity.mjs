import fs from 'node:fs'

const docker = fs.readFileSync('Dockerfile','utf8')
const nginx = fs.readFileSync('deploy/nginx.conf','utf8')

const requiredDocker = [
  'ARG IZAKHONO_RELEASE_ID=UNATTESTED',
  'org.opencontainers.image.revision="$IZAKHONO_RELEASE_ID"',
  '"product":"allegro-vibez"',
  '"release_id":"%s"',
  '"health_schema":"izakhono.runtime.health.v1"',
  '/usr/share/nginx/html/healthz.json',
]
for (const needle of requiredDocker) {
  if (!docker.includes(needle)) throw new Error('Missing runtime identity contract in Dockerfile: '+needle)
}

const requiredNginx = [
  'location = /healthz',
  'default_type application/json',
  'alias /usr/share/nginx/html/healthz.json',
  'Cache-Control "no-store"',
]
for (const needle of requiredNginx) {
  if (!nginx.includes(needle)) throw new Error('Missing runtime identity contract in nginx config: '+needle)
}

console.log('ALLEGRO_RUNTIME_RELEASE_IDENTITY=PASS')
