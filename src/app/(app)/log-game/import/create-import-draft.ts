// The production import action's orchestration, extracted behind an explicit
// dependency seam so the SAME entry logic runs in three places: the deployed
// server action (page.tsx binds the real repositories), the vitest
// end-to-end action test (repositories mocked at the database boundary), and
// the executable-PostgreSQL fixture bridge (a recording client captures the
// exact persistence payloads and replays them through the real RPC). Only
// pure parsing/building modules are imported here; every side-effecting
// boundary arrives through `deps`.

import {
  buildImportDraft,
  type CreateImportDraftInput,
} from '@/lib/imports/build-import-draft';
import { buildImportSourceEvidence } from '@/lib/imports/build-import-source-evidence';
import {
  TERRAFORMING_MARS_LOG_PARSER_IDENTITY,
  TERRAFORMING_MARS_LOG_SOURCE_FORMAT,
  applyImportObjectiveCorrections,
  parseTerraformingMarsLog,
} from '@/lib/imports/parse-terraforming-mars-log';
import {
  buildGameExpansionFactInput,
  parseTerraformingMarsExpansionMechanics,
  type TrustedExpansionOptionEvidence,
} from '@/lib/imports/parse-terraforming-mars-expansion-mechanics';
import { detectImportBoardMapIndependent } from '@/lib/imports/detect-import-board-map-independent';
import { evaluateImportMapGate } from '@/lib/imports/import-map-gate';
import { resolveOffReserveOceanEvidence } from '@/lib/imports/resolve-off-reserve-ocean-evidence';
import { parseTerraformingMarsTileActions } from '@/lib/imports/parse-terraforming-mars-tile-actions';
import { buildImportedBoardState } from '@/lib/imports/build-imported-board-state';
import { classifyImportObjectiveConfiguration } from '@/lib/imports/objective-configuration';
import { TERRAFORMING_MARS_ENDGAME_OCR_PARSER_IDENTITY } from '@/lib/imports/parse-terraforming-mars-endgame-ocr';
import {
  isTerraformingMarsResultPdf,
  parseTerraformingMarsResultPdf,
} from '@/lib/imports/parse-terraforming-mars-result-pdf';
import {
  applyImportPlayedEntityCorrections,
  parseTerraformingMarsPlayedEntities,
} from '@/lib/imports/parse-terraforming-mars-played-entities';
import { buildTerraformingMarsLogEvents } from '@/lib/imports/build-terraforming-mars-log-events';
import type { getGroupSettings } from '@/lib/db/group-settings-repo';
import type { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import type { listImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import type { resolveImportPlayerIdentities } from '@/lib/db/import-player-identity-repo';
import type { saveDraftGame } from '@/lib/db/game-draft-repo';
import type {
  DuplicateGameLogImportMatch,
  findDuplicateGameLogImportSources,
  markGameLogImportRunComplete,
  saveGameExpansionFacts,
  saveGameLogImport,
  saveParsedGameLogEvents,
} from '@/lib/db/game-import-repo';
import type { correctAndSaveOcrText } from '@/lib/db/ocr-correction-repo';

export type CreateImportDraftDeps = {
  correctAndSaveOcrText: typeof correctAndSaveOcrText;
  findDuplicateGameLogImportSources: typeof findDuplicateGameLogImportSources;
  getGroupSettings: typeof getGroupSettings;
  listImportGameReferenceCatalog: typeof listImportGameReferenceCatalog;
  markGameLogImportRunComplete: typeof markGameLogImportRunComplete;
  requireCurrentGroupContext: typeof requireCurrentGroupContext;
  resolveImportPlayerIdentities: typeof resolveImportPlayerIdentities;
  revalidatePath: (path: string) => void;
  saveDraftGame: typeof saveDraftGame;
  saveGameExpansionFacts: typeof saveGameExpansionFacts;
  saveGameLogImport: typeof saveGameLogImport;
  saveParsedGameLogEvents: typeof saveParsedGameLogEvents;
};

export type CreateImportDraftOcrOutcome = {
  attemptId: string;
  needsReviewCount: number;
  status: 'needs_review' | 'ready_to_parse';
  unresolvedCount: number;
};

export type CreateImportDraftResult =
  | {
      status: 'success';
      gameId: string;
      gameLogImportId: string;
      ocr: CreateImportDraftOcrOutcome | null;
      message: string;
    }
  | {
      /**
       * The same source already backs a game in this group. Nothing was
       * written; the duplicates are surfaced for explicit review. Resubmit
       * with `acknowledgeDuplicateSource: true` to intentionally associate
       * the same bytes with a documented distinct record.
       */
      status: 'duplicate_source';
      duplicates: DuplicateGameLogImportMatch[];
      message: string;
    };

export async function createImportDraft(
  values: CreateImportDraftInput,
  deps: CreateImportDraftDeps,
): Promise<CreateImportDraftResult> {
  const activeContext = await deps.requireCurrentGroupContext();
  const activeGroupSettings = await deps.getGroupSettings(
    activeContext.groupId,
  );
  const authoritativeReferenceCatalog =
    await deps.listImportGameReferenceCatalog();

  // The immutable original source is exactly what the importer submitted —
  // hashing and storage never trim, normalize line endings, or re-encode it.
  // Parsing deliberately uses a separately trimmed value so line numbers stay
  // stable against outer whitespace.
  const originalSourceText = values.exportedGameLog;
  const parserInputText = originalSourceText.trim();

  // Duplicate-source detection runs before any write (H3). A detected
  // duplicate returns a reviewable state instead of silently creating
  // another game backed by the same source; an explicit acknowledgment
  // proceeds and records the association as evidence.
  const duplicateDetection = await deps.findDuplicateGameLogImportSources({
    groupId: activeContext.groupId,
    originalSourceText,
    parserVersion: TERRAFORMING_MARS_LOG_PARSER_IDENTITY,
  });
  const duplicateSignal =
    duplicateDetection.matches.length > 0 ||
    duplicateDetection.deployedRpcDetected;
  if (duplicateSignal && !values.acknowledgeDuplicateSource) {
    const finalizedCount = duplicateDetection.matches.filter(
      (match) => match.gameStatus === 'finalized',
    ).length;
    const draftCount = duplicateDetection.matches.filter(
      (match) => match.gameStatus === 'draft',
    ).length;
    return {
      status: 'duplicate_source',
      duplicates: duplicateDetection.matches,
      message:
        duplicateDetection.matches.length === 0
          ? 'This exact log already backs a game in this group. Review the existing game before importing it again.'
          : draftCount > 0 && finalizedCount === 0
            ? 'This log already backs a saved draft in this group. Resume that draft, or confirm that importing it again as a separate game is intended.'
            : 'This log already backs a finalized game in this group. Importing it again would create a duplicate game — confirm only if that is genuinely intended.',
    };
  }

  const resultIsPdf = Boolean(
    values.endgameScreenshot &&
      isTerraformingMarsResultPdf(values.endgameScreenshot),
  );
  const logParse = parseTerraformingMarsLog({
    catalog: authoritativeReferenceCatalog,
    exportedLogText: parserInputText,
    screenshotOcrText: resultIsPdf ? null : values.rawOcrText,
  });
  const playedEntityParse = parseTerraformingMarsPlayedEntities({
    catalog: authoritativeReferenceCatalog,
    exportedLogText: parserInputText,
  });
  const reviewedPlayedEntityEvidence = applyImportPlayedEntityCorrections({
    catalog: authoritativeReferenceCatalog,
    corrections: values.playedEntityCorrections ?? [],
    evidence: playedEntityParse.evidence,
  });
  const resultPdfParse =
    values.endgameScreenshot && resultIsPdf
      ? await parseTerraformingMarsResultPdf({
          bytes: new Uint8Array(await values.endgameScreenshot.arrayBuffer()),
          catalog: authoritativeReferenceCatalog,
          playedEntityEvidence: reviewedPlayedEntityEvidence,
          players: logParse.players,
        })
      : null;
  const originalObjectiveEvidence = [
    ...logParse.map.evidence,
    ...(resultPdfParse?.objectiveEvidence ?? []),
  ];
  const reviewedObjectiveEvidence = applyImportObjectiveCorrections({
    catalog: authoritativeReferenceCatalog,
    corrections: values.objectiveCorrections ?? [],
    evidence: originalObjectiveEvidence,
  });
  const objectiveConfiguration = values.objectiveConfiguration ?? 'unknown';
  const objectiveConfigurationClass = classifyImportObjectiveConfiguration(
    objectiveConfiguration,
  );
  // Board geometry — the ordered placed/removed tile evidence — is the map
  // signal. Randomized objectives never infer a map, so the independent
  // detector takes the importer's objective configuration as a separate input
  // (see docs/redesign/MASTER-RULES.md map/objective interpretation contract).
  const tileActionSet = parseTerraformingMarsTileActions(parserInputText);
  const reconstructedBoard = buildImportedBoardState(tileActionSet.actions);
  // Verified off-reserve ocean placements (each linked to a source-backed
  // exception card play) explain oceans that fall outside a map's
  // reserved-ocean fingerprint, instead of a guessed constant allowance.
  const offReserveOceanEvidence = resolveOffReserveOceanEvidence({
    cards: authoritativeReferenceCatalog.cards,
    playedEntityEvidence: reviewedPlayedEntityEvidence,
    tileActions: tileActionSet.actions,
  });
  const mapReview = detectImportBoardMapIndependent({
    catalog: authoritativeReferenceCatalog,
    objectiveConfiguration,
    objectiveEvidence: reviewedObjectiveEvidence,
    oceanSpaceIds: tileActionSet.oceanSpaceIds,
    offReserveOceanExceptionSpaceIds: offReserveOceanEvidence.exceptionSpaceIds,
  });
  const parsedPromoSetSlugs = [
    ...new Set(
      reviewedPlayedEntityEvidence.flatMap((evidence) =>
        evidence.promoSetSlug ? [evidence.promoSetSlug] : [],
      ),
    ),
  ].sort();
  if (
    playedEntityParse.errors.length > 0 ||
    reviewedPlayedEntityEvidence.some(
      (evidence) =>
        evidence.resolution === 'ambiguous' ||
        evidence.resolution === 'unknown',
    ) ||
    (values.playedEntityCorrections ?? []).some(
      (correction) =>
        !reviewedPlayedEntityEvidence.some(
          (evidence) =>
            evidence.lineNumber === correction.lineNumber &&
            evidence.entityType === correction.entityType &&
            evidence.canonicalId === correction.canonicalId &&
            evidence.resolution === 'corrected',
        ),
    )
  ) {
    throw new Error(
      'Every played corporation, Prelude, and card must be resolved before saving.',
    );
  }
  const selectedMap = authoritativeReferenceCatalog.maps.find(
    (map) => map.id === values.mapId,
  );
  // Every map is selectable, including Hollandia when objectives are
  // randomized. The confirmed map is rejected only when the reference catalog
  // is broken, the objective setup is still unconfirmed, or the ONE shared
  // map-gate rule (evaluateImportMapGate — identical on the client preview,
  // over identical detector inputs including the off-reserve exception
  // evidence) reports a true conflict or a confident detection of a
  // different map.
  const mapGate = evaluateImportMapGate({
    confirmedMapId: values.mapId,
    mapReview,
  });
  if (
    !selectedMap ||
    objectiveConfiguration === 'unknown' ||
    logParse.referenceAudit.blockingIssues.length > 0 ||
    mapGate.blocked
  ) {
    const reasons = [
      !selectedMap ? 'the confirmed map is not in the reference catalog' : null,
      objectiveConfiguration === 'unknown'
        ? 'the objective setup is unconfirmed'
        : null,
      ...logParse.referenceAudit.blockingIssues.map(
        (issue) => issue.message,
      ),
      mapGate.blocked ? mapGate.message : null,
    ].filter((reason): reason is string => reason !== null);
    throw new Error(
      `Confirm the objective setup and a map consistent with the reconstructed board and objective evidence before saving. (${reasons.join(' ')})`,
    );
  }
  const selectedMilestoneIds = new Set(
    objectiveConfigurationClass === 'randomized'
      ? authoritativeReferenceCatalog.allMilestones.map(
          (objective) => objective.id,
        )
      : authoritativeReferenceCatalog.milestones
          .filter((relationship) => relationship.mapId === values.mapId)
          .map((relationship) => relationship.milestoneId),
  );
  const selectedAwardIds = new Set(
    objectiveConfigurationClass === 'randomized'
      ? authoritativeReferenceCatalog.allAwards.map((objective) => objective.id)
      : authoritativeReferenceCatalog.awards
          .filter((relationship) => relationship.mapId === values.mapId)
          .map((relationship) => relationship.awardId),
  );
  const invalidObjectiveEvidence = reviewedObjectiveEvidence.filter(
    (evidence) =>
      !evidence.canonicalId ||
      !(evidence.type === 'milestone'
        ? selectedMilestoneIds
        : selectedAwardIds
      ).has(evidence.canonicalId),
  );
  const invalidObjectiveCorrections = (values.objectiveCorrections ?? []).filter(
    (correction) =>
      !reviewedObjectiveEvidence.some(
        (evidence) =>
          evidence.lineNumber === correction.lineNumber &&
          evidence.type === correction.type &&
          (!correction.source || evidence.source === correction.source) &&
          evidence.canonicalId === correction.canonicalId &&
          evidence.resolution === 'corrected',
      ),
  );
  if (
    invalidObjectiveEvidence.length > 0 ||
    invalidObjectiveCorrections.length > 0
  ) {
    throw new Error(
      objectiveConfigurationClass === 'randomized'
        ? 'Every imported milestone and award must resolve to a canonical objective before saving.'
        : 'Every imported milestone and award must be resolved to the confirmed map before saving.',
    );
  }
  const authoritativeGenerationCount =
    resultPdfParse?.generationCount ?? logParse.generationCount;
  const authoritativePlayerCount = logParse.playerCount;
  const authoritativeScoreRows =
    resultPdfParse?.scoreRows ?? values.scoreRows ?? [];
  if (!authoritativeGenerationCount || !authoritativePlayerCount) {
    throw new Error(
      'The game result evidence and log must identify the generation and every player seat.',
    );
  }
  if (
    resultPdfParse?.generationCount &&
    logParse.generationCount &&
    resultPdfParse.generationCount !== logParse.generationCount
  ) {
    throw new Error(
      'The game result PDF and exported log disagree on the generation count.',
    );
  }
  if (
    authoritativeScoreRows.length !== authoritativePlayerCount ||
    authoritativeScoreRows.some((row) =>
      [
        row.awardPoints,
        row.cardPointsTotal,
        row.citiesPoints,
        row.finalMegacredits,
        row.greeneryPoints,
        row.milestonePoints,
        row.totalPoints,
        row.trPoints,
      ].some((value) => value === null),
    )
  ) {
    throw new Error(
      'The uploaded result evidence must contain one complete score row for every player.',
    );
  }
  if (values.playerIdentities.length !== authoritativePlayerCount) {
    throw new Error('Resolve one identity for every imported player seat.');
  }

  const playerResolutions = await deps.resolveImportPlayerIdentities({
    groupId: activeContext.groupId,
    identities: values.playerIdentities,
    parserIdentity: TERRAFORMING_MARS_LOG_PARSER_IDENTITY,
    sourceFormat: TERRAFORMING_MARS_LOG_SOURCE_FORMAT,
  });
  // A result-PDF global-parameter table that renders a Venus contribution
  // column is trusted Venus option evidence. The PDF never carries Colonies
  // option evidence, so colonies stays null; and it does not print the final
  // Venus scale, which therefore remains missing rather than being inferred.
  const venusContributionColumnSeen = (
    resultPdfParse?.globalParameters ?? []
  ).some((row) => row.venus != null);
  const expansionOptionEvidence: TrustedExpansionOptionEvidence | null =
    venusContributionColumnSeen
      ? {
          colonies: null,
          originalEvidence:
            'The result PDF global-parameter table includes a Venus contribution column.',
          source: 'result_pdf_global_parameters',
          venusNext: true,
        }
      : null;
  const expansionParse = parseTerraformingMarsExpansionMechanics({
    exportedLogText: parserInputText,
    optionEvidence: expansionOptionEvidence,
    playerResolutions: playerResolutions.map(
      ({ selectedPlayerId, sourcePlayerText }) => ({
        selectedPlayerId,
        sourcePlayerText,
      }),
    ),
  });
  const expansionFacts = buildGameExpansionFactInput(expansionParse);
  const parsedLogEvents = buildTerraformingMarsLogEvents({
    expansionMechanicEvents: expansionParse.events,
    exportedLogText: parserInputText,
    mapId: values.mapId,
    objectiveEvidence: reviewedObjectiveEvidence,
    // Verified exception-card linkage: the ocean placement a source-backed
    // card allowed off-reserve records that card as its explicit source.
    offReserveOceanEvidence,
    playerResolutions: playerResolutions.map(
      ({ selectedPlayerId, sourcePlayerText }) => ({
        selectedPlayerId,
        sourcePlayerText,
      }),
    ),
    playedEntityEvidence: reviewedPlayedEntityEvidence,
    tileActions: tileActionSet.actions,
  });

  const draftForm = buildImportDraft({
    defaultGuaranteedMergerOffer:
      activeGroupSettings.defaultGuaranteedMergerOffer,
    defaultPromoSetSlugs: activeGroupSettings.defaultPromoSetSlugs,
    groupId: activeContext.groupId,
    importValues: {
      ...values,
      generationCount: authoritativeGenerationCount,
      objectiveEvidence: reviewedObjectiveEvidence,
      parsedPromoSetSlugs,
      playedEntityEvidence: reviewedPlayedEntityEvidence,
      playerCount: authoritativePlayerCount,
      resultAwardPlacements: resultPdfParse?.awardPlacements ?? [],
      resultMilestoneClaims: resultPdfParse?.milestoneClaims ?? [],
      scoreRows: authoritativeScoreRows,
    },
    playerResolutions,
  });
  if (
    Object.keys(draftForm.playerScores).length !== authoritativePlayerCount
  ) {
    throw new Error(
      'Every parsed score row must resolve to the preserved imported player ID.',
    );
  }
  const draft = await deps.saveDraftGame({
    form: draftForm,
    userId: activeContext.userId,
  });
  // Deterministic source identity over the EXACT original submission: the
  // client no longer trims before submitting and the stored raw_log_text is
  // byte-identical to the original, so original_sha256 truly covers the
  // original bytes. The parser-run identity mirrors the live-site v2 rule of
  // one run per (source hash, parser version).
  const sourceEvidence = await buildImportSourceEvidence({
    exportedLogText: originalSourceText,
    parserVersion: TERRAFORMING_MARS_LOG_PARSER_IDENTITY,
  });
  const confidenceSummary: Record<string, unknown> = {
    source: {
      duplicate_source_acknowledged: duplicateSignal
        ? {
            acknowledged: true,
            matched_game_ids: duplicateDetection.matches.map(
              (match) => match.gameId,
            ),
          }
        : null,
      hash_scope: 'original_source_bytes',
      original_byte_length: sourceEvidence.originalByteLength,
      original_sha256: sourceEvidence.originalSha256,
      parser_run_identity: sourceEvidence.parserRunIdentity,
      parser_version: sourceEvidence.parserVersion,
      source_has_outer_whitespace: sourceEvidence.sourceHasOuterWhitespace,
      stored_text_matches_original: true,
    },
    expansions: {
      colonies_state: expansionFacts.coloniesState,
      colony_built_count: expansionFacts.colonyBuiltCount,
      colony_trade_count: expansionFacts.colonyTradeCount,
      event_count: expansionParse.events.length,
      final_venus_scale: expansionFacts.finalVenusScale,
      parser_version: expansionFacts.parserVersion,
      source_coverage: expansionFacts.sourceCoverage,
      venus_event_count: expansionFacts.venusEventCount,
      venus_next_state: expansionFacts.venusNextState,
    },
    generation_count: authoritativeGenerationCount,
    map: {
      board_conflicts: reconstructedBoard.conflicts,
      candidates: mapReview.candidates,
      corrections: values.objectiveCorrections ?? [],
      detected_map_id: mapReview.detectedMapId,
      detected_state: mapReview.kind,
      map_source: mapReview.mapSource,
      objective_configuration: objectiveConfiguration,
      ocean_space_ids: tileActionSet.oceanSpaceIds,
      off_reserve_ocean_exceptions: offReserveOceanEvidence.exceptions,
      original_evidence: originalObjectiveEvidence,
      reconstructed_board_space_count: reconstructedBoard.spaces.length,
      reviewed_evidence: reviewedObjectiveEvidence,
      selected_map_id: values.mapId,
      tile_actions: tileActionSet.actions,
      unknown_tile_type_count: tileActionSet.unknownTileTypeCount,
    },
    player_count: authoritativePlayerCount,
    // Recoverable-run state: the import is not a complete canonical record
    // until every persistence step lands and this flips to 'complete'.
    run: {
      started_at: new Date().toISOString(),
      state: 'persisting',
    },
    warnings: [
      ...logParse.warnings,
      ...(resultPdfParse?.warnings ?? []),
      ...expansionParse.warnings,
    ],
    played_entities: {
      corrections: values.playedEntityCorrections ?? [],
      evidence: reviewedPlayedEntityEvidence,
      original_evidence: playedEntityParse.evidence,
      promo_set_slugs: parsedPromoSetSlugs,
      warnings: playedEntityParse.warnings,
    },
  };
  const gameLogImport = await deps.saveGameLogImport({
    gameId: draft.gameId,
    sourceEvidence: {
      originalByteLength: sourceEvidence.originalByteLength,
      originalSha256: sourceEvidence.originalSha256,
      parserRunIdentity: sourceEvidence.parserRunIdentity,
    },
    parseMetadata: {
      confidenceSummary,
      detectedSource: TERRAFORMING_MARS_LOG_SOURCE_FORMAT,
      parseStatus:
        logParse.errors.length > 0
          ? 'parsed_with_errors'
          : logParse.warnings.length > 0 ||
              expansionParse.warnings.length > 0
            ? 'parsed_needs_review'
            : 'parsed_setup_fields',
      parserVersion: TERRAFORMING_MARS_LOG_PARSER_IDENTITY,
      screenshot: values.endgameScreenshot
        ? {
            confidenceSummary: {
              mean_confidence: values.ocrConfidence,
              score_row_states: authoritativeScoreRows.map((row) => ({
                normalized_player_name: row.normalizedPlayerName,
                state: row.status,
                unsupported_component_count: row.unsupportedComponentCount,
              })),
            },
            detectedLayout: resultPdfParse
              ? 'terraforming_mars_result_pdf_text_layer'
              : authoritativeScoreRows.every(
                    (row) => row.status === 'exact_base_layout',
                  )
                ? 'terraforming_mars_base_endgame_score_table'
                : 'terraforming_mars_endgame_score_table_needs_review',
            extractedFields: {
              award_placements: resultPdfParse?.awardPlacements ?? [],
              generation_count: authoritativeGenerationCount,
              global_parameters: resultPdfParse?.globalParameters ?? [],
              milestone_claims: resultPdfParse?.milestoneClaims ?? [],
              raw_result_text: resultPdfParse?.rawText ?? values.rawOcrText,
              score_rows: authoritativeScoreRows,
            },
            ocrEngineVersion:
              resultPdfParse?.parserIdentity ??
              TERRAFORMING_MARS_ENDGAME_OCR_PARSER_IDENTITY,
            parseStatus: authoritativeScoreRows.every(
              (row) => row.status === 'exact_base_layout',
            )
              ? 'parsed_needs_verification'
              : 'parsed_needs_correction',
          }
        : undefined,
      validationErrors: logParse.errors,
      unparsedLineCount: parsedLogEvents.unparsedLineCount,
    },
    playerResolutions,
    rawLogText: originalSourceText,
    screenshotFile: values.endgameScreenshot,
    userId: activeContext.userId,
  });
  await deps.saveParsedGameLogEvents({
    events: parsedLogEvents.events,
    gameLogImportId: gameLogImport.id,
  });
  await deps.saveGameExpansionFacts({
    facts: expansionFacts,
    gameId: draft.gameId,
    gameLogImportId: gameLogImport.id,
  });
  // Every canonical persistence step landed — flip the recoverable-run state
  // to complete. OCR below is deliberately best-effort and never gates
  // completeness (its failure only degrades to a warning).
  await deps.markGameLogImportRunComplete({
    confidenceSummary,
    gameLogImportId: gameLogImport.id,
  });

  let ocr: CreateImportDraftOcrOutcome | null = null;
  let ocrWarning: string | null = null;

  if (!resultPdfParse && values.rawOcrText?.trim()) {
    try {
      const result = await deps.correctAndSaveOcrText({
        engineName: 'tesseract.js',
        engineVersion: '6.0.1',
        gameLogImportId: gameLogImport.id,
        meanConfidence: values.ocrConfidence ?? null,
        metadata: {
          execution_environment: 'browser',
          screenshot_name: values.endgameScreenshotName ?? null,
        },
        preprocessingVariant: 'original',
        rawOcrText: values.rawOcrText.trim(),
        regionType: 'full_image',
      });

      const needsReviewCount = result.needsReview.length;
      const unresolvedCount = result.unresolved.length;

      ocr = {
        attemptId: result.attemptId,
        needsReviewCount,
        status:
          needsReviewCount > 0 || unresolvedCount > 0
            ? 'needs_review'
            : 'ready_to_parse',
        unresolvedCount,
      };
    } catch (error) {
      console.error('OCR correction persistence failed', {
        error,
        gameLogImportId: gameLogImport.id,
      });
      ocrWarning =
        'The import was saved, but its recognized screenshot text could not be processed.';
    }
  } else if (values.endgameScreenshot && !resultIsPdf) {
    ocrWarning =
      'The import was saved, but no readable screenshot text was available.';
  }

  deps.revalidatePath('/log-game');

  return {
    status: 'success' as const,
    gameId: draft.gameId,
    gameLogImportId: gameLogImport.id,
    ocr,
    message:
      ocr?.status === 'needs_review'
        ? `Import draft ${draft.gameId.slice(0, 8)} saved. Some OCR results require review.`
        : ocrWarning ??
          `Import draft ${draft.gameId.slice(0, 8)} saved with evidence.`,
  };
}
