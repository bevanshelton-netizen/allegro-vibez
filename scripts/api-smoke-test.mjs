import { spawn } from 'node:child_process';
import net from 'node:net';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const port = await getFreePort();
const child = spawn(process.execPath, ['server/app.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

async function waitForHealth() {
  const url = `http://127.0.0.1:${port}/healthz`;
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`server did not become healthy: ${stderr}`);
}

async function expect(path, expectedStatus, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}`);
  }
  return response;
}

try {
  await waitForHealth();

  const health = await expect('/healthz', 200);
  const healthBody = await health.json();
  if (healthBody.persistence !== 'NOT_CONFIGURED') throw new Error('health persistence boundary failed');
  if (!health.headers.get('x-content-type-options')) throw new Error('security headers missing');
  if (!health.headers.get('x-request-id')) throw new Error('request tracing header missing');

  const apiHealth = await expect('/api/v1/health', 200);
  if (!apiHealth.headers.get('x-request-id')) throw new Error('API request tracing header missing');
  await expect('/api/v1/does-not-exist', 501);
  await expect('/does-not-exist', 404);

  const malformed = await expect('/api/v1/auth/register', 400, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not-json',
  });
  const malformedBody = await malformed.json();
  if (malformedBody.error !== 'INVALID_JSON') throw new Error('malformed JSON contract failed');

  const tooLarge = await expect('/api/v1/auth/register', 413, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ padding: 'x'.repeat(1024 * 1024 + 1) }),
  });
  const tooLargeBody = await tooLarge.json();
  if (tooLargeBody.error !== 'PAYLOAD_TOO_LARGE') throw new Error('payload size contract failed');

  const cors = await expect('/api/v1/health', 200, {
    headers: { origin: 'https://example.invalid' },
  });
  if (cors.headers.get('access-control-allow-origin') !== 'null') throw new Error('CORS origin boundary failed');

  console.log('API smoke verification: PASS');
} finally {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
}
