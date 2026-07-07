import { AppShell } from '@/components/layout/app-shell';
import { LogGameImportShell } from '@/features/imports/log-game-import-shell';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import { listMaps } from '@/lib/db/reference-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  analyzeImportEvidenceAction,
  createImportDraftAction,
} from './actions';

export default async function LogGameImportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== 'AuthSessionMissingError') {
    throw userError;
  }

  if (!user) {
    redirect('/login?next=/log-game/import');
  }

  const [context, mapOptions] = await Promise.all([
    getCurrentGroupContext(),
    listMaps(),
  ]);
  const groupSettings = context
    ? await getGroupSettings(context.groupId)
    : null;

  return (
    <AppShell
      navItems={
        context
          ? undefined
          : [{ href: '/log-game/import', label: 'Web Import' }]
      }
      title="Web Import"
      wide
    >
      <LogGameImportShell
        initialValues={{
          generationCount: 10,
          mapId: groupSettings?.defaultMapId ?? mapOptions[0]?.id ?? '',
          playedOn: new Date().toISOString().slice(0, 10),
          playerCount: 4,
        }}
        mapOptions={mapOptions}
        onAnalyzeImportEvidence={analyzeImportEvidenceAction}
        onCreateImportDraft={createImportDraftAction}
      />
    </AppShell>
  );
}
