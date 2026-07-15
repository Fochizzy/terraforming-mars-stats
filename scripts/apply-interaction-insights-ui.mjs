import fs from 'node:fs';

const path = 'src/features/insights/insights-dashboard.tsx';
let source = fs.readFileSync(path, 'utf8');

const importAnchor = "import { GameLengthSection } from './game-length-section';\n";
const importLine = "import { InteractionInsightsPanel } from './interaction-insights-panel';\n";

if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) {
    throw new Error('Could not find interaction insights import anchor.');
  }
  source = source.replace(importAnchor, `${importAnchor}${importLine}`);
}

const oldBlock = `          {selectedInteractionRows.length > 0 ? (\n            <ChartFrame\n              description="Win rates for specific corporation-and-prelude pairings, ranked by how often they show up."\n              title="Interaction Insights"\n            >\n              <div className="grid gap-3">\n                {selectedInteractionRows.map((row) => (\n                  <article\n                    className="tm-stat-card"\n                    key={\\`${'${row.playerId ?? \'group\'}-${row.interactionType}-${row.label}'}\\`}\n                  >\n                    <div className="flex items-center justify-between gap-3">\n                      <h3 className="font-semibold text-stone-100">\n                        <SelectionPairLabel\n                          dialogData={selectionDialogData}\n                          label={row.label}\n                        />\n                      </h3>\n                      <p className="tm-accent-copy text-sm">\n                        {formatPercent(row.winRate)}\n                      </p>\n                    </div>\n                    <p className="tm-muted-copy mt-2 text-sm">\n                      {humanizeInteractionType()} | {row.gamesPlayed} results | avg{' '}\n                      {formatAverage(row.averageScore)} points | avg place{' '}\n                      {formatAverage(row.averagePlacement)}\n                    </p>\n                  </article>\n                ))}\n              </div>\n            </ChartFrame>\n          ) : null}`;

const newBlock = `          {selectedInteractionRows.length > 0 ? (\n            <InteractionInsightsPanel\n              dialogData={selectionDialogData}\n              rows={selectedInteractionRows}\n            />\n          ) : null}`;

if (!source.includes(newBlock)) {
  if (!source.includes(oldBlock)) {
    throw new Error('Could not find the existing interaction insights block.');
  }
  source = source.replace(oldBlock, newBlock);
}

source = source.replace(
  "import { SelectionPairLabel } from './selection-name-link';\n",
  '',
);
source = source.replace(
  "function humanizeInteractionType() {\n  return 'Corporation + Prelude';\n}\n\n",
  '',
);

fs.writeFileSync(path, source);
