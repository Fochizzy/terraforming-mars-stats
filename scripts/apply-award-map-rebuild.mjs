import { readFile, writeFile } from 'node:fs/promises';

const dashboardPath = 'src/features/insights/insights-dashboard.tsx';
const source = await readFile(dashboardPath, 'utf8');

let next = source;

const importAnchor = "import { buildInsightCards, type InsightCard } from './build-insight-cards';";
const importLine =
  "import { AwardMapOverview, deduplicateAwardOutcomeRows } from './award-map-overview';";

if (!next.includes(importLine)) {
  if (!next.includes(importAnchor)) {
    throw new Error('Could not find dashboard import anchor.');
  }
  next = next.replace(importAnchor, `${importLine}\n${importAnchor}`);
}

const renderAnchor = `              <AwardEconomicsSection
                defaultScope={scopeMode === 'individual' ? 'all' : 'group'}
                focusPlayerName={selectedPerson?.displayName ?? null}
                groupFocusPlayerId={selectedPerson?.activeGroupPlayerId ?? null}
                groupMatrixRows={extended.awardFunderWinnerRows}
                groupOutcomeRows={extended.awardOutcomeRows}
                groupPlayerAwardRows={extended.playerAwardFundingRows}
                overallFocusPlayerId={selectedPerson?.canonicalId ?? null}
                overallMatrixRows={overallExtended.awardFunderWinnerRows}
                overallOutcomeRows={overallExtended.awardOutcomeRows}
                overallPlayerAwardRows={overallExtended.playerAwardFundingRows}
              />`;

const replacement = `              <AwardMapOverview
                mapGroups={mapAwardGroups}
                rows={deduplicateAwardOutcomeRows(
                  scopeMode === 'individual'
                    ? overallExtended.awardOutcomeRows
                    : extended.awardOutcomeRows,
                )}
              />

              <AwardEconomicsSection
                defaultScope={scopeMode === 'individual' ? 'all' : 'group'}
                focusPlayerName={selectedPerson?.displayName ?? null}
                groupFocusPlayerId={selectedPerson?.activeGroupPlayerId ?? null}
                groupMatrixRows={extended.awardFunderWinnerRows}
                groupOutcomeRows={deduplicateAwardOutcomeRows(
                  extended.awardOutcomeRows,
                )}
                groupPlayerAwardRows={extended.playerAwardFundingRows}
                overallFocusPlayerId={selectedPerson?.canonicalId ?? null}
                overallMatrixRows={overallExtended.awardFunderWinnerRows}
                overallOutcomeRows={deduplicateAwardOutcomeRows(
                  overallExtended.awardOutcomeRows,
                )}
                overallPlayerAwardRows={overallExtended.playerAwardFundingRows}
              />`;

if (!next.includes('<AwardMapOverview')) {
  if (!next.includes(renderAnchor)) {
    throw new Error('Could not find AwardEconomicsSection render anchor.');
  }
  next = next.replace(renderAnchor, replacement);
}

if (next === source) {
  console.log('Award map rebuild is already integrated.');
  process.exit(0);
}

await writeFile(dashboardPath, next, 'utf8');
console.log('Integrated AwardMapOverview and deduplicated award outcome rows.');
