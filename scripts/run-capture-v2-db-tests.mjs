#!/usr/bin/env node
// Executable PostgreSQL integration tests for the data-capture-hardening-v2
// schema. Builds a fresh database from the prerequisite bootstrap + the three
// capture migrations, re-applies the v2 migration for idempotency, seeds
// deterministic fixtures, then runs every supabase/tests/capture_v2/test_*.sql
// assertion file with ON_ERROR_STOP so any RAISE fails the run.
//
// This does not require Docker; it targets any reachable PostgreSQL. Configure:
//   CAPTURE_TEST_PSQL       path to psql (default: PostgreSQL 18 Windows path)
//   CAPTURE_TEST_HOST       default 127.0.0.1
//   CAPTURE_TEST_PORT       default 55432
//   CAPTURE_TEST_USER       default postgres
//   CAPTURE_TEST_PASSWORD   default postgres
//   CAPTURE_TEST_DB         scratch db name, default capture_v2_test
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const migrationsDir = join(repoRoot, 'supabase', 'migrations');
const testsDir = join(repoRoot, 'supabase', 'tests', 'capture_v2');

const PSQL = process.env.CAPTURE_TEST_PSQL
  ?? 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const HOST = process.env.CAPTURE_TEST_HOST ?? '127.0.0.1';
const PORT = process.env.CAPTURE_TEST_PORT ?? '55432';
const USER = process.env.CAPTURE_TEST_USER ?? 'postgres';
const PASSWORD = process.env.CAPTURE_TEST_PASSWORD ?? 'postgres';
const DB = process.env.CAPTURE_TEST_DB ?? 'capture_v2_test';

const env = { ...process.env, PGPASSWORD: PASSWORD };

function psql(args, { db = DB } = {}) {
  return execFileSync(
    PSQL,
    ['-h', HOST, '-p', PORT, '-U', USER, '-v', 'ON_ERROR_STOP=1', '-d', db, ...args],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function runFile(path, opts) {
  return psql(['-q', '-f', path], opts);
}

const MIGRATIONS = [
  '20260718200536_add_venus_colonies_import_facts.sql',
  '20260718204000_add_game_mechanic_capture.sql',
  '20260719120000_data_capture_hardening_v2.sql',
];

function setup() {
  console.log(`• Recreating scratch database ${DB} ...`);
  psql(['-c', `drop database if exists ${DB};`], { db: 'postgres' });
  psql(['-c', `create database ${DB};`], { db: 'postgres' });

  console.log('• Bootstrapping prerequisite schema ...');
  runFile(join(testsDir, '00_bootstrap.sql'));

  console.log('• Applying capture migrations (clean baseline) ...');
  for (const migration of MIGRATIONS) {
    runFile(join(migrationsDir, migration));
  }

  console.log('• Re-applying v2 migration (idempotency) ...');
  runFile(join(migrationsDir, '20260719120000_data_capture_hardening_v2.sql'));

  console.log('• Seeding fixtures ...');
  runFile(join(testsDir, '05_seed.sql'));
}

function runTests() {
  const files = readdirSync(testsDir)
    .filter((name) => name.startsWith('test_') && name.endsWith('.sql'))
    .sort();

  let failures = 0;
  for (const file of files) {
    try {
      runFile(join(testsDir, file));
      console.log(`  ✓ ${file}`);
    } catch (error) {
      failures += 1;
      console.error(`  ✗ ${file}`);
      const detail = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
      if (detail) {
        console.error(detail.split('\n').map((line) => `      ${line}`).join('\n'));
      }
    }
  }
  return { failures, total: files.length };
}

try {
  setup();
  console.log('• Running assertion suites ...');
  const { failures, total } = runTests();
  console.log('');
  if (failures > 0) {
    console.error(`FAILED: ${failures}/${total} capture-v2 DB test file(s) failed.`);
    process.exit(1);
  }
  console.log(`PASSED: ${total}/${total} capture-v2 DB test files.`);
} catch (error) {
  console.error('Setup failed:');
  console.error(`${error.stdout ?? ''}${error.stderr ?? error.message ?? ''}`);
  process.exit(1);
}
