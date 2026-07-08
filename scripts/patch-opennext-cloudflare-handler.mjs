import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const targetSnippet =
  'getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}';
export const alreadyPatchedSnippet = 'getMiddlewareManifest(){return null}';

export function patchOpenNextCloudflareHandlerSource(source) {
  if (source.includes(targetSnippet)) {
    return {
      output: source.replace(targetSnippet, alreadyPatchedSnippet),
      didPatch: true,
    };
  }

  if (source.includes(alreadyPatchedSnippet)) {
    return {
      output: source,
      didPatch: false,
    };
  }

  throw new Error(
    'OpenNext handler snippet was not found. The Cloudflare adapter output may have changed.',
  );
}

export async function patchOpenNextCloudflareHandlerFile(filePath) {
  const source = await readFile(filePath, 'utf8');
  const result = patchOpenNextCloudflareHandlerSource(source);

  if (result.didPatch) {
    await writeFile(filePath, result.output);
  }

  return result;
}

const scriptPath = fileURLToPath(import.meta.url);

async function main() {
  const repoRoot = path.resolve(path.dirname(scriptPath), '..');
  const handlerPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(repoRoot, '.open-next', 'server-functions', 'default', 'handler.mjs');
  const result = await patchOpenNextCloudflareHandlerFile(handlerPath);

  if (result.didPatch) {
    console.log(`Patched OpenNext Cloudflare handler at ${handlerPath}`);
    return;
  }

  console.log(`OpenNext Cloudflare handler already patched at ${handlerPath}`);
}

if (process.argv[1] === scriptPath) {
  await main();
}
