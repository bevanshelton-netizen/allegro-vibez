import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = fs.readdirSync(root).filter(name => name.endsWith('.html') || name.endsWith('.js') || name.endsWith('.css'));
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
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`${file}: matched ${pattern}`);
  }
}

if (failures.length) {
  console.error('Security check failed');
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}

console.log(`Security check passed for ${files.length} frontend files.`);
