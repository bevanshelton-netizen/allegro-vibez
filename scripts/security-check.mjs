import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const extensions = new Set(['.html', '.js', '.mjs', '.css']);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
}
walk(root);

const forbidden = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /NEXT_PUBLIC_[A-Z0-9_]+/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /sk_(?:live|test)_[A-Za-z0-9]+/i,
  /AKIA[0-9A-Z]{16}/i,
  /secret[_-]?key\s*[:=]\s*["'][^"']{12,}["']/i
];

const failures = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`${path.relative(root, file)}: matched ${pattern}`);
  }
}

if (failures.length) {
  console.error('Security check failed');
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}

console.log(`Security check passed for ${files.length} source files.`);
