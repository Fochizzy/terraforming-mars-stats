import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import {
  TFM_CARDS_PAGE_URL,
  type TfmCardTagRecord,
} from './extract-tfm-card-tags';
import {
  buildTfmCatalogImportPayload,
  loadTfmCardRecords,
} from './tfm-reference-data';
import type { NormalizedCardRecord } from '../../src/features/catalog/catalog-record';
import { getPublicEnv } from '../../src/lib/env';

for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // Env files are optional; shell env can still provide the secret key.
    }
  }
}

const FULL_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET_CARD_FULL ?? 'tm-card-full';
const THUMB_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET_CARD_THUMBS ?? 'tm-card-thumbs';
const RENDER_SOURCE_FILTER_HASH = '#~trbgpcseCmalt';
const RENDER_SOURCE_URL = `${TFM_CARDS_PAGE_URL.replace(
  /#.*/,
  '',
)}${RENDER_SOURCE_FILTER_HASH}`;
const FULL_DISPLAY_WIDTH = 500;
const THUMB_DISPLAY_WIDTH = 220;
const WEBP_QUALITY = 82;
const SUPABASE_PAGE_SIZE = 1000;

type ExistingCardRow = {
  full_image_path: string | null;
  source_card_id: string;
  thumbnail_path: string | null;
};

type PromoSetRow = {
  id: string;
  slug: string;
};

type CatalogSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => {
        range: (
          from: number,
          to: number,
        ) => PromiseLike<{ data: unknown[] | null; error: Error | null }>;
      };
    };
    upsert: (
      values: unknown,
      options: { onConflict: string },
    ) => Promise<{ error: Error | null }>;
  };
  storage: {
    createBucket: (
      bucket: string,
      options: { public: boolean },
    ) => Promise<{ error: Error | null }>;
    from: (bucket: string) => {
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
      upload: (
        path: string,
        body: Buffer,
        options: {
          cacheControl: string;
          contentType: string;
          upsert: boolean;
        },
      ) => Promise<{ error: Error | null }>;
    };
    getBucket: (
      bucket: string,
    ) => Promise<{ data: { public: boolean } | null; error: Error | null }>;
    updateBucket: (
      bucket: string,
      options: { public: boolean },
    ) => Promise<{ error: Error | null }>;
  };
};

type RenderedCardBox = {
  className: string;
  classTokens: string[];
  height: number;
  index: number;
  title: string;
  width: number;
};

function parseArgs(argv: string[]) {
  const limitFlag = argv.find((arg) => arg.startsWith('--limit='));
  const limitIndex = argv.indexOf('--limit');
  const limitValue =
    limitFlag?.split('=')[1] ??
    (limitIndex >= 0 ? argv[limitIndex + 1] : undefined);
  const onlyFlag = argv.find((arg) => arg.startsWith('--only='));
  const onlyIndex = argv.indexOf('--only');
  const onlyValue =
    onlyFlag?.split('=')[1] ??
    (onlyIndex >= 0 ? argv[onlyIndex + 1] : undefined);

  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    limit: limitValue ? Number.parseInt(limitValue, 10) : null,
    only: onlyValue ? new Set(onlyValue.split(',').map((name) => name.trim())) : null,
  };
}

function sanitizeStorageKey(sourceCardId: string) {
  return sourceCardId
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildRenderedCardClass(cardName: string) {
  return `card-${cardName.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

function isCardIdentityClass(classToken: string) {
  return classToken.startsWith('card-') && classToken !== 'card-container';
}

function isSupabaseHosted(
  row: ExistingCardRow | undefined,
  fullPrefix: string,
  thumbPrefix: string,
) {
  return Boolean(
    row?.full_image_path?.startsWith(fullPrefix) &&
      row.thumbnail_path?.startsWith(thumbPrefix),
  );
}

function readPromoSetSlug(card: NormalizedCardRecord) {
  const value = card.sync_metadata.promoSetSlug;
  return typeof value === 'string' && value ? value : null;
}

function readRequiredExpansionCodes(card: NormalizedCardRecord) {
  const value = card.sync_metadata.requiredExpansionCodes;
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function buildUpsertRow(input: {
  card: NormalizedCardRecord;
  fullUrl: string;
  promoSetIdsBySlug: Map<string, string>;
  thumbUrl: string;
}) {
  const promoSetSlug = readPromoSetSlug(input.card);

  return {
    ...input.card,
    full_image_path: input.fullUrl,
    promo_set_id: promoSetSlug
      ? input.promoSetIdsBySlug.get(promoSetSlug) ?? null
      : null,
    required_expansion_codes: readRequiredExpansionCodes(input.card),
    sync_metadata: {
      ...input.card.sync_metadata,
      renderedImageSourceUrl: RENDER_SOURCE_URL,
    },
    thumbnail_path: input.thumbUrl,
  };
}

async function ensurePublicBucket(
  supabase: CatalogSupabaseClient,
  bucket: string,
) {
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

async function loadExistingCards(
  supabase: CatalogSupabaseClient,
): Promise<ExistingCardRow[]> {
  const rows: ExistingCardRow[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('cards')
      .select('source_card_id, full_image_path, thumbnail_path')
      .order('source_card_id', { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...(((data ?? []) as ExistingCardRow[])));
    if (!data || data.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function loadPromoSetIds(
  supabase: CatalogSupabaseClient,
): Promise<Map<string, string>> {
  const rows: PromoSetRow[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('promo_sets')
      .select('id, slug')
      .order('slug', { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...(((data ?? []) as PromoSetRow[])));
    if (!data || data.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function openRenderedCardsPage(page: Page) {
  await page.goto(RENDER_SOURCE_URL, {
    timeout: 120_000,
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(
    () => document.querySelectorAll('.cardbox .card-container').length > 800,
    { timeout: 120_000 },
  );
  await page.evaluate(async () => {
    const fonts = 'fonts' in document ? document.fonts : null;
    await fonts?.ready;
  });
}

async function collectRenderedBoxes(page: Page): Promise<RenderedCardBox[]> {
  return page.locator('.cardbox').evaluateAll((elements) =>
    elements.map((element, index) => {
      const titleElement = element.querySelector(
        '.card-title, .card-title-standard-project',
      );
      const container = element.querySelector('.card-container');
      const rect = container?.getBoundingClientRect();

      return {
        className:
          container instanceof HTMLElement ? container.className : '',
        classTokens:
          container instanceof HTMLElement
            ? [...container.classList]
            : [],
        height: rect?.height ?? 0,
        index,
        title: titleElement?.textContent?.trim() ?? '',
        width: rect?.width ?? 0,
      };
    }),
  );
}

function buildRenderedBoxIndex(boxes: RenderedCardBox[]) {
  const byClass = new Map<string, RenderedCardBox>();
  const byTitle = new Map<string, RenderedCardBox>();
  const duplicateClasses = new Set<string>();
  const duplicateTitles = new Set<string>();

  for (const box of boxes) {
    for (const classToken of box.classTokens.filter(isCardIdentityClass)) {
      if (byClass.has(classToken)) {
        duplicateClasses.add(classToken);
        continue;
      }
      byClass.set(classToken, box);
    }

    if (!box.title) {
      continue;
    }
    if (byTitle.has(box.title)) {
      duplicateTitles.add(box.title);
      continue;
    }
    byTitle.set(box.title, box);
  }

  return { byClass, byTitle, duplicateClasses, duplicateTitles };
}

function resolveRenderedBox(
  indexes: ReturnType<typeof buildRenderedBoxIndex>,
  card: NormalizedCardRecord,
) {
  return (
    indexes.byClass.get(buildRenderedCardClass(card.card_name)) ??
    indexes.byTitle.get(card.card_name)
  );
}

async function renderCardPng(page: Page, box: RenderedCardBox) {
  return page
    .locator('.cardbox')
    .nth(box.index)
    .locator('.card-container')
    .screenshot({
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
      type: 'png',
    });
}

function toWebp(source: Buffer, width: number): Promise<Buffer> {
  return sharp(source)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function main() {
  const { dryRun, force, limit, only } = parseArgs(process.argv.slice(2));
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'Set SUPABASE_SERVICE_ROLE_KEY before running catalog:render-card-images.',
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
  ) as unknown as CatalogSupabaseClient;
  const sourceRecords = await loadTfmCardRecords();
  const sourceCards = buildTfmCatalogImportPayload(
    sourceRecords as TfmCardTagRecord[],
  ).cards.filter((card) => !only || only.has(card.card_name));

  const [existingCards, promoSetIdsBySlug] = await Promise.all([
    loadExistingCards(supabase),
    loadPromoSetIds(supabase),
  ]);
  const existingBySourceId = new Map(
    existingCards.map((row) => [row.source_card_id, row]),
  );

  const fullPrefix = supabase.storage.from(FULL_BUCKET).getPublicUrl('').data
    .publicUrl;
  const thumbPrefix = supabase.storage.from(THUMB_BUCKET).getPublicUrl('').data
    .publicUrl;
  const missingDbRows = sourceCards.filter(
    (card) => !existingBySourceId.has(card.source_card_id),
  );
  const targets = sourceCards.filter(
    (card) =>
      force ||
      !isSupabaseHosted(existingBySourceId.get(card.source_card_id), fullPrefix, thumbPrefix),
  );
  const limitedTargets = limit ? targets.slice(0, limit) : targets;

  console.log(
    `Source: ${sourceRecords.length} raw records | ${sourceCards.length} card rows.`,
  );
  console.log(
    `Supabase: ${existingCards.length} card rows | ${missingDbRows.length} source rows missing in DB.`,
  );
  console.log(
    `${targets.length} cards need render/upload${force ? ' (--force)' : ''}.`,
  );
  if (limit) {
    console.log(`--limit ${limit}: processing ${limitedTargets.length}.`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: { height: 1400, width: 1600 },
  });

  try {
    await openRenderedCardsPage(page);
    const boxes = await collectRenderedBoxes(page);
    const indexes = buildRenderedBoxIndex(boxes);
    const missingRenderTargets = limitedTargets.filter(
      (card) => !resolveRenderedBox(indexes, card),
    );

    console.log(
      `Rendered page: ${boxes.length} card boxes | ${indexes.byClass.size} unique card classes | ${indexes.byTitle.size} unique titles.`,
    );
    if (indexes.duplicateClasses.size > 0) {
      console.log(
        `Duplicate rendered card classes: ${[...indexes.duplicateClasses].slice(0, 20).join(', ')}`,
      );
    }
    if (indexes.duplicateTitles.size > 0) {
      console.log(
        `Duplicate rendered titles: ${[...indexes.duplicateTitles].slice(0, 20).join(', ')}`,
      );
    }
    if (missingRenderTargets.length > 0) {
      console.log(
        `Missing rendered titles: ${missingRenderTargets
          .slice(0, 20)
          .map((card) => card.card_name)
          .join(', ')}`,
      );
    }

    if (dryRun) {
      console.log('\n--dry-run: no screenshots, uploads, or DB writes performed.');
      console.log(
        `Sample targets:\n${limitedTargets
          .slice(0, 10)
          .map((card) => `  ${card.source_card_id} ${card.card_name}`)
          .join('\n')}`,
      );
      return;
    }

    await ensurePublicBucket(supabase, FULL_BUCKET);
    await ensurePublicBucket(supabase, THUMB_BUCKET);

    const failures: Array<{ card: string; reason: string }> = [];
    let uploaded = 0;

    for (const card of limitedTargets) {
      const box = resolveRenderedBox(indexes, card);
      if (!box) {
        failures.push({
          card: card.card_name,
          reason: 'not rendered on source page',
        });
        continue;
      }

      try {
        const png = await renderCardPng(page, box);
        const [fullBody, thumbBody] = await Promise.all([
          toWebp(png, FULL_DISPLAY_WIDTH),
          toWebp(png, THUMB_DISPLAY_WIDTH),
        ]);
        const key = `${sanitizeStorageKey(card.source_card_id)}.webp`;

        const fullUpload = await supabase.storage
          .from(FULL_BUCKET)
          .upload(key, fullBody, {
            cacheControl: '31536000',
            contentType: 'image/webp',
            upsert: true,
          });
        if (fullUpload.error) {
          throw fullUpload.error;
        }

        const thumbUpload = await supabase.storage
          .from(THUMB_BUCKET)
          .upload(key, thumbBody, {
            cacheControl: '31536000',
            contentType: 'image/webp',
            upsert: true,
          });
        if (thumbUpload.error) {
          throw thumbUpload.error;
        }

        const fullUrl = supabase.storage
          .from(FULL_BUCKET)
          .getPublicUrl(key).data.publicUrl;
        const thumbUrl = supabase.storage
          .from(THUMB_BUCKET)
          .getPublicUrl(key).data.publicUrl;

        const { error: upsertError } = await supabase.from('cards').upsert(
          buildUpsertRow({
            card,
            fullUrl,
            promoSetIdsBySlug,
            thumbUrl,
          }),
          { onConflict: 'source_card_id' },
        );
        if (upsertError) {
          throw upsertError;
        }

        uploaded += 1;
        if (uploaded % 25 === 0) {
          console.log(`  rendered/uploaded ${uploaded}/${limitedTargets.length}...`);
        }
      } catch (error) {
        failures.push({
          card: card.card_name,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`\nDone. Rendered/uploaded ${uploaded}/${limitedTargets.length}.`);
    console.log(`Full images public prefix: ${fullPrefix}`);
    console.log(`Thumbnails public prefix: ${thumbPrefix}`);

    if (failures.length > 0) {
      console.log(`\n${failures.length} failures:`);
      for (const failure of failures.slice(0, 40)) {
        console.log(`  ${failure.card}: ${failure.reason}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith('render-tfm-card-images.ts')) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    );
    process.exit(1);
  });
}
