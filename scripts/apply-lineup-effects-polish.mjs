import { readFile, writeFile } from 'node:fs/promises';

const dashboardPath = new URL(
  '../src/features/insights/insights-dashboard.tsx',
  import.meta.url,
);

let source = await readFile(dashboardPath, 'utf8');

if (source.includes("import { LineupEffectsPanel } from './lineup-effects-panel';")) {
  process.exit(0);
}

const importMarker = "import { buildInsightCards } from './build-insight-cards';\n";
const importReplacement = `${importMarker}import { LineupEffectsPanel } from './lineup-effects-panel';\n`;

if (!source.includes(importMarker)) {
  throw new Error('Unable to locate the insights dashboard import insertion point.');
}

source = source.replace(importMarker, importReplacement);

const truncateHelper = `function truncateLabel(value: string, length = 18) {
  if (value.length <= length) {
    return value;
  }

  return \`${'${value.slice(0, length - 1)}'}…\`;
}

`;

if (!source.includes(truncateHelper)) {
  throw new Error('Unable to locate the legacy lineup truncation helper.');
}

source = source.replace(truncateHelper, '');

const selectedRowsMarker = `  const selectedLineupRows = selectedPlayer
    ? analytics.lineupEffectRows.filter((row) => row.playerId === selectedPlayer.id)
    : analytics.lineupEffectRows.slice(0, 6);
`;
const selectedRowsReplacement = `  const selectedLineupRows = selectedPlayer
    ? analytics.lineupEffectRows.filter((row) => row.playerId === selectedPlayer.id)
    : analytics.lineupEffectRows;
`;

if (!source.includes(selectedRowsMarker)) {
  throw new Error('Unable to locate the selected lineup rows assignment.');
}

source = source.replace(selectedRowsMarker, selectedRowsReplacement);

const sectionStartMarker = '          <ChartFrame title="Lineup Effects">';
const sectionEndMarker = '          <ChartFrame title="Interaction Insights">';
const sectionStart = source.indexOf(sectionStartMarker);
const sectionEnd = source.indexOf(sectionEndMarker, sectionStart);

if (sectionStart === -1 || sectionEnd === -1) {
  throw new Error('Unable to locate the legacy lineup effects section.');
}

const sectionReplacement = `          <ChartFrame
            description="See how each player performs with different table lineups."
            title="Lineup Effects"
          >
            <LineupEffectsPanel
              rows={selectedLineupRows}
              selectedPlayerName={selectedPlayer?.displayName ?? null}
            />
          </ChartFrame>

`;

source = `${source.slice(0, sectionStart)}${sectionReplacement}${source.slice(sectionEnd)}`;

await writeFile(dashboardPath, source);
