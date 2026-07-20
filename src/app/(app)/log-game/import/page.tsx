import { AppShell } from '@/components/layout/app-shell';
import { LogGameImportShell } from '@/features/imports/log-game-import-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { saveDraftGame } from '@/lib/db/game-draft-repo';
import {
  findDuplicateGameLogImportSources,
  markGameLogImportRunComplete,
  saveGameExpansionFacts,
  saveGameLogImport,
  saveParsedGameLogEvents,
} from '@/lib/db/game-import-repo';
import { correctAndSaveOcrText } from '@/lib/db/ocr-correction-repo';
import {
  getCurrentGroupContext,
  requireCurrentGroupContext,
} from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import {
  listImportPlayerIdentityCandidates,
  resolveImportPlayerIdentities,
} from '@/lib/db/import-player-identity-repo';
import type { CreateImportDraftInput } from '@/lib/imports/build-import-draft';
import { listImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import { createImportDraft } from './create-import-draft';
import { pageMetadata } from '@/lib/navigation/route-metadata';
import { revalidatePath } from 'next/cache';

export const metadata = pageMetadata('/log-game/import');

export default async function LogGameImportPage() {
  const context = await getCurrentGroupContext();

  if (!context) {
    return (
      <AppShell showBanner={false} title="Log a Game">
        <section
          aria-labelledby="group-required-heading"
          className="tm-panel max-w-2xl"
        >
          <p className="tm-display-eyebrow text-[11px]">Unavailable</p>
          <h2
            className="tm-panel-title mt-2 text-xl"
            id="group-required-heading"
          >
            A group is required to log a game
          </h2>
          <p className="tm-muted-copy mt-3 text-sm">
            Manual Entry and Import Game both save to an active group. Your
            account needs a group membership before either method is available.
          </p>
        </section>
      </AppShell>
    );
  }

  const [referenceCatalog, playerCandidates] = await Promise.all([
    listImportGameReferenceCatalog(),
    listImportPlayerIdentityCandidates(context.groupId),
  ]);

  // The orchestration lives in ./create-import-draft so the identical entry
  // logic is testable end to end (vitest and the executable-PostgreSQL
  // fixture bridge); this wrapper binds the production boundaries.
  async function handleCreateImportDraft(values: CreateImportDraftInput) {
    'use server';

    return createImportDraft(values, {
      correctAndSaveOcrText,
      findDuplicateGameLogImportSources,
      getGroupSettings,
      listImportGameReferenceCatalog,
      markGameLogImportRunComplete,
      requireCurrentGroupContext,
      resolveImportPlayerIdentities,
      revalidatePath,
      saveDraftGame,
      saveGameExpansionFacts,
      saveGameLogImport,
      saveParsedGameLogEvents,
    });
  }

  return (
    <AppShell
      hasActiveGroup
      headerActions={
        <GroupSwitcher
          currentGroupId={context.groupId}
          returnPath="/log-game/import"
        />
      }
      showBanner={false}
      title="Log a Game"
    >
      <LogGameImportShell
        groupName={context.groupName}
        onCreateImportDraft={handleCreateImportDraft}
        playerCandidates={playerCandidates}
        referenceCatalog={referenceCatalog}
      />
    </AppShell>
  );
}
