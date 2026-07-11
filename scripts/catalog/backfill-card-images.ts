import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import {
  extractHadronikleCardsFromHtml,
  loadHadronikleSourceHtml,
} from './import-reference-data';

// Backfill self-hosted card art into Supabase Storage.
//
// The catalog was seeded mostly from the tfm-community bundle, which carries no
// real images: those cards point `image_url` at a Heroku search *page* (HTML),
// so the card dialog renders a broken thumbnail. Only the Hadronikle-sourced
// cards ever had real PNG URLs. This script matches every card to a Hadronikle
// image by normalized name, downloads the full art + thumbnail, uploads them
// into the tm-card-full / tm-card-thumbs buckets, and repoints
// cards.full_image_path / thumbnail_path at the public Supabase URLs so the art
// is genuinely saved in Supabase (not hotlinked).
//
// Idempotent: cards already pointing at the Supabase storage buckets are skipped
// unless --force is passed. Cards with no Hadronikle match are left untouched.
//
// Usage:
//   tsx scripts/catalog/backfill-card-images.ts [--dry-run] [--force] [--limit N]

type HadronikleEntry = {
  img: string;
  name: string;
  num: string;
  thumb: string;
};

type CardRow = {
  card_name: string;
  card_number: string | null;
  full_image_path: string | null;
  id: string;
  image_url: string | null;
  thumbnail_path: string | null;
};

const FULL_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET_CARD_FULL ?? 'tm-card-full';
const THUMB_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET_CARD_THUMBS ?? 'tm-card-thumbs';
// Hadronikle serves 1500x2100 print-resolution PNGs (~8 MB each). We downscale
// on upload so the card dialog loads a ~50 KB WebP instead. Full-display is
// sized for a ~315px CSS card at 2x; the thumb suits the lookup grid.
const FULL_DISPLAY_WIDTH = 500;
const THUMB_DISPLAY_WIDTH = 220;
const WEBP_QUALITY = 82;
// Source downloads are large and CPU-bound to re-encode, so keep it modest.
const DOWNLOAD_CONCURRENCY = 4;

function parseArgs(argv: string[]) {
  const limitFlag = argv.find((arg) => arg.startsWith('--limit='));
  const limitIndex = argv.indexOf('--limit');
  const limitValue =
    limitFlag?.split('=')[1] ??
    (limitIndex >= 0 ? argv[limitIndex + 1] : undefined);

  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    limit: limitValue ? Number.parseInt(limitValue, 10) : null,
  };
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Hadronikle URLs contain literal spaces and other unescaped characters.
function encodeSourceUrl(url: string): string {
  try {
    return encodeURI(url);
  } catch {
    return url;
  }
}

function buildHadronikleIndex(entries: HadronikleEntry[]) {
  const byName = new Map<string, HadronikleEntry[]>();

  for (const entry of entries) {
    if (!entry.img) {
      continue;
    }
    const key = normalizeName(entry.name);
    const bucket = byName.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      byName.set(key, [entry]);
    }
  }

  return byName;
}

function matchEntry(
  card: CardRow,
  index: Map<string, HadronikleEntry[]>,
): HadronikleEntry | null {
  const candidates = index.get(normalizeName(card.card_name));
  if (!candidates || candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  // Prefer the entry whose printed number matches, to disambiguate reprints.
  const numbered = candidates.find(
    (candidate) =>
      candidate.num.trim() !== '' &&
      candidate.num.trim() === (card.card_number ?? '').trim(),
  );
  return numbered ?? candidates[0];
}

async function downloadSource(url: string): Promise<Buffer> {
  const response = await fetch(encodeSourceUrl(url), {
    headers: { 'User-Agent': 'tm-stats-card-image-backfill/1.0' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength === 0) {
    throw new Error('empty body');
  }
  return body;
}

// Downscale the print-resolution source to a web-friendly WebP.
function toWebp(source: Buffer, width: number): Promise<Buffer> {
  return sharp(source)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  concurrency: number,
) {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const current = cursor;
        cursor += 1;
        await worker(items[current], current);
      }
    },
  );
  await Promise.all(runners);
}

async function main() {
  const { dryRun, force, limit } = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running catalog:backfill-images.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const html = await loadHadronikleSourceHtml();
  const entries = extractHadronikleCardsFromHtml(html) as HadronikleEntry[];
  const index = buildHadronikleIndex(entries);
  console.log(
    `Loaded ${entries.length} Hadronikle entries (${index.size} unique names).`,
  );

  const { data: cardRows, error: cardError } = await supabase
    .from('cards')
    .select(
      'id, card_name, card_number, image_url, full_image_path, thumbnail_path',
    )
    .order('card_name');

  if (cardError) {
    throw cardError;
  }

  const cards = (cardRows ?? []) as CardRow[];
  const fullPublicPrefix = supabase.storage
    .from(FULL_BUCKET)
    .getPublicUrl('').data.publicUrl;

  const alreadyHosted = (card: CardRow) =>
    Boolean(card.full_image_path?.startsWith(fullPublicPrefix));

  const targets = cards.filter((card) => {
    if (alreadyHosted(card) && !force) {
      return false;
    }
    return matchEntry(card, index) !== null;
  });

  const unmatched = cards.filter((card) => matchEntry(card, index) === null);
  const limited = limit ? targets.slice(0, limit) : targets;

  console.log(
    `Cards: ${cards.length} total | ${targets.length} to process | ${unmatched.length} with no Hadronikle match (left untouched).`,
  );
  if (limit) {
    console.log(`--limit ${limit}: processing ${limited.length}.`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no downloads, uploads, or DB writes performed.');
    console.log(
      `Sample matches:\n${limited
        .slice(0, 10)
        .map((card) => {
          const entry = matchEntry(card, index);
          return `  ${card.card_name} -> ${entry?.img}`;
        })
        .join('\n')}`,
    );
    return;
  }

  const failures: Array<{ card: string; reason: string }> = [];
  let uploaded = 0;

  await runPool(
    limited,
    async (card) => {
      const entry = matchEntry(card, index);
      if (!entry) {
        return;
      }

      try {
        const source = await downloadSource(entry.img);
        const [fullBody, thumbBody] = await Promise.all([
          toWebp(source, FULL_DISPLAY_WIDTH),
          toWebp(source, THUMB_DISPLAY_WIDTH),
        ]);

        const fullKey = `${card.id}.webp`;
        const thumbKey = `${card.id}.webp`;

        const fullUpload = await supabase.storage
          .from(FULL_BUCKET)
          .upload(fullKey, fullBody, {
            contentType: 'image/webp',
            upsert: true,
          });
        if (fullUpload.error) {
          throw fullUpload.error;
        }

        const thumbUpload = await supabase.storage
          .from(THUMB_BUCKET)
          .upload(thumbKey, thumbBody, {
            contentType: 'image/webp',
            upsert: true,
          });
        if (thumbUpload.error) {
          throw thumbUpload.error;
        }

        const fullUrl = supabase.storage
          .from(FULL_BUCKET)
          .getPublicUrl(fullKey).data.publicUrl;
        const thumbUrl = supabase.storage
          .from(THUMB_BUCKET)
          .getPublicUrl(thumbKey).data.publicUrl;

        const { error: updateError } = await supabase
          .from('cards')
          .update({ full_image_path: fullUrl, thumbnail_path: thumbUrl })
          .eq('id', card.id);
        if (updateError) {
          throw updateError;
        }

        uploaded += 1;
        if (uploaded % 25 === 0) {
          console.log(`  uploaded ${uploaded}/${limited.length}...`);
        }
      } catch (error) {
        failures.push({
          card: card.card_name,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    },
    DOWNLOAD_CONCURRENCY,
  );

  console.log(`\nDone. Uploaded ${uploaded}/${limited.length} cards.`);
  if (failures.length > 0) {
    console.log(`${failures.length} failures:`);
    for (const failure of failures.slice(0, 30)) {
      console.log(`  ${failure.card}: ${failure.reason}`);
    }
  }
}

if (process.argv[1]?.endsWith('backfill-card-images.ts')) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    );
    process.exit(1);
  });
}
