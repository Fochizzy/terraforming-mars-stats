import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 });
  }

  const fixturePath = path.join(
    process.cwd(),
    'src/lib/imports/fixtures/combined-game-result.jpeg',
  );

  return new Response(new Uint8Array(await readFile(fixturePath)), {
    headers: {
      'content-type': 'image/jpeg',
    },
  });
}
