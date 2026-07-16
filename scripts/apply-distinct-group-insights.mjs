import { readFile, writeFile } from 'node:fs/promises';

const pagePath = 'src/app/(app)/insights/insights-page.tsx';
const source = await readFile(pagePath, 'utf8');
let next = source;

const importAnchor = "import { InsightsDashboard } from '@/features/insights/insights-dashboard';";
const groupImport =
  "import { GroupInsightsDashboard } from '@/features/insights/group-insights-dashboard';";

if (!next.includes(groupImport)) {
  if (!next.includes(importAnchor)) {
    throw new Error('Could not find InsightsDashboard import anchor.');
  }

  next = next.replace(importAnchor, `${groupImport}\n${importAnchor}`);
}

const dashboardBlock = `      <InsightsDashboard
        analytics={analytics}
        currentUserCanonicalId={\`user:\${context.userId}\`}
        groupId={context.groupId}
        initialHiddenCombinationPlayerIds={hiddenGroupInsightPlayerIds}
        extended={extendedAnalytics}
        finalTerraformingActionStats={finalTerraformingActionStats}
        focusPeople={focusPeople}
        mapAwardGroups={mapAwardGroups}
        overallAnalytics={overallAnalytics.analytics}
        overallExtended={overallAnalytics.extended}
        personalSelectionStats={personalSelectionStats}
        selectionDialogData={selectionDialogData}
        sharedGameRows={sharedGameRows}
        scopeMode={mode}
        styleEffectivenessScopes={styleEffectivenessScopes}
      >
        {mode === 'group' ? (
          <GroupSwitcher currentGroupId={context.groupId} returnPath={returnPath} />
        ) : null}
      </InsightsDashboard>`;

const replacement = `      {mode === 'group' ? (
        <GroupInsightsDashboard
          analytics={analytics}
          currentUserCanonicalId={\`user:\${context.userId}\`}
          groupId={context.groupId}
          initialHiddenCombinationPlayerIds={hiddenGroupInsightPlayerIds}
          extended={extendedAnalytics}
          focusPeople={focusPeople}
          mapAwardGroups={mapAwardGroups}
          overallExtended={overallAnalytics.extended}
          sharedGameRows={sharedGameRows}
        >
          <GroupSwitcher currentGroupId={context.groupId} returnPath={returnPath} />
        </GroupInsightsDashboard>
      ) : (
        <InsightsDashboard
          analytics={analytics}
          currentUserCanonicalId={\`user:\${context.userId}\`}
          groupId={context.groupId}
          initialHiddenCombinationPlayerIds={hiddenGroupInsightPlayerIds}
          extended={extendedAnalytics}
          finalTerraformingActionStats={finalTerraformingActionStats}
          focusPeople={focusPeople}
          mapAwardGroups={mapAwardGroups}
          overallAnalytics={overallAnalytics.analytics}
          overallExtended={overallAnalytics.extended}
          personalSelectionStats={personalSelectionStats}
          selectionDialogData={selectionDialogData}
          sharedGameRows={sharedGameRows}
          scopeMode={mode}
          styleEffectivenessScopes={styleEffectivenessScopes}
        />
      )}`;

if (!next.includes('<GroupInsightsDashboard')) {
  if (!next.includes(dashboardBlock)) {
    throw new Error('Could not find the current InsightsDashboard render block.');
  }

  next = next.replace(dashboardBlock, replacement);
}

if (next === source) {
  console.log('Distinct group insights are already integrated.');
  process.exit(0);
}

await writeFile(pagePath, next, 'utf8');
console.log('Integrated the distinct full group insights dashboard.');
