#!/usr/bin/env node
// Upload gate widget files to a Supabase Storage bucket (public).
// Usage:
// 1) Install deps: `npm install @supabase/supabase-js dotenv`
// 2) Set env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET (optional, defaults to 'public')
// 3) Run: `node scripts/upload_to_supabase.js`

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'public';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const repoRoot = path.resolve(__dirname, '..');
const files = [
  'dist/gate-widget.min.js',
  'dist/gate-widget.esm.js'
];

async function uploadFile(relPath) {
  const abs = path.join(repoRoot, relPath);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(2);
  }
  const destKey = `widgets/${path.basename(relPath)}`;
  console.log(`Uploading ${relPath} -> bucket=${BUCKET} key=${destKey} ...`);
  const fileBuf = fs.readFileSync(abs);
  const { data, error } = await supabase.storage.from(BUCKET).upload(destKey, fileBuf, {
    contentType: 'application/javascript',
    upsert: true
  });
  if (error) {
    console.error('Upload failed:', error);
    process.exit(3);
  }
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(destKey);
  console.log('Public URL:', publicData.publicUrl);
}

(async () => {
  for (const f of files) {
    await uploadFile(f);
  }
  console.log('All uploads complete.');
})();
