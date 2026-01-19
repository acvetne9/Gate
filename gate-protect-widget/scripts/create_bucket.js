#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'public';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  try {
    const { data, error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message || '')) {
      console.error('Create bucket error', error);
      process.exit(2);
    }
    console.log('Bucket created or already exists');
  } catch (e) {
    console.error('Create bucket exception', e.message || e);
    process.exit(3);
  }
})();
