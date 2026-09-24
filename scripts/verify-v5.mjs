import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'src/pages/FanDashboard.jsx',
  'src/pages/PlaylistLibrary.jsx',
  'src/pages/PublicPlaylist.jsx',
  'src/pages/PrivacySettings.jsx',
  'src/pages/SupportCentre.jsx',
  'src/pages/AdminSupport.jsx',
  'src/pages/AdminAudit.jsx',
  'src/services/fanService.js',
  'src/services/supportService.js',
  'supabase/migrations/005_fan_admin_support.sql',
  'docs/V5_DEPLOYMENT_SEQUENCE.md',
]

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)))
if (missing.length) {
  console.error('Missing v5 files:', missing)
  process.exit(1)
}

const migration = fs.readFileSync(path.join(root, 'supabase/migrations/005_fan_admin_support.sql'), 'utf8')
const controls = ['enable row level security', 'public.is_staff()', 'playlist item owner insert', 'support owner select']
const absent = controls.filter((needle) => !migration.includes(needle))
if (absent.length) {
  console.error('Missing v5 controls:', absent)
  process.exit(1)
}

console.log('ALLEGRO-VIBEZ v5 verification passed.')
