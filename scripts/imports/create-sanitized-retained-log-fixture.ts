import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const [sourcePath, outputPath] = process.argv.slice(2);
  if (!sourcePath || !outputPath) {
    throw new Error(
      'Usage: tsx scripts/imports/create-sanitized-retained-log-fixture.ts <source> <output>',
    );
  }

  const source = await readFile(resolve(sourcePath), 'utf8');
  const players = [
    ...new Set(
      source
        .split(/\r?\n/)
        .flatMap((line) => {
          const match = /^Good luck\s+(.+?)!\s*$/.exec(line.trim());
          return match ? [match[1]] : [];
        }),
    ),
  ];
  const replacements = new Map(
    players.map((player, index) => [
      player,
      `Player ${String.fromCharCode(65 + index)}`,
    ]),
  );
  let sanitized = source;
  for (const [player, replacement] of [...replacements].sort(
    (left, right) => right[0].length - left[0].length,
  )) {
    sanitized = sanitized.replaceAll(player, replacement);
  }
  sanitized = sanitized.replace(
    /^This game id was\s+.+$/m,
    'This game id was sanitized-retained-negative-game',
  );

  await writeFile(resolve(outputPath), `${sanitized.trimEnd()}\n`, 'utf8');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
