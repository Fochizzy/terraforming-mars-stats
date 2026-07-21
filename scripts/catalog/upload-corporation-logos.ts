import { createHash } from 'node:crypto';
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

// Replaces the corporation logo art in the public tm-corporation-logos bucket.
//
// Objects are content-addressed — the key is the SHA-256 of the *normalized*
// bytes this script produces, so new art always lands on a new key and can
// never be served stale from the long-lived CDN cache. Previous objects are
// left in place so a rollback is just reverting the code map.
//
// The normalized name of each source file is matched against the corporation
// catalog key used by src/components/ui/corporation-logo.tsx. Source art whose
// file name spells the corporation differently is bridged by SOURCE_NAME_ALIASES
// rather than by fuzzy matching, so a rename can never silently retarget a logo.
//
// Usage:
//   tsx scripts/catalog/upload-corporation-logos.ts --source <dir> [--dry-run]

const LOGO_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET_CORPORATION_LOGOS ?? 'tm-corporation-logos';

// The art is a 2:1 banner carrying the corporation name as artwork. Every file
// is normalized to exactly this box so the UI can rely on one aspect ratio.
export const LOGO_WIDTH = 600;
export const LOGO_HEIGHT = 300;

/**
 * Source file stem (normalized) -> corporation catalog key (normalized).
 *
 * Only for art whose file name does not already normalize to the catalog key.
 * Every entry is a deliberate 1:1 pairing; there is no fallback matching.
 */
export const SOURCE_NAME_ALIASES: Readonly<Record<string, string>> = {
  bentenmary: 'bentenmaru',
  creditcor: 'credicor',
  gagarianmobilebase: 'gagarinmobilebase',
  hadesphereindustries: 'hadesphere',
  hecatatespeditions: 'hecatespeditions',
  henkei: 'henkeigenetics',
  jensonboyleandco: 'jensonboyleco',
  robinhauling: 'robinhaulings',
  sagitta: 'sagittafrontierservices',
};

export function normalizeCorporationName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolveCatalogKey(fileStem: string): string {
  const normalized = normalizeCorporationName(fileStem);
  return SOURCE_NAME_ALIASES[normalized] ?? normalized;
}

/**
 * Fit the art inside the 2:1 box without cropping or distorting it. Sources are
 * all near-2:1 already, so `contain` only pads the few that are slightly off
 * rather than stretching them.
 */
export function normalizeLogo(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize({
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      fit: 'contain',
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export function contentAddressedKey(body: Buffer): string {
  return `corporation-logo-${createHash('sha256').update(body).digest('hex')}.png`;
}

type LogoJob = {
  body: Buffer;
  catalogKey: string;
  sourceFile: string;
  storageKey: string;
};

function readArg(flag: string): string | null {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] ?? null : null;
}

async function buildJobs(sourceDir: string): Promise<LogoJob[]> {
  const files = readdirSync(sourceDir).filter(
    (file) => extname(file).toLowerCase() === '.png',
  );

  const jobs = await Promise.all(
    files.map(async (file) => {
      const body = await normalizeLogo(readFileSync(join(sourceDir, file)));
      return {
        body,
        catalogKey: resolveCatalogKey(basename(file, extname(file))),
        sourceFile: file,
        storageKey: contentAddressedKey(body),
      } satisfies LogoJob;
    }),
  );

  const seen = new Map<string, string>();
  for (const job of jobs) {
    const previous = seen.get(job.catalogKey);
    if (previous) {
      throw new Error(
        `Two source files resolve to the same corporation "${job.catalogKey}": ` +
          `${previous} and ${job.sourceFile}. Fix the file names or SOURCE_NAME_ALIASES.`,
      );
    }
    seen.set(job.catalogKey, job.sourceFile);
  }

  return jobs.sort((left, right) => left.catalogKey.localeCompare(right.catalogKey));
}

function printMap(jobs: LogoJob[]) {
  console.log('\n=== CORPORATION_LOGO_PATHS ===');
  for (const job of jobs) {
    console.log(`  ${job.catalogKey}: '${job.storageKey}',`);
  }
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const sourceDir = readArg('--source');

  if (!sourceDir) {
    throw new Error('Pass --source <dir> pointing at the corporation logo PNGs.');
  }

  const jobs = await buildJobs(sourceDir);
  console.log(
    `Prepared ${jobs.length} corporation logos at ${LOGO_WIDTH}x${LOGO_HEIGHT}.`,
  );

  if (dryRun) {
    console.log('\n--dry-run: no uploads performed.');
    printMap(jobs);
    return;
  }

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

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const failures: Array<{ label: string; reason: string }> = [];
  let uploaded = 0;

  for (const job of jobs) {
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(job.storageKey, job.body, {
        cacheControl: '31536000',
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      failures.push({ label: job.catalogKey, reason: error.message });
      continue;
    }

    uploaded += 1;
  }

  console.log(`\nDone. Uploaded ${uploaded}/${jobs.length}.`);
  printMap(jobs);

  if (failures.length > 0) {
    console.log(`\n${failures.length} failures:`);
    for (const failure of failures) {
      console.log(`  ${failure.label}: ${failure.reason}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('upload-corporation-logos.ts')) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    );
    process.exit(1);
  });
}
