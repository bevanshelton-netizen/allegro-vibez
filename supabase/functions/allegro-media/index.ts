import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'allegro-vibez-audio';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

function safePath(value: unknown) {
  if (typeof value !== 'string' || !value || value.includes('..') || value.startsWith('/') || value.includes('\\')) throw new Error('Invalid object path');
  return value;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
    const body = await req.json();
    const action = body?.action;
    const path = safePath(body?.path);

    if (action === 'sign-upload') {
      const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
      if (error) return json(400, { error: error.message });
      return json(200, { data: { path, token: data.token, signedUrl: data.signedUrl, expiresIn: 7200 } });
    }

    if (action === 'sign-download') {
      const expiresIn = Number(body?.expiresIn ?? 900);
      if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 3600) throw new Error('expiresIn must be between 60 and 3600 seconds');
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresIn);
      if (error) return json(404, { error: error.message });
      return json(200, { data: { path, signedUrl: data.signedUrl, expiresIn } });
    }

    if (action === 'verify') {
      const lastSlash = path.lastIndexOf('/');
      const folder = lastSlash === -1 ? '' : path.slice(0, lastSlash);
      const filename = path.slice(lastSlash + 1);
      const { data, error } = await admin.storage.from(BUCKET).list(folder, { search: filename, limit: 10 });
      if (error) return json(404, { error: error.message });
      const match = (data ?? []).find((item) => item.name === filename);
      if (!match) return json(404, { error: 'Object not found' });
      return json(200, { data: { path, name: match.name, sizeBytes: Number(match.metadata?.size ?? 0), contentType: match.metadata?.mimetype ?? null, updatedAt: match.updated_at ?? null } });
    }

    return json(400, { error: 'Unsupported action' });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : 'Invalid request' });
  }
});
