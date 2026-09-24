import fs from 'node:fs'

const requiredFiles = [
  'src/pages/AdminReview.jsx',
  'src/pages/AdminDashboard.jsx',
  'src/services/adminService.js',
  'supabase/migrations/007_moderation_release_controls.sql',
]

const missing = requiredFiles.filter((file) => !fs.existsSync(file))
if (missing.length) {
  console.error(`v7 verification failed. Missing: ${missing.join(', ')}`)
  process.exit(1)
}

const app = fs.readFileSync('src/App.jsx', 'utf8')
const migration = fs.readFileSync('supabase/migrations/007_moderation_release_controls.sql', 'utf8')
const review = fs.readFileSync('src/pages/AdminReview.jsx', 'utf8')
const artist = fs.readFileSync('src/services/artistService.js', 'utf8')

const checks = [
  [app.includes('/admin/releases'), 'Admin release-review route'],
  [migration.includes('revoke update on public.releases from authenticated'), 'Release status column hardening'],
  [migration.includes("insert into public.notifications"), 'Artist moderation notification'],
  [migration.includes('moderation_cases_one_open_per_release'), 'One-open-case constraint'],
  [review.includes('getReleaseReviewDetail'), 'Detailed review evidence loader'],
  [review.includes('Reason for decision'), 'Reasoned moderation UX'],
  [review.includes('Publish approved release'), 'Separate approval and publication UX'],
  [artist.includes('isArtistProfileComplete'), 'Artist profile completion logic'],
  [!artist.includes("role: 'artist'"), 'No client role mutation in artist profile service'],
]

const failed = checks.filter(([ok]) => !ok).map(([, label]) => label)
if (failed.length) {
  console.error(`v7 verification failed: ${failed.join('; ')}`)
  process.exit(1)
}
console.log('ALLEGRO-VIBEZ v7 moderation and workflow verification: PASS')
