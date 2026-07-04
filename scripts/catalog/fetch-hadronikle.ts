import {
  HADRONIKLE_SOURCE_CACHE_PATH,
  loadHadronikleSourceHtml,
} from './import-reference-data';

async function main() {
  await loadHadronikleSourceHtml({ preferCached: false });
  console.log(`Saved Hadronikle source to ${HADRONIKLE_SOURCE_CACHE_PATH}.`);
}

void main();
