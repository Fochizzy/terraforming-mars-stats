import { writeFile } from 'node:fs/promises';

async function main() {
  const response = await fetch('https://tm.hadronikle.com/');
  const html = await response.text();

  await writeFile('scripts/catalog/source/hadronikle-home.html', html, 'utf8');
}

void main();
