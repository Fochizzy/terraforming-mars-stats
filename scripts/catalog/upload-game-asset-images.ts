import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { getPublicEnv } from '../../src/lib/env';

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

// Upload the game's static art — tag icons and board-map images — into public
// Supabase Storage buckets so the app self-hosts them (rather than shipping them
// in the Next.js bundle or hotlinking a third party). Keys are deterministic so
// the UI can build a URL from a tag code / map slug without a DB round-trip:
//
//   tag icon  -> tm-tag-icons/{tagCode}.webp   (e.g. tm-tag-icons/science.webp)
//   map image -> tm-map-images/{mapSlug}.webp  (e.g. tm-map-images/tharsis.webp)
//
// Idempotent: re-running upserts the same keys. Source PNGs live under assets/.
//
// Usage:
//   tsx scripts/catalog/upload-game-asset-images.ts [--dry-run]

const TAG_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_TAG_ICONS ?? 'tm-tag-icons';
const MAP_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_MAP_IMAGES ?? 'tm-map-images';

const TAG_SOURCE_DIR = join('assets', 'tags');
const MAP_SOURCE_DIR = join('assets', 'maps');

// Icons are displayed at ~16-28px inline and up to ~48px in legends, so a 128px
// source is crisp at 2x without shipping the full-res PNG. Lossless keeps the
// alpha edges clean.
const TAG_DISPLAY_WIDTH = 128;
// Map art is shown large in a dialog; 1400px covers a full-width modal at 2x.
const MAP_DISPLAY_WIDTH = 1400;
const MAP_WEBP_QUALITY = 82;

// Map PNG file name -> deterministic storage slug. Each slug matches a
// maps.code row so the UI can link straight from map references to map art.
const MAP_FILE_TO_SLUG: Record<string, string> = {
  'Amazonis Planatia.png': 'amazonis_planitia',
  'Arabia Terra.png': 'arabia_terra',
  'Elysium.png': 'elysium',
  'Hellas.png': 'hellas',
  'Hollandia.png': 'hollandia',
  'Terra Cimmeria.png': 'terra_cimmeria',
  'Terra Cimmeria Nova.png': 'terra_cimmeria_nova',
  'Tharsis.png': 'tharsis',
  'Utopia Planitia.png': 'utopia_planitia',
  'Vastitas Borealis Nova.png': 'vastitas_borealis_nova',
  'Vastitas Borealis.png': 'vastitas_borealis',
};

type UploadJob = {
  body: Buffer;
  bucket: string;
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
      const { error: updateError } = await supabase.storage.updateBucket(
        bucket,
        { public: true },
      );
      if (updateError) {
        throw updateError;
      }
      console.log(`  made bucket ${bucket} public`);
    }
    return;
  }

  // getBucket returns an error for a missing bucket; create it public.
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

function toWebp(source: Buffer, width: number, lossless: boolean): Promise<Buffer> {
  return sharp(source)
    .resize({ width, withoutEnlargement: true })
    .webp(lossless ? { lossless: true } : { quality: MAP_WEBP_QUALITY })
    .toBuffer();
}

async function buildTagJobs(): Promise<UploadJob[]> {
  const files = readdirSync(TAG_SOURCE_DIR).filter(
    (file) => extname(file).toLowerCase() === '.png',
  );

  return Promise.all(
    files.map(async (file) => {
      const code = basename(file, '.png');
      const source = readFileSync(join(TAG_SOURCE_DIR, file));
      return {
        body: await toWebp(source, TAG_DISPLAY_WIDTH, true),
        bucket: TAG_BUCKET,
        key: `${code}.webp`,
        label: `tag ${code}`,
      };
    }),
  );
}

async function buildMapJobs(): Promise<UploadJob[]> {
  return Promise.all(
    Object.entries(MAP_FILE_TO_SLUG).map(async ([file, slug]) => {
      const source = readFileSync(join(MAP_SOURCE_DIR, file));
      return {
        body: await toWebp(source, MAP_DISPLAY_WIDTH, false),
        bucket: MAP_BUCKET,
        key: `${slug}.webp`,
        label: `map ${slug}`,
      };
    }),
  );
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run');

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'Set SUPABASE_SERVICE_ROLE_KEY before running this upload. ' +
        'Find it in Supabase → Project Settings → API → service_role key.',
    );
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const [tagJobs, mapJobs] = await Promise.all([buildTagJobs(), buildMapJobs()]);
  const jobs = [...tagJobs, ...mapJobs];

  console.log(
    `Prepared ${tagJobs.length} tag icons + ${mapJobs.length} map images.`,
  );

  if (dryRun) {
    console.log('\n--dry-run: no bucket changes or uploads performed.');
    for (const job of jobs) {
      console.log(
        `  ${job.bucket}/${job.key}  (${(job.body.byteLength / 1024).toFixed(1)} KB)`,
      );
    }
    return;
  }

  console.log('Ensuring buckets…');
  await ensurePublicBucket(supabase, TAG_BUCKET);
  await ensurePublicBucket(supabase, MAP_BUCKET);

  const failures: Array<{ label: string; reason: string }> = [];
  let uploaded = 0;

  for (const job of jobs) {
    const { error } = await supabase.storage
      .from(job.bucket)
      .upload(job.key, job.body, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      failures.push({ label: job.label, reason: error.message });
      continue;
    }

    uploaded += 1;
  }

  const tagPrefix = supabase.storage.from(TAG_BUCKET).getPublicUrl('').data
    .publicUrl;
  const mapPrefix = supabase.storage.from(MAP_BUCKET).getPublicUrl('').data
    .publicUrl;

  console.log(`\nDone. Uploaded ${uploaded}/${jobs.length}.`);
  console.log(`Tag icons public prefix: ${tagPrefix}`);
  console.log(`Map images public prefix: ${mapPrefix}`);

  if (failures.length > 0) {
    console.log(`\n${failures.length} failures:`);
    for (const failure of failures) {
      console.log(`  ${failure.label}: ${failure.reason}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('upload-game-asset-images.ts')) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    );
    process.exit(1);
  });
}
