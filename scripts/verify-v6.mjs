import fs from 'node:fs'

const mustExist = [
  'supabase/migrations/006_launch_hardening.sql',
  'src/components/ErrorBoundary.jsx',
  'src/pages/CopyrightCentre.jsx',
  'src/pages/AdminCopyright.jsx',
  'src/pages/AdminRisk.jsx',
  'src/pages/SystemHealth.jsx',
  'src/services/copyrightService.js',
  'src/services/riskService.js',
  'src/services/opsService.js',
  'docs/V6_LAUNCH_READINESS.md',
  'docs/BACKUP_RESTORE_RUNBOOK.md',
  'docs/CROSS_ACCOUNT_TEST_MATRIX.md',
]

const missing = mustExist.filter((file) => !fs.existsSync(file))
if (missing.length) {
  console.error('v6 verification failed. Missing:', missing)
  process.exit(1)
}

const sql = fs.readFileSync('supabase/migrations/006_launch_hardening.sql','utf8')
for (const needle of ['create_copyright_case','resolve_copyright_case','review_risk_flag','operational_events','audit_logs']) {
  if (!sql.includes(needle)) {
    console.error(`v6 verification failed: ${needle} not found.`)
    process.exit(1)
  }
}
const app = fs.readFileSync('src/App.jsx','utf8')
for (const route of ['/copyright','/admin/copyright','/admin/risk','/admin/health']) {
  if (!app.includes(route)) {
    console.error(`v6 verification failed: route ${route} not found.`)
    process.exit(1)
  }
}
console.log('v6 launch hardening verification: PASS')
