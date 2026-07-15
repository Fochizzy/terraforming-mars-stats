import { readFile, rm, writeFile } from 'node:fs/promises';

// One-time integration script. The workflow removes this file after validation.
const selectionPath = 'src/features/insights/selection-stats-section.tsx';
let selection = await readFile(selectionPath, 'utf8');

const glossaryImport = "import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';";
const iconImport = "import { Clock3, Scale, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react';";

if (!selection.includes(iconImport)) {
  if (!selection.includes(glossaryImport)) {
    throw new Error('Could not find GlossaryRichText import anchor.');
  }
  selection = selection.replace(glossaryImport, `${iconImport}\n${glossaryImport}`);
}

const narrativeAnchor = `  const narratives = buildFinalTerraformingActionNarratives(props.rows);\n\n  return (`;
const narrativeReplacement = `  const narratives = buildFinalTerraformingActionNarratives(props.rows);\n  const narrativeIcons = [Target, Scale, Clock3, TrendingUp];\n\n  return (`;

if (!selection.includes(narrativeAnchor)) {
  throw new Error('Could not find final-action narrative anchor.');
}
selection = selection.replace(narrativeAnchor, narrativeReplacement);

const oldCard = `      <div className="rounded border border-[var(--tm-copper-700)]/50 bg-black/10 p-3 text-sm text-stone-200">\n        <p className="tm-data-label mb-2">What the finishing patterns suggest</p>\n        <div className="flex flex-col gap-1">\n          {narratives.map((narrative) => (\n            <p key={narrative}>{narrative}</p>\n          ))}\n        </div>\n      </div>`;

const newCard = `      <section className="overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-amber-950/20 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,232,196,0.06)] sm:px-6">\n        <div className="grid gap-5 lg:grid-cols-[132px_1fr] lg:items-center">\n          <div className="hidden lg:flex lg:justify-center">\n            <span className="flex h-24 w-24 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/[0.06] shadow-[inset_0_0_28px_rgba(251,191,36,0.08)]">\n              <Trophy aria-hidden="true" className="h-12 w-12 text-amber-300" />\n            </span>\n          </div>\n\n          <div>\n            <div className="mb-4 flex items-center gap-3">\n              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/[0.06] lg:hidden">\n                <Trophy aria-hidden="true" className="h-5 w-5 text-amber-300" />\n              </span>\n              <h4 className="tm-panel-title text-base font-semibold sm:text-lg">\n                <GlossaryRichText maxLinks={2}>\n                  What the finishing patterns suggest\n                </GlossaryRichText>\n              </h4>\n            </div>\n\n            <div className="grid gap-3">\n              {narratives.map((narrative, index) => {\n                const NarrativeIcon = narrativeIcons[index] ?? Sparkles;\n\n                return (\n                  <div\n                    className="grid grid-cols-[auto_1fr] items-start gap-3"\n                    key={narrative}\n                  >\n                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300/20 bg-black/20">\n                      <NarrativeIcon\n                        aria-hidden="true"\n                        className="h-4 w-4 text-amber-300"\n                      />\n                    </span>\n                    <p className="text-sm leading-6 text-stone-200 sm:text-base">\n                      <GlossaryRichText>{narrative}</GlossaryRichText>\n                    </p>\n                  </div>\n                );\n              })}\n            </div>\n          </div>\n        </div>\n      </section>`;

if (!selection.includes(oldCard)) {
  throw new Error('Could not find the existing finishing-pattern card.');
}
selection = selection.replace(oldCard, newCard);
await writeFile(selectionPath, selection);

await rm('scripts/apply-insight-card-vision.mjs', { force: true });
await rm('.github/workflows/apply-insight-card-vision.yml', { force: true });
