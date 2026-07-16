import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Load .env.local / .env so the service-role key can live in a gitignored file
// instead of being exported in the shell on every run. Shell env still wins.
for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // Ignore malformed or unreadable env files; env vars remain optional.
    }
  }
}

// Publish the score-source icons used by the insights "Score Profile" chart and
// the Scoring-DNA cards into the public tm-score-icons bucket.
//
//   full art  -> tm-score-icons/{Name}.png       (unchanged; ~1 MB source art)
//   axis icon -> tm-score-icons/axis/{Name}.png   (96px, ~15 KB)
//
// The axis variants exist so the horizontal bar chart can render ten icons at
// ~24px without downloading ~12 MB of full-res PNGs. The bucket only allows
// image/png, so the axis variants stay PNG (palette-compressed). Idempotent: re-running
// upserts the same keys. Source PNGs live under assets/transparent_icons/.
//
// Usage:
//   tsx scripts/catalog/upload-score-icons.ts [--dry-run]

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_SCORE_ICONS ?? 'tm-score-icons';
const SOURCE_DIR = join('assets', 'transparent_icons');

// Icons render at ~22-28px on the axis; 96px is crisp at 3x without shipping the
// full-res PNG. Lossless keeps the transparent alpha edges clean.
const AXIS_DISPLAY_WIDTH = 96;

type UploadJob = {
  body: Buffer;
  contentType: string;
  key: string;
  label: string;
};

function createServiceClient(url: string, key: string) {
  return createClient(url, key);
}
type ServiceClient = ReturnType<typeof createServiceClient>;

async function ensurePublicBucket(supabase: ServiceClient, bucket: string) {
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (data) {
    if (!data.public) {
      const { error: updateError } = await supabase.storage.updateBucket(bucket, {
        public: true,
      });
      if (updateError) {
        throw updateError;
      }
      console.log(`  made bucket ${bucket} public`);
    }
    return;
  }

  if (error && !/not found/i.test(error.message)) {
    throw error;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
  });
  if (createError) {
    throw createError;
  }
  console.log(`  created public bucket ${bucket}`);
}

function toOptimizedPng(source: Buffer, width: number): Promise<Buffer> {
  return sharp(source)
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

async function buildAxisJobs(): Promise<UploadJob[]> {
  const files = readdirSync(SOURCE_DIR).filter(
    (file) => extname(file).toLowerCase() === '.png',
  );

  return Promise.all(
    files.map(async (file) => {
      const name = basename(file, '.png');
      const source = readFileSync(join(SOURCE_DIR, file));
      return {
        body: await toOptimizedPng(source, AXIS_DISPLAY_WIDTH),
        contentType: 'image/png',
        key: `axis/${name}.png`,
        label: `axis ${name}`,
      };
    }),
  );
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL before running this upload.');
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Set SUPABASE_SERVICE_ROLE_KEY before running this upload. ' +
        'Find it in Supabase → Project Settings → API → service_role key.',
    );
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const jobs = await buildAxisJobs();

  console.log(`Prepared ${jobs.length} axis icons from ${SOURCE_DIR}.`);

  if (dryRun) {
    console.log('\n--dry-run: no bucket changes or uploads performed.');
    for (const job of jobs) {
      console.log(`  ${BUCKET}/${job.key}  (${(job.body.byteLength / 1024).toFixed(1)} KB)`);
    }
    return;
  }

  console.log('Ensuring bucket…');
  await ensurePublicBucket(supabase, BUCKET);

  const failures: Array<{ label: string; reason: string }> = [];
  let uploaded = 0;

  for (const job of jobs) {
    const { error } = await supabase.storage.from(BUCKET).upload(job.key, job.body, {
      contentType: job.contentType,
      upsert: true,
    });

    if (error) {
      failures.push({ label: job.label, reason: error.message });
      continue;
    }

    uploaded += 1;
  }

  const prefix = supabase.storage.from(BUCKET).getPublicUrl('axis/').data.publicUrl;
  console.log(`\nDone. Uploaded ${uploaded}/${jobs.length}.`);
  console.log(`Axis icons public prefix: ${prefix}`);

  if (failures.length > 0) {
    console.log(`\n${failures.length} failures:`);
    for (const failure of failures) {
      console.log(`  ${failure.label}: ${failure.reason}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('upload-score-icons.ts')) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : JSON.stringify(error, null, 2));
    process.exit(1);
  });
}
