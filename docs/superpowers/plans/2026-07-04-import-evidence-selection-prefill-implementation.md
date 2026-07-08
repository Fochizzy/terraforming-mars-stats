# Import Evidence Selection Prefill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove active expansion and promo tracking from the game logging flow, keep corporation and prelude entry optional, and automatically prefill blank corporation and prelude selections from saved imported game logs.

**Architecture:** Keep the current Next.js draft flow and Supabase-backed import evidence storage. Simplify the visible form surfaces first, then add a hidden draft field that preserves exact imported participant names, parse corporation and prelude hints from saved raw logs on draft load, and merge those hints only into blank player selections. Finalization and insights stay backward-compatible by tolerating legacy expansion and promo fields in stored drafts and analytics, but the active product flow no longer depends on them.

**Tech Stack:** Next.js App Router, React 19, TypeScript, React Hook Form, Zod, Supabase, Vitest, React Testing Library

---

## Planned File Structure

- `src/lib/validation/group-settings.ts`: reduce group settings input to the remaining editable fields
- `src/features/groups/group-settings-form.tsx`: remove default expansion and promo controls from the UI
- `src/features/groups/group-settings-form.test.tsx`: lock the smaller group settings payload and absence of removed controls
- `src/app/(app)/group/settings/page.tsx`: stop loading expansion and promo references and stop submitting removed fields
- `src/lib/db/group-settings-repo.ts`: keep group name, analytics, and default map behavior without touching hidden expansion and promo defaults
- `src/features/games/log-game/setup-step.tsx`: remove expansion and promo controls from the setup card
- `src/features/games/log-game/players-step.tsx`: update optional-entry copy for corporation and preludes
- `src/features/games/log-game/style-step.tsx`: continue showing key cards from the full catalog
- `src/features/games/log-game/log-game-wizard.tsx`: stop filtering corp, prelude, and key-card options by expansion and promo selections
- `src/features/games/log-game/log-game-wizard.test.tsx`: verify the new unfiltered wizard behavior and removed setup controls
- `src/features/games/log-game/reference-filters.ts`: delete once no consumers remain
- `src/features/games/log-game/reference-filters.test.ts`: delete with the implementation file
- `src/lib/validation/log-game.ts`: add hidden imported participant-name mapping while keeping legacy expansion and promo fields compatible
- `src/lib/imports/build-import-draft.ts`: build import drafts with empty compatibility arrays plus imported participant-name mappings
- `src/lib/imports/build-import-draft.test.ts`: lock the new import draft output
- `src/features/games/log-game/use-log-game-draft.ts`: clone and merge the new hidden import-name mapping
- `src/features/games/log-game/log-game-draft.test.ts`: verify the new merge behavior
- `src/lib/imports/parse-import-player-selections.ts`: parse corporation and prelude hints from raw imported log text
- `src/lib/imports/parse-import-player-selections.test.ts`: cover confident, ambiguous, and missing-evidence parsing behavior
- `src/lib/imports/merge-import-player-selections.ts`: merge inferred selections into blank manual selections only
- `src/lib/imports/merge-import-player-selections.test.ts`: lock overwrite protection and slot merge behavior
- `src/app/(app)/log-game/import/page.tsx`: stop passing removed default expansion and promo inputs into import draft creation
- `src/app/(app)/log-game/page.tsx`: compute imported selection prefills on draft load and pass the merged draft into the wizard
- `src/features/games/finalize-game.ts`: remove blocking corporation and prelude review errors while keeping persisted rows when values exist
- `src/features/games/finalize-game.test.ts`: verify finalization succeeds without corporation or prelude selections
- `src/features/insights/build-insight-cards.ts`: stop humanizing interactions as expansion-focused product copy
- `src/features/insights/build-insight-cards.test.ts`: update card-copy expectations
- `src/features/insights/insights-dashboard.tsx`: stop advertising active expansion tracking in dashboard copy
- `src/features/insights/insights-dashboard.test.tsx`: update dashboard expectations

## Delivery Strategy

1. Remove the user-facing controls first so the UI matches the approved behavior immediately.
2. Preserve exact imported participant names in the saved draft snapshot before building any parser so the mapping stays stable even when group player display names differ from imported names.
3. Add a conservative parser and a merge helper as pure functions with focused tests before wiring them into the server page.
4. Relax finalization only after the prefill path exists so we do not trade one blocking workflow for another.
5. Finish with copy cleanup and a broader verification pass across every touched regression surface.

### Task 1: Simplify Group Settings To The Remaining Editable Fields

**Files:**
- Modify: `src/lib/validation/group-settings.ts`
- Modify: `src/features/groups/group-settings-form.tsx`
- Modify: `src/features/groups/group-settings-form.test.tsx`
- Modify: `src/app/(app)/group/settings/page.tsx`
- Modify: `src/lib/db/group-settings-repo.ts`

- [ ] **Step 1: Rewrite the group settings tests around the smaller payload**

```ts
// src/features/groups/group-settings-form.test.tsx
describe('groupSettingsSchema', () => {
  it('accepts only the remaining group fields', () => {
    expect(
      groupSettingsSchema.parse({
        groupName: 'Friday Mars',
        globalAnalyticsEnabled: true,
      }),
    ).toEqual({
      groupName: 'Friday Mars',
      globalAnalyticsEnabled: true,
    });
  });
});

describe('GroupSettingsForm', () => {
  it('submits only the group name and analytics preference', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Saved.',
    });

    render(
      <GroupSettingsForm
        initialValues={{
          groupName: 'Friday Mars',
          globalAnalyticsEnabled: false,
        }}
        onSave={onSave}
      />,
    );

    expect(screen.queryByText(/default expansions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/default promo sets/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/group name/i));
    await user.type(screen.getByLabelText(/group name/i), 'Friday Terraformers');
    await user.click(screen.getByLabelText(/contribute anonymous aggregate analytics/i));
    await user.click(screen.getByRole('button', { name: /save group defaults/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        groupName: 'Friday Terraformers',
        globalAnalyticsEnabled: true,
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused group settings tests and confirm they fail**

Run: `npm.cmd run test -- src/features/groups/group-settings-form.test.tsx`
Expected: FAIL because `groupSettingsSchema` still requires removed arrays and `GroupSettingsForm` still renders expansion and promo controls.

- [ ] **Step 3: Remove the hidden defaults from the editable schema, form props, page loader, and save path**

```ts
// src/lib/validation/group-settings.ts
import { z } from 'zod';

export const groupSettingsSchema = z.object({
  groupName: z.string().min(2),
  globalAnalyticsEnabled: z.boolean(),
});

export type GroupSettingsInput = z.input<typeof groupSettingsSchema>;
```

```tsx
// src/features/groups/group-settings-form.tsx
type GroupSettingsFormProps = {
  initialValues: GroupSettingsInput;
  onSave: (values: GroupSettingsInput) => Promise<SaveResult>;
};

export function GroupSettingsForm({
  initialValues,
  onSave,
}: GroupSettingsFormProps) {
  const form = useForm<GroupSettingsInput>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: initialValues,
  });
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => {
        setIsPending(true);
        setResult(null);
        startTransition(async () => {
          try {
            const nextResult = await onSave(values);
            setResult(nextResult);
          } catch (error) {
            setResult({
              status: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : 'Unable to save group defaults right now.',
            });
          } finally {
            setIsPending(false);
          }
        });
      })}
    >
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold text-stone-200">Group Name</span>
        <input
          aria-label="Group Name"
          className="rounded-xl border border-orange-900/30 bg-stone-950 px-4 py-3"
          {...form.register('groupName')}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" {...form.register('globalAnalyticsEnabled')} />
        Contribute anonymous aggregate analytics
      </label>
      {result ? (
        <p
          className={
            result.status === 'success'
              ? 'text-sm text-emerald-300'
              : 'text-sm text-rose-300'
          }
        >
          {result.message}
        </p>
      ) : null}
      <button
        className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Saving...' : 'Save Group Defaults'}
      </button>
    </form>
  );
}
```

```ts
// src/app/(app)/group/settings/page.tsx
const settings = await getGroupSettings(context.groupId);

async function handleSaveGroupSettings(values: GroupSettingsInput) {
  'use server';

  const activeContext = await requireCurrentGroupContext();
  const parsed = groupSettingsSchema.parse(values);
  await saveGroupSettings({
    group_id: activeContext.groupId,
    group_name: parsed.groupName,
    global_analytics_enabled: parsed.globalAnalyticsEnabled,
  });
  revalidatePath('/group');
  revalidatePath('/group/settings');
  revalidatePath('/log-game');

  return {
    status: 'success' as const,
    message: 'Group defaults saved for future games.',
  };
}

return (
  <AppShell title="Group Settings">
    <GroupSettingsForm
      initialValues={{
        groupName: settings.groupName,
        globalAnalyticsEnabled: settings.globalAnalyticsEnabled,
      }}
      onSave={handleSaveGroupSettings}
    />
  </AppShell>
);
```

```ts
// src/lib/db/group-settings-repo.ts
export type GroupSettingsSnapshot = {
  groupId: string;
  groupName: string;
  globalAnalyticsEnabled: boolean;
  defaultMapId: string | null;
};

export async function getGroupSettings(groupId: string): Promise<GroupSettingsSnapshot> {
  const supabase = await createSupabaseServerClient();
  const [{ data: group, error: groupError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from('groups').select('name').eq('id', groupId).single(),
      supabase
        .from('group_settings')
        .select('global_analytics_enabled, default_map_id')
        .eq('group_id', groupId)
        .maybeSingle(),
    ]);

  if (groupError) throw groupError;
  if (settingsError) throw settingsError;

  return {
    groupId,
    groupName: group.name,
    globalAnalyticsEnabled: settings?.global_analytics_enabled ?? false,
    defaultMapId: settings?.default_map_id ?? null,
  };
}

export async function saveGroupSettings(input: {
  group_id: string;
  group_name: string;
  global_analytics_enabled: boolean;
  default_map_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { error: groupError } = await supabase
    .from('groups')
    .update({ name: input.group_name })
    .eq('id', input.group_id);

  if (groupError) throw groupError;

  const { data, error } = await supabase
    .from('group_settings')
    .upsert({
      group_id: input.group_id,
      global_analytics_enabled: input.global_analytics_enabled,
      default_map_id: input.default_map_id ?? null,
    })
    .select('group_id, global_analytics_enabled, default_map_id')
    .single();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Run the focused tests again**

Run: `npm.cmd run test -- src/features/groups/group-settings-form.test.tsx`
Expected: PASS with the new two-field schema and no expansion or promo controls rendered.

- [ ] **Step 5: Commit the group settings simplification**

```bash
git add src/lib/validation/group-settings.ts src/features/groups/group-settings-form.tsx src/features/groups/group-settings-form.test.tsx "src/app/(app)/group/settings/page.tsx" src/lib/db/group-settings-repo.ts
git commit -m "feat: simplify group settings defaults"
```

### Task 2: Remove Expansion And Promo Controls From The Log Game Wizard

**Files:**
- Modify: `src/features/games/log-game/setup-step.tsx`
- Modify: `src/features/games/log-game/players-step.tsx`
- Modify: `src/features/games/log-game/style-step.tsx`
- Modify: `src/features/games/log-game/log-game-wizard.tsx`
- Modify: `src/features/games/log-game/log-game-wizard.test.tsx`
- Modify: `src/app/(app)/log-game/page.tsx`
- Delete: `src/features/games/log-game/reference-filters.ts`
- Delete: `src/features/games/log-game/reference-filters.test.ts`

- [ ] **Step 1: Replace the wizard tests with the new visible behavior**

```ts
// src/features/games/log-game/log-game-wizard.test.tsx
it('submits a draft payload without rendering expansion or promo controls', async () => {
  const user = userEvent.setup();
  const onSaveDraft = vi.fn().mockResolvedValue({
    status: 'success' as const,
    gameId: 'game-1',
    message: 'Draft created.',
  });

  render(
    <LogGameWizard
      awardOptions={[]}
      cardOptions={[
        {
          cardName: 'Io Mining Industries',
          cardNumber: '042',
          expansionCode: 'base',
          id: 'card1',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
      ]}
      corporationOptions={[
        {
          expansionCode: 'base',
          id: 'corp1',
          name: 'Tharsis Republic',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
      ]}
      initialValues={{
        awardClaims: {},
        expansionCodes: [],
        gameId: undefined,
        generationCount: 10,
        groupId: '11111111-1111-4111-8111-111111111111',
        mapId: 'tharsis',
        milestoneClaims: {},
        notes: '',
        playedOn: '2026-07-03',
        playerCount: 2,
        playerScores: {},
        playerSelections: {},
        playerStyles: {},
        promoSetSlugs: [],
        selectedPlayerIds: ['p1'],
      }}
      mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
      milestoneOptions={[]}
      onFinalizeGame={vi.fn()}
      onSaveDraft={onSaveDraft}
      playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
      preludeOptions={[
        {
          expansionCode: 'prelude',
          id: 'prelude1',
          name: 'Allied Bank',
          promoSetSlug: null,
          requiredExpansionCodes: ['prelude'],
        },
      ]}
      styleOptions={[{ code: 'engine_builder', id: 'style1', name: 'Engine Builder' }]}
    />,
  );

  expect(screen.queryByText(/expansions/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/promo sets/i)).not.toBeInTheDocument();
  expect(screen.getByText(/corporation and prelude selections are optional/i)).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /tharsis republic/i })).toBeInTheDocument();
  expect(screen.getAllByRole('option', { name: /allied bank/i })).toHaveLength(3);
  expect(
    screen.getAllByRole('option', { name: /042 - io mining industries/i }),
  ).toHaveLength(3);

  await user.click(screen.getByRole('button', { name: /save draft setup/i }));

  await waitFor(() =>
    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        expansionCodes: [],
        promoSetSlugs: [],
      }),
    ),
  );
});

it('shows the full corporation, prelude, and key-card catalogs without setup filters', () => {
  render(
    <LogGameWizard
      awardOptions={[]}
      cardOptions={[
        {
          cardName: 'Colonizer Training Camp',
          cardNumber: '001',
          expansionCode: 'base',
          id: 'card-base',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
        {
          cardName: 'Political Alliance',
          cardNumber: 'X09',
          expansionCode: 'promo',
          id: 'card-promo',
          promoSetSlug: '2019-turmoil-promos',
          requiredExpansionCodes: ['turmoil'],
        },
      ]}
      corporationOptions={[
        {
          expansionCode: 'base',
          id: 'corp-base',
          name: 'Tharsis Republic',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
        {
          expansionCode: 'colonies',
          id: 'corp-colonies',
          name: 'Poseidon',
          promoSetSlug: null,
          requiredExpansionCodes: ['colonies'],
        },
      ]}
      initialValues={{
        awardClaims: {},
        expansionCodes: [],
        gameId: undefined,
        generationCount: 10,
        groupId: '11111111-1111-4111-8111-111111111111',
        mapId: 'tharsis',
        milestoneClaims: {},
        notes: '',
        playedOn: '2026-07-03',
        playerCount: 1,
        playerScores: {},
        playerSelections: {},
        playerStyles: {},
        promoSetSlugs: [],
        selectedPlayerIds: ['p1'],
      }}
      mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
      milestoneOptions={[]}
      onFinalizeGame={vi.fn()}
      onSaveDraft={vi.fn()}
      playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
      preludeOptions={[
        {
          expansionCode: 'prelude',
          id: 'prelude-base',
          name: 'Allied Bank',
          promoSetSlug: null,
          requiredExpansionCodes: ['prelude'],
        },
        {
          expansionCode: 'prelude',
          id: 'prelude-promo',
          name: 'Corporate Archives',
          promoSetSlug: '2022-seasonal-promos',
          requiredExpansionCodes: ['prelude'],
        },
      ]}
      styleOptions={[{ code: 'balanced', id: 'style1', name: 'Balanced' }]}
    />,
  );

  expect(screen.getByRole('option', { name: /tharsis republic/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /poseidon/i })).toBeInTheDocument();
  expect(screen.getAllByRole('option', { name: /allied bank/i })).toHaveLength(3);
  expect(screen.getAllByRole('option', { name: /corporate archives/i })).toHaveLength(3);
  expect(
    screen.getAllByRole('option', { name: /x09 - political alliance/i }),
  ).toHaveLength(3);
});
```

- [ ] **Step 2: Run the wizard tests and confirm the removed controls still break them**

Run: `npm.cmd run test -- src/features/games/log-game/log-game-wizard.test.tsx`
Expected: FAIL because `SetupStep` still renders expansion and promo controls and `LogGameWizard` still filters catalog options.

- [ ] **Step 3: Remove setup controls, stop filtering catalogs, and delete the dead filter helpers**

```tsx
// src/features/games/log-game/setup-step.tsx
type SetupStepProps = {
  mapOptions: MapOption[];
  register: UseFormRegister<LogGameDraftInput>;
};

export function SetupStep({ mapOptions, register }: SetupStepProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-900/30 bg-black/25 p-4">
      <h2 className="font-serif text-xl font-semibold">Game Setup</h2>
      <p className="text-sm text-stone-300">
        Choose the date, map, player count, and generation count for this game.
      </p>
      <Link
        className="w-fit rounded-full border border-cyan-300/40 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:text-cyan-50"
        href="/log-game/import"
      >
        Open Web Import
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Played On</span>
          <input
            aria-label="Played On"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            type="date"
            {...register('playedOn')}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Map</span>
          <select
            aria-label="Map"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            {...register('mapId')}
          >
            {mapOptions.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Player Count</span>
          <select
            aria-label="Player Count"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            {...register('playerCount', { valueAsNumber: true })}
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Generation Count</span>
          <input
            aria-label="Generation Count"
            className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3"
            min={1}
            type="number"
            {...register('generationCount', { valueAsNumber: true })}
          />
        </label>
      </div>
    </section>
  );
}
```

```tsx
// src/features/games/log-game/players-step.tsx
<p className="text-sm text-stone-300">
  Pick saved players, then optionally assign corporation and prelude selections.
</p>
<p className="text-sm text-stone-400">
  Select at least one saved player to optionally assign corporations and preludes.
</p>
```

```tsx
// src/features/games/log-game/log-game-wizard.tsx
const selectedPlayerIds =
  useWatch({ control: form.control, name: 'selectedPlayerIds' }) ?? [];
const currentMapId = useWatch({ control: form.control, name: 'mapId' });
const playerCount = useWatch({ control: form.control, name: 'playerCount' }) ?? 0;
const milestoneClaims =
  useWatch({ control: form.control, name: 'milestoneClaims' }) ?? {};
const awardClaims = useWatch({ control: form.control, name: 'awardClaims' }) ?? {};
const playerScores = useWatch({ control: form.control, name: 'playerScores' }) ?? {};
const playerSelections =
  useWatch({ control: form.control, name: 'playerSelections' }) ?? {};
const playerStyles = useWatch({ control: form.control, name: 'playerStyles' }) ?? {};

const selectedPlayers = selectedPlayerIds
  .map((playerId) => playerOptions.find((player) => player.id === playerId))
  .filter((player): player is NonNullable<typeof player> => Boolean(player));
const visibleMilestones = milestoneOptions.filter(
  (milestone) => milestone.mapId === currentMapId,
);
const visibleAwards = awardOptions.filter((award) => award.mapId === currentMapId);
const review = buildGameReview({
  awardClaims,
  gameId: form.getValues('gameId'),
  mapAwardIds: visibleAwards.map((award) => award.awardId),
  mapMilestoneIds: visibleMilestones.map((milestone) => milestone.milestoneId),
  milestoneClaims,
  notes: form.getValues('notes'),
  playerCount,
  playerScores,
  playerSelections,
  playerStyles,
  selectedPlayerIds,
});

<SetupStep mapOptions={mapOptions} register={form.register} />
<PlayersStep
  corporationOptions={corporationOptions}
  playerOptions={playerOptions}
  preludeOptions={preludeOptions}
  register={form.register}
  selectedPlayerIds={selectedPlayerIds}
/>
<StyleStep
  cardOptions={cardOptions}
  register={form.register}
  selectedPlayers={selectedPlayers}
  styleOptions={styleOptions}
/>
```

```ts
// src/app/(app)/log-game/page.tsx
const [
  groupSettings,
  mapOptions,
  playerOptions,
  corporationOptions,
  preludeOptions,
  milestoneOptions,
  awardOptions,
  styleOptions,
  cardOptions,
  latestCatalogSnapshotId,
] = await Promise.all([
  getGroupSettings(context.groupId),
  listMaps(),
  listPlayers(context.groupId),
  listCorporations(),
  listPreludes(),
  listMapMilestones(),
  listMapAwards(),
  listStyles(),
  listCards(),
  getLatestCatalogSnapshotId(),
]);

const defaultInitialValues: LogGameDraftInput = {
  awardClaims: {},
  expansionCodes: [],
  gameId: undefined,
  generationCount: 10,
  groupId: context.groupId,
  mapId: groupSettings.defaultMapId ?? mapOptions[0]?.id ?? '',
  milestoneClaims: {},
  notes: '',
  playedOn: new Date().toISOString().slice(0, 10),
  playerCount: Math.min(Math.max(playerOptions.length || 2, 1), 5),
  playerScores: {},
  playerSelections: {},
  playerStyles: {},
  promoSetSlugs: [],
  selectedPlayerIds: playerOptions.slice(0, 2).map((player) => player.id),
};
```

- [ ] **Step 4: Run the updated wizard tests**

Run: `npm.cmd run test -- src/features/games/log-game/log-game-wizard.test.tsx`
Expected: PASS with no visible expansion or promo controls and no filtered-out corporation, prelude, or key-card options.

- [ ] **Step 5: Commit the wizard simplification**

```bash
git add src/features/games/log-game/setup-step.tsx src/features/games/log-game/players-step.tsx src/features/games/log-game/style-step.tsx src/features/games/log-game/log-game-wizard.tsx src/features/games/log-game/log-game-wizard.test.tsx "src/app/(app)/log-game/page.tsx"
git rm src/features/games/log-game/reference-filters.ts src/features/games/log-game/reference-filters.test.ts
git commit -m "feat: remove setup expansion tracking"
```

### Task 3: Preserve Imported Participant Names In Draft Snapshots

**Files:**
- Modify: `src/lib/validation/log-game.ts`
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Modify: `src/features/games/log-game/use-log-game-draft.ts`
- Modify: `src/features/games/log-game/log-game-draft.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/app/(app)/log-game/page.tsx`

- [ ] **Step 1: Add failing tests for the hidden imported-name map**

```ts
// src/lib/imports/build-import-draft.test.ts
it('builds a cloud draft payload from import values and imported participant names', () => {
  expect(
    buildImportDraft({
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: 'Friday Mars chose corporation Tharsis Republic.',
        generationCount: 12,
        mapId: 'elysium',
        participantNames: ['Friday Mars', 'Second Seat', 'Third Seat'],
        playedOn: '2026-07-04',
        playerCount: 3,
      },
      selectedPlayerIds: ['player-1', 'player-2', 'player-3'],
    }),
  ).toEqual(
    expect.objectContaining({
      expansionCodes: [],
      promoSetSlugs: [],
      importParticipantNamesByPlayerId: {
        'player-1': 'Friday Mars',
        'player-2': 'Second Seat',
        'player-3': 'Third Seat',
      },
    }),
  );
});
```

```ts
// src/features/games/log-game/log-game-draft.test.ts
it('hydrates imported participant names alongside the saved draft shell', () => {
  const merged = mergeDraftIntoInitialValues(
    {
      awardClaims: {},
      expansionCodes: [],
      gameId: undefined,
      generationCount: 10,
      groupId: '11111111-1111-4111-8111-111111111111',
      importParticipantNamesByPlayerId: {},
      mapId: 'tharsis',
      milestoneClaims: {},
      notes: '',
      playedOn: '2026-07-03',
      playerCount: 2,
      playerScores: {},
      playerSelections: {},
      playerStyles: {},
      promoSetSlugs: [],
      selectedPlayerIds: [],
    },
    {
      gameId: 'game-1',
      importParticipantNamesByPlayerId: {
        p1: 'Friday Mars',
      },
      selectedPlayerIds: ['p1'],
    },
  );

  expect(merged.importParticipantNamesByPlayerId).toEqual({
    p1: 'Friday Mars',
  });
});
```

- [ ] **Step 2: Run the draft-shape tests and confirm they fail**

Run: `npm.cmd run test -- src/lib/imports/build-import-draft.test.ts src/features/games/log-game/log-game-draft.test.ts`
Expected: FAIL because `LogGameDraftInput` and `buildImportDraft` do not yet expose `importParticipantNamesByPlayerId`.

- [ ] **Step 3: Add the hidden field to the draft schema and populate it from import draft creation**

```ts
// src/lib/validation/log-game.ts
const importedParticipantNamesSchema = z
  .record(
    z.string(),
    z
      .string()
      .optional()
      .nullable()
      .transform(sanitizeString),
  )
  .default({})
  .transform((record) =>
    Object.fromEntries(
      Object.entries(record).filter(([, value]) => value.length > 0),
    ),
  );

export const logGameDraftSchema = z.object({
  gameId: z.string().optional(),
  groupId: z.string().uuid(),
  playedOn: z.string(),
  mapId: z.string(),
  playerCount: z.number().min(1).max(5),
  generationCount: z.number().min(1),
  expansionCodes: z.array(z.string()).default([]),
  promoSetSlugs: z.array(z.string()).default([]),
  selectedPlayerIds: z.array(z.string()).default([]),
  importParticipantNamesByPlayerId: importedParticipantNamesSchema,
  notes: z.string().default(''),
  playerSelections: z
    .record(z.string(), playerSelectionSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedSelection)),
  milestoneClaims: z
    .record(z.string(), milestoneClaimSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedMilestoneClaim)),
  awardClaims: z
    .record(z.string(), awardClaimSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedAwardClaim)),
  playerScores: z
    .record(z.string(), playerScoreSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedScore)),
  playerStyles: z
    .record(z.string(), playerStyleSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedStyle)),
});
```

```ts
// src/lib/imports/build-import-draft.ts
function buildImportParticipantNamesByPlayerId(
  selectedPlayerIds: string[],
  participantNames: string[],
) {
  return Object.fromEntries(
    selectedPlayerIds.flatMap((playerId, index) => {
      const participantName = participantNames[index]?.trim() ?? '';

      return participantName ? [[playerId, participantName] as const] : [];
    }),
  );
}

export function buildImportDraft(input: {
  groupId: string;
  importValues: ImportDraftValues;
  selectedPlayerIds: string[];
}): LogGameDraftInput {
  return {
    awardClaims: {},
    expansionCodes: [],
    gameId: undefined,
    generationCount: input.importValues.generationCount,
    groupId: input.groupId,
    importParticipantNamesByPlayerId: buildImportParticipantNamesByPlayerId(
      input.selectedPlayerIds,
      input.importValues.participantNames,
    ),
    mapId: input.importValues.mapId,
    milestoneClaims: {},
    notes: buildImportDraftNotes({
      endgameScreenshotName: input.importValues.endgameScreenshotName,
      exportedGameLog: input.importValues.exportedGameLog,
    }),
    playedOn: input.importValues.playedOn,
    playerCount:
      input.selectedPlayerIds.length || input.importValues.playerCount,
    playerScores: {},
    playerSelections: {},
    playerStyles: {},
    promoSetSlugs: [],
    selectedPlayerIds: input.selectedPlayerIds,
  };
}
```

```ts
// src/features/games/log-game/use-log-game-draft.ts
type PreviousGameSetup = {
  mapId: string;
  playerCount: number;
  expansionCodes: string[];
  promoSetSlugs: string[];
  selectedPlayerIds: string[];
  importParticipantNamesByPlayerId?: Record<string, string>;
  totalPoints?: number[];
};

export function mergeDraftIntoInitialValues(
  initialValues: LogGameDraftInput,
  draftValues: Partial<LogGameDraftInput> | null | undefined,
): LogGameDraftInput {
  if (!draftValues) {
    return initialValues;
  }

  return {
    ...initialValues,
    ...draftValues,
    awardClaims: draftValues.awardClaims
      ? { ...draftValues.awardClaims }
      : { ...initialValues.awardClaims },
    expansionCodes: draftValues.expansionCodes
      ? [...draftValues.expansionCodes]
      : [...initialValues.expansionCodes],
    importParticipantNamesByPlayerId: draftValues.importParticipantNamesByPlayerId
      ? { ...draftValues.importParticipantNamesByPlayerId }
      : { ...initialValues.importParticipantNamesByPlayerId },
    milestoneClaims: draftValues.milestoneClaims
      ? { ...draftValues.milestoneClaims }
      : { ...initialValues.milestoneClaims },
    playerScores: draftValues.playerScores
      ? { ...draftValues.playerScores }
      : { ...initialValues.playerScores },
    playerSelections: draftValues.playerSelections
      ? { ...draftValues.playerSelections }
      : { ...initialValues.playerSelections },
    playerStyles: draftValues.playerStyles
      ? { ...draftValues.playerStyles }
      : { ...initialValues.playerStyles },
    promoSetSlugs: draftValues.promoSetSlugs
      ? [...draftValues.promoSetSlugs]
      : [...initialValues.promoSetSlugs],
    selectedPlayerIds: draftValues.selectedPlayerIds
      ? [...draftValues.selectedPlayerIds]
      : [...initialValues.selectedPlayerIds],
  };
}
```

```ts
// src/app/(app)/log-game/import/page.tsx
const draftForm = buildImportDraft({
  groupId: importGroup.groupId,
  importValues: values,
  selectedPlayerIds: importGroup.selectedPlayerIds,
});
```

```ts
// src/app/(app)/log-game/page.tsx
const defaultInitialValues: LogGameDraftInput = {
  awardClaims: {},
  expansionCodes: [],
  gameId: undefined,
  generationCount: 10,
  groupId: context.groupId,
  importParticipantNamesByPlayerId: {},
  mapId: groupSettings.defaultMapId ?? mapOptions[0]?.id ?? '',
  milestoneClaims: {},
  notes: '',
  playedOn: new Date().toISOString().slice(0, 10),
  playerCount: Math.min(Math.max(playerOptions.length || 2, 1), 5),
  playerScores: {},
  playerSelections: {},
  playerStyles: {},
  promoSetSlugs: [],
  selectedPlayerIds: playerOptions.slice(0, 2).map((player) => player.id),
};
```

- [ ] **Step 4: Run the updated draft-shape tests**

Run: `npm.cmd run test -- src/lib/imports/build-import-draft.test.ts src/features/games/log-game/log-game-draft.test.ts`
Expected: PASS with the imported participant-name mapping preserved in the draft snapshot.

- [ ] **Step 5: Commit the draft-shape update**

```bash
git add src/lib/validation/log-game.ts src/lib/imports/build-import-draft.ts src/lib/imports/build-import-draft.test.ts src/features/games/log-game/use-log-game-draft.ts src/features/games/log-game/log-game-draft.test.ts "src/app/(app)/log-game/import/page.tsx" "src/app/(app)/log-game/page.tsx"
git commit -m "feat: preserve imported participant names in drafts"
```

### Task 4: Add A Conservative Parser And Merge Helper For Imported Player Selections

**Files:**
- Create: `src/lib/imports/parse-import-player-selections.ts`
- Create: `src/lib/imports/parse-import-player-selections.test.ts`
- Create: `src/lib/imports/merge-import-player-selections.ts`
- Create: `src/lib/imports/merge-import-player-selections.test.ts`

- [ ] **Step 1: Write parser and merge-helper tests before any implementation**

```ts
// src/lib/imports/parse-import-player-selections.test.ts
import { describe, expect, it } from 'vitest';
import { parseImportPlayerSelections } from './parse-import-player-selections';

const corporations = [
  {
    expansionCode: 'base',
    id: 'corp1',
    name: 'Tharsis Republic',
    promoSetSlug: null,
    requiredExpansionCodes: ['base'],
  },
  {
    expansionCode: 'colonies',
    id: 'corp2',
    name: 'Poseidon',
    promoSetSlug: null,
    requiredExpansionCodes: ['colonies'],
  },
];

const preludes = [
  {
    expansionCode: 'prelude',
    id: 'prelude1',
    name: 'Allied Bank',
    promoSetSlug: null,
    requiredExpansionCodes: ['prelude'],
  },
  {
    expansionCode: 'prelude',
    id: 'prelude2',
    name: 'Corporate Archives',
    promoSetSlug: null,
    requiredExpansionCodes: ['prelude'],
  },
  {
    expansionCode: 'prelude',
    id: 'prelude3',
    name: 'Donation',
    promoSetSlug: null,
    requiredExpansionCodes: ['prelude'],
  },
];

describe('parseImportPlayerSelections', () => {
  it('extracts a corporation and up to three preludes from confident lines', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: preludes,
        rawLogText: [
          'Friday Mars chose corporation Tharsis Republic',
          'Friday Mars kept preludes Allied Bank, Corporate Archives',
        ].join('\\n'),
      }),
    ).toEqual({
      p1: {
        corporationId: 'corp1',
        preludeIds: ['prelude1', 'prelude2'],
      },
    });
  });

  it('drops an ambiguous corporation match instead of guessing', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: preludes,
        rawLogText:
          'Friday Mars mentioned corporation Tharsis Republic and Poseidon in the same line',
      }),
    ).toEqual({});
  });

  it('ignores prelude lines that resolve to more than three unique cards', () => {
    expect(
      parseImportPlayerSelections({
        corporationOptions: corporations,
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        preludeOptions: [...preludes, {
          expansionCode: 'prelude',
          id: 'prelude4',
          name: 'Experimental Forest',
          promoSetSlug: null,
          requiredExpansionCodes: ['prelude'],
        }],
        rawLogText:
          'Friday Mars kept preludes Allied Bank, Corporate Archives, Donation, Experimental Forest',
      }),
    ).toEqual({});
  });
});
```

```ts
// src/lib/imports/merge-import-player-selections.test.ts
import { describe, expect, it } from 'vitest';
import { mergeImportPlayerSelections } from './merge-import-player-selections';

describe('mergeImportPlayerSelections', () => {
  it('fills only blank corporation and prelude slots', () => {
    expect(
      mergeImportPlayerSelections(
        {
          p1: {
            corporationId: '',
            preludeIds: [''],
          },
          p2: {
            corporationId: 'corp-manual',
            preludeIds: ['prelude-manual'],
          },
        },
        {
          p1: {
            corporationId: 'corp-imported',
            preludeIds: ['prelude-a', 'prelude-b'],
          },
          p2: {
            corporationId: 'corp-imported-2',
            preludeIds: ['prelude-c'],
          },
        },
      ),
    ).toEqual({
      p1: {
        corporationId: 'corp-imported',
        preludeIds: ['prelude-a', 'prelude-b'],
      },
      p2: {
        corporationId: 'corp-manual',
        preludeIds: ['prelude-manual'],
      },
    });
  });
});
```

- [ ] **Step 2: Run the new helper tests and verify they fail**

Run: `npm.cmd run test -- src/lib/imports/parse-import-player-selections.test.ts src/lib/imports/merge-import-player-selections.test.ts`
Expected: FAIL because both helper files are missing.

- [ ] **Step 3: Implement the parser and merge helper with conservative matching**

```ts
// src/lib/imports/parse-import-player-selections.ts
import type { CorporationOption, PreludeOption } from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';

type ImportParticipant = {
  importedName: string;
  playerId: string;
};

type ParsedPlayerSelection = {
  corporationId: string;
  preludeIds: string[];
};

function normalizeImportToken(input: string) {
  return normalizePlayerAlias(input).replace(/\s+/g, ' ');
}

function findMatchingIds(
  normalizedLine: string,
  options: Array<{ id: string; name: string }>,
) {
  return options
    .filter((option) => normalizedLine.includes(normalizeImportToken(option.name)))
    .map((option) => option.id);
}

export function parseImportPlayerSelections(input: {
  corporationOptions: CorporationOption[];
  participants: ImportParticipant[];
  preludeOptions: PreludeOption[];
  rawLogText: string;
}): Record<string, ParsedPlayerSelection> {
  const lines = input.rawLogText
    .split(/\r?\n/)
    .map((line) => normalizeImportToken(line))
    .filter(Boolean);
  const detected = new Map<
    string,
    { corporationIds: Set<string>; preludeIds: Set<string> }
  >();

  for (const participant of input.participants) {
    detected.set(participant.playerId, {
      corporationIds: new Set<string>(),
      preludeIds: new Set<string>(),
    });
  }

  for (const line of lines) {
    for (const participant of input.participants) {
      const participantToken = normalizeImportToken(participant.importedName);

      if (!line.includes(participantToken)) {
        continue;
      }

      const entry = detected.get(participant.playerId);

      if (!entry) {
        continue;
      }

      if (line.includes('corporation')) {
        const corporationMatches = findMatchingIds(line, input.corporationOptions);

        if (corporationMatches.length === 1) {
          entry.corporationIds.add(corporationMatches[0]!);
        }

        if (corporationMatches.length > 1) {
          entry.corporationIds.clear();
        }
      }

      if (line.includes('prelude')) {
        const preludeMatches = findMatchingIds(line, input.preludeOptions);

        if (preludeMatches.length > 0 && preludeMatches.length <= 3) {
          for (const preludeId of preludeMatches) {
            entry.preludeIds.add(preludeId);
          }
        }

        if (preludeMatches.length > 3) {
          entry.preludeIds.clear();
        }
      }
    }
  }

  return Object.fromEntries(
    [...detected.entries()].flatMap(([playerId, selection]) => {
      const corporationId =
        selection.corporationIds.size === 1
          ? [...selection.corporationIds][0]!
          : '';
      const preludeIds =
        selection.preludeIds.size > 0 && selection.preludeIds.size <= 3
          ? [...selection.preludeIds]
          : [];

      if (!corporationId && preludeIds.length === 0) {
        return [];
      }

      return [[playerId, { corporationId, preludeIds }] as const];
    }),
  );
}
```

```ts
// src/lib/imports/merge-import-player-selections.ts
type PlayerSelection = {
  corporationId?: string | null;
  preludeIds?: Array<string | null | undefined>;
};

function normalizePreludeIds(values: Array<string | null | undefined> | undefined) {
  return (values ?? []).map((value) => value?.trim() ?? '').filter(Boolean);
}

export function mergeImportPlayerSelections(
  currentSelections: Record<string, PlayerSelection>,
  inferredSelections: Record<string, { corporationId: string; preludeIds: string[] }>,
) {
  const merged: Record<string, { corporationId: string; preludeIds: string[] }> = {};
  const playerIds = new Set([
    ...Object.keys(currentSelections),
    ...Object.keys(inferredSelections),
  ]);

  for (const playerId of playerIds) {
    const current = currentSelections[playerId];
    const inferred = inferredSelections[playerId];
    const currentCorporationId = current?.corporationId?.trim() ?? '';
    const currentPreludeIds = normalizePreludeIds(current?.preludeIds);

    const corporationId =
      currentCorporationId || inferred?.corporationId?.trim() || '';
    const preludeIds =
      currentPreludeIds.length > 0 ? currentPreludeIds : inferred?.preludeIds ?? [];

    if (!corporationId && preludeIds.length === 0) {
      continue;
    }

    merged[playerId] = {
      corporationId,
      preludeIds,
    };
  }

  return merged;
}
```

- [ ] **Step 4: Run the helper tests again**

Run: `npm.cmd run test -- src/lib/imports/parse-import-player-selections.test.ts src/lib/imports/merge-import-player-selections.test.ts`
Expected: PASS with confident matches extracted and manual selections preserved.

- [ ] **Step 5: Commit the helper layer**

```bash
git add src/lib/imports/parse-import-player-selections.ts src/lib/imports/parse-import-player-selections.test.ts src/lib/imports/merge-import-player-selections.ts src/lib/imports/merge-import-player-selections.test.ts
git commit -m "feat: parse import player selections"
```

### Task 5: Prefill Imported Selections On Draft Load And Remove Blocking Corporation Requirements

**Files:**
- Modify: `src/app/(app)/log-game/page.tsx`
- Modify: `src/features/games/finalize-game.ts`
- Modify: `src/features/games/finalize-game.test.ts`
- Modify: `src/features/games/log-game/log-game-draft.test.ts`

- [ ] **Step 1: Add failing tests for non-blocking finalization and imported prefill merge behavior**

```ts
// src/features/games/finalize-game.test.ts
describe('buildGameReview', () => {
  it('does not require corporations or preludes to finalize a game', () => {
    const review = buildGameReview({
      mapAwardIds: [],
      mapMilestoneIds: [],
      playerCount: 1,
      playerScores: {
        p1: {
          awardPoints: 0,
          cardPointsTotal: 12,
          citiesPoints: 4,
          finalMegacredits: 8,
          greeneryPoints: 6,
          milestonePoints: 0,
          totalPoints: 38,
          trPoints: 16,
        },
      },
      selectedPlayerIds: ['p1'],
    });

    expect(review.issues.map((issue) => issue.code)).not.toContain('missing_corporation');
    expect(review.issues.map((issue) => issue.code)).not.toContain('missing_preludes');
  });
});

describe('buildFinalizedGamePayload', () => {
  it('finalizes score rows even when corporation and prelude selections are blank', () => {
    const payload = buildFinalizedGamePayload({
      awardClaims: {},
      catalogSnapshotId: 'catalog-1',
      gameId: 'game-optional',
      mapAwardIds: [],
      mapMilestoneIds: [],
      milestoneClaims: {},
      notes: '',
      playerCount: 1,
      playerScores: {
        p1: {
          awardPoints: 0,
          cardPointsTotal: 12,
          citiesPoints: 4,
          finalMegacredits: 8,
          greeneryPoints: 6,
          milestonePoints: 0,
          totalPoints: 38,
          trPoints: 16,
        },
      },
      playerSelections: {},
      playerStyles: {},
      selectedPlayerIds: ['p1'],
    });

    expect(payload.players).toEqual([
      expect.objectContaining({
        corporationId: null,
        playerId: 'p1',
      }),
    ]);
    expect(payload.preludes).toEqual([]);
  });
});
```

```ts
// src/features/games/log-game/log-game-draft.test.ts
import { mergeImportPlayerSelections } from '@/lib/imports/merge-import-player-selections';

it('keeps manual selections and fills only missing imported slots', () => {
  expect(
    mergeImportPlayerSelections(
      {
        p1: {
          corporationId: '',
          preludeIds: [],
        },
        p2: {
          corporationId: 'corp-manual',
          preludeIds: ['prelude-manual'],
        },
      },
      {
        p1: {
          corporationId: 'corp-imported',
          preludeIds: ['prelude-imported'],
        },
        p2: {
          corporationId: 'corp-imported-2',
          preludeIds: ['prelude-imported-2'],
        },
      },
    ),
  ).toEqual({
    p1: {
      corporationId: 'corp-imported',
      preludeIds: ['prelude-imported'],
    },
    p2: {
      corporationId: 'corp-manual',
      preludeIds: ['prelude-manual'],
    },
  });
});
```

- [ ] **Step 2: Run the review and draft-merge tests and confirm they fail**

Run: `npm.cmd run test -- src/features/games/finalize-game.test.ts src/features/games/log-game/log-game-draft.test.ts`
Expected: FAIL because `buildGameReview` still emits `missing_corporation` and `missing_preludes` errors and the `/log-game` page does not yet apply imported prefills.

- [ ] **Step 3: Wire imported prefills into the page load and remove corporation/prelude blocking issues**

```ts
// src/app/(app)/log-game/page.tsx
import { mergeImportPlayerSelections } from '@/lib/imports/merge-import-player-selections';
import { parseImportPlayerSelections } from '@/lib/imports/parse-import-player-selections';

const mergedInitialValues = mergeDraftIntoInitialValues(defaultInitialValues, savedDraft);

const importedParticipants = importSummary
  ? mergedInitialValues.selectedPlayerIds.flatMap((playerId) => {
      const importedName =
        mergedInitialValues.importParticipantNamesByPlayerId[playerId] ??
        playerOptions.find((player) => player.id === playerId)?.display_name ??
        '';

      return importedName ? [{ importedName, playerId }] : [];
    })
  : [];

const importedSelectionPrefill =
  importSummary && importedParticipants.length > 0
    ? parseImportPlayerSelections({
        corporationOptions,
        participants: importedParticipants,
        preludeOptions,
        rawLogText: importSummary.rawLogText,
      })
    : {};

const initialValues = {
  ...mergedInitialValues,
  playerSelections: mergeImportPlayerSelections(
    mergedInitialValues.playerSelections,
    importedSelectionPrefill,
  ),
};

const finalizedPayload = buildFinalizedGamePayload({
  awardClaims: parsed.awardClaims,
  catalogSnapshotId: latestCatalogSnapshotId,
  gameId: parsed.gameId,
  mapAwardIds: awardOptions
    .filter((award) => award.mapId === parsed.mapId)
    .map((award) => award.awardId),
  mapMilestoneIds: milestoneOptions
    .filter((milestone) => milestone.mapId === parsed.mapId)
    .map((milestone) => milestone.milestoneId),
  milestoneClaims: parsed.milestoneClaims,
  notes: parsed.notes,
  playerCount: parsed.playerCount,
  playerScores: parsed.playerScores,
  playerSelections: parsed.playerSelections,
  playerStyles: parsed.playerStyles,
  selectedPlayerIds: parsed.selectedPlayerIds,
});
```

```ts
// src/features/games/finalize-game.ts
type ReviewIssue = {
  code:
    | 'player_count_mismatch'
    | 'missing_score_fields'
    | 'invalid_map_milestone'
    | 'missing_milestone_winner'
    | 'milestone_points_mismatch'
    | 'invalid_map_award'
    | 'missing_award_funder'
    | 'missing_award_first_place'
    | 'award_points_mismatch'
    | 'invalid_card_breakdown';
  message: string;
  severity: 'error' | 'warning';
};

type ReviewGameInput = Partial<
  Pick<
    LogGameDraftInput,
    | 'awardClaims'
    | 'gameId'
    | 'milestoneClaims'
    | 'notes'
    | 'playerCount'
    | 'playerScores'
    | 'playerSelections'
    | 'playerStyles'
  >
> & {
  mapAwardIds: string[];
  mapMilestoneIds: string[];
  selectedPlayerIds: string[];
};

export function buildGameReview(input: ReviewGameInput): GameReview {
  const issues: ReviewIssue[] = [];
  const expectedMilestonePoints = buildExpectedMilestonePoints(input);
  const expectedAwardPoints = buildExpectedAwardPoints(input);
  const expectedPlayerCount = input.playerCount ?? input.selectedPlayerIds.length;

  if (input.selectedPlayerIds.length !== expectedPlayerCount) {
    issues.push({
      code: 'player_count_mismatch',
      message: 'Selected players do not match the chosen player count.',
      severity: 'error',
    });
  }

  for (const { playerId, score, style } of buildPlayerSelectionRows(input)) {
    const missingScoreFields = REQUIRED_SCORE_FIELDS.filter(
      (field) => !isValidNumber(score[field]),
    );

    if (missingScoreFields.length > 0) {
      issues.push({
        code: 'missing_score_fields',
        message: `Finish the required score fields for ${playerId}.`,
        severity: 'error',
      });
    }
  }

  return {
    coverage: {
      playersWithCardBreakdown: input.selectedPlayerIds.filter((playerId) => {
        const score = input.playerScores?.[playerId] ?? {};
        return (
          isValidNumber(score.cardPointsMicrobes) &&
          isValidNumber(score.cardPointsAnimals) &&
          isValidNumber(score.cardPointsJovian)
        );
      }).length,
      playersWithDeclaredStyle: input.selectedPlayerIds.filter((playerId) => {
        const style = getPlayerStyle(input, playerId);
        return hasValue(style.primaryStyleCode) || style.modifierStyleCodes.length > 0;
      }).length,
      playersWithKeyCards: input.selectedPlayerIds.filter((playerId) => {
        const style = getPlayerStyle(input, playerId);
        return style.keyCardIds.length > 0;
      }).length,
      playersWithOptionalSubscores: input.selectedPlayerIds.filter((playerId) => {
        const score = input.playerScores?.[playerId] ?? {};
        return [
          score.cardPointsMicrobes,
          score.cardPointsAnimals,
          score.cardPointsJovian,
        ].some((value) => isValidNumber(value));
      }).length,
    },
    issues,
  };
}
```

- [ ] **Step 4: Run the updated review and draft tests**

Run: `npm.cmd run test -- src/features/games/finalize-game.test.ts src/features/games/log-game/log-game-draft.test.ts`
Expected: PASS with imported selections merged into blank slots only and finalization succeeding without manual corporation or prelude data.

- [ ] **Step 5: Commit the prefill wiring and validation change**

```bash
git add "src/app/(app)/log-game/page.tsx" src/features/games/finalize-game.ts src/features/games/finalize-game.test.ts src/features/games/log-game/log-game-draft.test.ts
git commit -m "feat: prefill optional import selections"
```

### Task 6: Remove Expansion-Tracking Product Copy And Run Broader Verification

**Files:**
- Modify: `src/features/insights/build-insight-cards.ts`
- Modify: `src/features/insights/build-insight-cards.test.ts`
- Modify: `src/features/insights/insights-dashboard.tsx`
- Modify: `src/features/insights/insights-dashboard.test.tsx`

- [ ] **Step 1: Update the insights tests to the new copy**

```ts
// src/features/insights/build-insight-cards.test.ts
expect(cards[3].body).toMatch(/map setup/i);
expect(cards[3].body).not.toMatch(/expansion mix/i);
```

```ts
// src/features/insights/insights-dashboard.test.tsx
expect(
  screen.getByText(/interaction comparisons will appear after enough finalized games link maps, corporations, and preludes/i),
).toBeInTheDocument();
expect(screen.queryByText(/map \+ expansions/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the insights tests and confirm the old copy still fails them**

Run: `npm.cmd run test -- src/features/insights/build-insight-cards.test.ts src/features/insights/insights-dashboard.test.tsx`
Expected: FAIL because the current copy still humanizes `map_expansion_mix` as expansion-focused product language.

- [ ] **Step 3: Update the humanized labels and dashboard copy**

```ts
// src/features/insights/build-insight-cards.ts
function humanizeInteractionType(interactionType: GroupInteractionRow['interactionType']) {
  if (interactionType === 'corporation_prelude_pair') {
    return 'corporation and prelude pairing';
  }

  return 'map setup combination';
}
```

```tsx
// src/features/insights/insights-dashboard.tsx
function humanizeInteractionType(
  interactionType: GroupInteractionRow['interactionType'],
) {
  if (interactionType === 'corporation_prelude_pair') {
    return 'Corporation + Prelude';
  }

  return 'Map Setup';
}

<p className="text-sm text-stone-300">
  Compare weighted leaderboard form, score-source patterns, style
  agreement, head-to-head edges, lineup effects, interaction pairings,
  and promo catalog references from finalized games only.
</p>

<p className="text-sm text-stone-400">
  Interaction comparisons will appear after enough finalized games
  link maps, corporations, and preludes.
</p>
```

- [ ] **Step 4: Run the broader touched-suite verification**

Run: `npm.cmd run test -- src/features/groups/group-settings-form.test.tsx src/features/games/log-game/log-game-wizard.test.tsx src/lib/imports/build-import-draft.test.ts src/features/games/log-game/log-game-draft.test.ts src/lib/imports/parse-import-player-selections.test.ts src/lib/imports/merge-import-player-selections.test.ts src/features/games/finalize-game.test.ts src/features/insights/build-insight-cards.test.ts src/features/insights/insights-dashboard.test.tsx`
Expected: PASS for every touched regression surface.

Run: `npm.cmd run build`
Expected: PASS with the current wizard, import, finalize, and insights code compiling together.

- [ ] **Step 5: Commit the copy cleanup and verification pass**

```bash
git add src/features/insights/build-insight-cards.ts src/features/insights/build-insight-cards.test.ts src/features/insights/insights-dashboard.tsx src/features/insights/insights-dashboard.test.tsx
git commit -m "feat: remove expansion tracking copy"
```
