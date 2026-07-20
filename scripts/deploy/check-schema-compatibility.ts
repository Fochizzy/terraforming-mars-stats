import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

/**
 * Pre-deploy gate: every table this build reads must exist in the target
 * database.
 *
 * A frontend can be perfectly valid and still be older than the schema it will
 * talk to. When that happens the app compiles, tests pass, static routes serve,
 * and the first authenticated render throws PGRST205 in production. This checks
 * the one thing typechecking cannot: that the deployed code and the live schema
 * agree.
 */

const SOURCE_ROOT = resolve(process.cwd(), 'src');
const SCHEMAS = ['public', 'analytics'] as const;
const TABLE_LITERAL = /\.from\(\s*['"]([a-z0-9_]+)['"]\s*\)/g;
/** `.from(someVariable)` — a real read this script cannot resolve statically. */
const DYNAMIC_FROM = /(?<!Array)\.from\(\s*(?!['"])[A-Za-z_$]/g;

type Reference = { file: string; line: number };

/**
 * Deliberately structural: this script probes tables the generated types may
 * not know about, which is the whole point of the check.
 */
type SchemaProbeClient = {
  schema: (name: string) => {
    from: (table: string) => {
      select: (columns: string) => {
        limit: (
          count: number,
        ) => PromiseLike<{ error: { code?: string } | null }>;
      };
    };
  };
};

function loadEnvLocal() {
  let contents: string;

  try {
    contents = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;

    if (!process.env[name]) {
      process.env[name] = rawValue.trim().replace(/^["']|["']$/g, '');
    }
  }
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return listSourceFiles(path);
    }

    // Test files name tables inside mocks, which are not real reads.
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) {
      return [];
    }

    return [path];
  });
}

function collectTableReferences() {
  const references = new Map<string, Reference[]>();
  let dynamicCallSites = 0;

  for (const file of listSourceFiles(SOURCE_ROOT)) {
    const contents = readFileSync(file, 'utf8');
    dynamicCallSites += contents.match(DYNAMIC_FROM)?.length ?? 0;

    const relativeFile = file.slice(process.cwd().length + 1);

    for (const match of contents.matchAll(TABLE_LITERAL)) {
      const table = match[1];
      const line = contents.slice(0, match.index ?? 0).split('\n').length;
      references.set(table, [
        ...(references.get(table) ?? []),
        { file: relativeFile, line },
      ]);
    }
  }

  return { dynamicCallSites, references };
}

async function findMissingTables(client: SchemaProbeClient, tables: string[]) {
  const results = await Promise.all(
    tables.map(async (table) => {
      for (const schema of SCHEMAS) {
        const { error } = await client
          .schema(schema)
          .from(table)
          .select('*')
          .limit(0);

        // Anything other than "unknown relation" means the table resolved.
        if (!error || error.code !== 'PGRST205') {
          return null;
        }
      }

      return table;
    }),
  );

  return results.filter((table): table is string => table !== null);
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to check schema compatibility.',
    );
  }

  const { dynamicCallSites, references } = collectTableReferences();
  const tables = [...references.keys()].sort();
  const missing = await findMissingTables(
    createClient(supabaseUrl, serviceRoleKey) as unknown as SchemaProbeClient,
    tables,
  );

  if (missing.length === 0) {
    console.log(
      `Schema OK: all ${tables.length} referenced tables exist in ${supabaseUrl}.`,
    );

    if (dynamicCallSites > 0) {
      console.log(
        `Note: ${dynamicCallSites} dynamic .from(variable) call site(s) could not be checked statically.`,
      );
    }

    return;
  }

  console.error(
    `Schema MISMATCH: ${missing.length} of ${tables.length} referenced tables do not exist in ${supabaseUrl}.`,
  );

  for (const table of missing) {
    console.error(`\n  ${table}`);

    for (const reference of references.get(table) ?? []) {
      console.error(`    ${reference.file}:${reference.line}`);
    }
  }

  console.error(
    '\nThis build is older (or newer) than the target schema. Deploying it will 500 on the routes that read these tables.',
  );
  process.exitCode = 1;
}

if (process.argv[1]?.endsWith('check-schema-compatibility.ts')) {
  void main();
}
