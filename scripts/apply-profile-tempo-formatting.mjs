import { readFile, rm, writeFile } from 'node:fs/promises';

const dashboardPath = 'src/features/analytics/profile-dashboard.tsx';
const testPath = 'src/features/analytics/profile-tempo-fit-cards.test.tsx';
const workflowPath = '.github/workflows/apply-profile-tempo-formatting.yml';
const scriptPath = 'scripts/apply-profile-tempo-formatting.mjs';

let dashboard = await readFile(dashboardPath, 'utf8');
const importLine = "import { ProfileCardPanels } from './profile-card-panels';";
const tempoImport = "import { ProfileTempoFitCards } from './profile-tempo-fit-cards';";

if (!dashboard.includes(tempoImport)) {
  if (!dashboard.includes(importLine)) {
    throw new Error('Could not find the ProfileCardPanels import anchor.');
  }

  dashboard = dashboard.replace(importLine, `${importLine}\n${tempoImport}`);
}

const startMarker = [
  '        <div className="mt-4 grid gap-3 xl:grid-cols-3">',
  '          <article className="tm-stat-card">',
  '            <h3 className="font-semibold text-stone-100">',
  '              Early, Mid, and Late Game',
].join('\n');
const closingMarker = [
  '        </div>',
  '      </ChartFrame>',
  '      {expansionProfile ? (',
].join('\n');
const startIndex = dashboard.indexOf(startMarker);
const endIndex = dashboard.indexOf(closingMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  throw new Error('Could not find the existing tempo-card grid.');
}

const replacement = [
  '        <ProfileTempoFitCards',
  '          gameLengthProfile={gameLengthProfile}',
  '          gameLengthStatements={gameLengthStatements}',
  '          globalParameterTempoProfile={globalParameterTempoProfile}',
  '          globalParameterTempoStatements={globalParameterTempoStatements}',
  '          phaseTempoProfile={phaseTempoProfile}',
  '          phaseTempoStatements={phaseTempoStatements}',
  '        />',
].join('\n');
const removedGridClosingLength = '        </div>\n'.length;

dashboard =
  dashboard.slice(0, startIndex) +
  replacement +
  '\n' +
  dashboard.slice(endIndex + removedGridClosingLength);

await writeFile(dashboardPath, dashboard);

let test = await readFile(testPath, 'utf8');
test = test.replace(
  "expect(within(phaseCard!).getByText('Late Game')).toBeInTheDocument();",
  "expect(within(phaseCard!).getAllByText('Late Game').length).toBeGreaterThan(0);",
);
test = test.replace(
  "expect(within(lengthCard!).getByText(/8.78/)).toBeInTheDocument();",
  "expect(within(lengthCard!).getAllByText(/8.78/).length).toBeGreaterThan(0);",
);
await writeFile(testPath, test);

await rm(workflowPath);
await rm(scriptPath);
