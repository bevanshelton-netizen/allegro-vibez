import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
const ignoredExternal = /^(?:[a-z][a-z0-9+.-]*:|#|mailto:|tel:|\/)/i;
const failures = [];

if (!fs.existsSync(path.join(root, 'app.js'))) failures.push('Missing app.js');
if (!fs.existsSync(path.join(root, 'styles.css'))) failures.push('Missing styles.css');

for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const target = match[1].split('#')[0].split('?')[0];
    if (!target || ignoredExternal.test(target)) continue;
    const resolved = path.resolve(root, target);
    if (!resolved.startsWith(path.resolve(root) + path.sep)) {
      failures.push(`${file}: unsafe local reference ${target}`);
      continue;
    }
    if (!fs.existsSync(resolved)) failures.push(`${file}: missing local reference ${target}`);
  }
}

for (const file of fs.readdirSync(root, { withFileTypes: true })) {
  if (!file.isFile() || !file.name.endsWith('.html')) continue;
  const source = fs.readFileSync(path.join(root, file.name), 'utf8');
  if (!/<main\b/i.test(source)) failures.push(`${file.name}: missing semantic <main>`);
  if (!/<title>[^<]+<\/title>/i.test(source)) failures.push(`${file.name}: missing <title>`);
}

const forbiddenRuntimeTerms = ['vercel.app', 'netlify.app', 'NEXT_PUBLIC_', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const file of [...htmlFiles, 'app.js', 'styles.css']) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const term of forbiddenRuntimeTerms) {
    if (source.includes(term)) failures.push(`${file}: contains forbidden runtime term ${term}`);
  }
}

if (failures.length) {
  console.error('ALLEGRO-VIBEZ site check FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ALLEGRO-VIBEZ site check passed: ${htmlFiles.length} HTML pages, local references and runtime isolation verified.`);
