import { readFile } from 'node:fs/promises';
import {
  extractTfmCardTags,
  TFM_CARDS_SOURCE_URL,
  TFM_CARD_TAGS_SNAPSHOT_PATH,
  type TfmCardTagRecord,
} from './extract-tfm-card-tags';

export type TfmCardSnapshotComparison = {
  added: string[];
  changed: string[];
  matches: boolean;
  removed: string[];
};

function sourceKey(record: TfmCardTagRecord) {
  return [record.nameKey, record.category ?? '', record.module ?? ''].join('|');
}

function displayName(record: TfmCardTagRecord) {
  return record.name;
}

export function compareTfmCardSnapshots(input: {
  committed: TfmCardTagRecord[];
  live: TfmCardTagRecord[];
}): TfmCardSnapshotComparison {
  const committedByKey = new Map(
    input.committed.map((record) => [sourceKey(record), record]),
  );
  const liveByKey = new Map(input.live.map((record) => [sourceKey(record), record]));

  const added = input.live
    .filter((record) => !committedByKey.has(sourceKey(record)))
    .map(displayName)
    .sort((left, right) => left.localeCompare(right));

  const removed = input.committed
    .filter((record) => !liveByKey.has(sourceKey(record)))
    .map(displayName)
    .sort((left, right) => left.localeCompare(right));

  const changed = input.live
    .filter((record) => {
      const committed = committedByKey.get(sourceKey(record));
      return committed ? JSON.stringify(committed) !== JSON.stringify(record) : false;
    })
    .map(displayName)
    .sort((left, right) => left.localeCompare(right));

  return {
    added,
    changed,
    matches:
      added.length === 0 && removed.length === 0 && changed.length === 0,
    removed,
  };
}

async function fetchLiveSnapshot() {
  const response = await fetch(process.env.TFM_CARDS_SOURCE_URL ?? TFM_CARDS_SOURCE_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Terraforming Mars card source: ${response.status} ${response.statusText}`,
    );
  }

  return extractTfmCardTags(await response.text());
}

async function main() {
  const committed = JSON.parse(
    await readFile(TFM_CARD_TAGS_SNAPSHOT_PATH, 'utf8'),
  ) as TfmCardTagRecord[];
  const live = await fetchLiveSnapshot();
  const comparison = compareTfmCardSnapshots({ committed, live });

  console.log(
    JSON.stringify(
      {
        ...comparison,
        committedRecords: committed.length,
        liveRecords: live.length,
        sourceUrl: process.env.TFM_CARDS_SOURCE_URL ?? TFM_CARDS_SOURCE_URL,
      },
      null,
      2,
    ),
  );

  if (!comparison.matches) {
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('check-tfm-card-source.ts')) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : JSON.stringify(error, null, 2),
    );
    process.exit(1);
  });
}
