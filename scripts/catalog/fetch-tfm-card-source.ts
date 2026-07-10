import {
  loadTfmCardRecords,
} from './tfm-reference-data';
import {
  TFM_CARD_TAGS_SNAPSHOT_PATH,
} from './extract-tfm-card-tags';

async function main() {
  await loadTfmCardRecords({ preferCached: false });
  console.log(
    `Saved Terraforming Mars card source snapshot to ${TFM_CARD_TAGS_SNAPSHOT_PATH}.`,
  );
}

void main();
