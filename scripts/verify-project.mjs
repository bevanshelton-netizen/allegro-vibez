import fs from 'node:fs'
import path from 'node:path'

const required = [
  'package.json','vite.config.js','src/main.jsx','src/App.jsx',
  'src/pages/Login.jsx','src/pages/Register.jsx','src/pages/Upload.jsx','src/pages/MyMusic.jsx',
  'src/services/catalogueService.js','src/lib/supabaseClient.js',
  'supabase/migrations/001_initial_schema.sql','supabase/migrations/002_security_workflows.sql',
  'supabase/migrations/003_discovery_engagement_royalties.sql','supabase/migrations/004_finance_distribution_ai.sql',
  'src/pages/Wallet.jsx','src/pages/Billing.jsx','src/pages/Distribution.jsx','src/pages/DistributionOps.jsx','src/pages/AICreatorSuite.jsx',
  'src/services/walletService.js','src/services/distributionService.js'
]
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)))
if (missing.length) {
  console.error('Missing required files:')
  missing.forEach((file) => console.error(`- ${file}`))
  process.exit(1)
}
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'))
if (!pkg.scripts?.dev || !pkg.dependencies?.react || !pkg.dependencies?.['@supabase/supabase-js']) {
  console.error('package.json is missing required scripts/dependencies.')
  process.exit(1)
}
console.log(`ALLEGRO-VIBEZ project structure OK (${required.length} critical files verified).`)
