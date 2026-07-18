'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import { recognizeScreenshotInBrowser } from '@/lib/ocr/browser-tesseract';
import { EntryMethodSelector } from '@/features/games/log-game/entry-method-selector';
import type { LogGameWorkflowStateKind } from '@/features/games/log-game/log-game-entry';
import {
  applyImportObjectiveCorrections,
  getObjectiveCorrectionOptions,
  parseTerraformingMarsLog,
  type ImportObjectiveCorrection,
  type ImportObjectiveEvidence,
  type TerraformingMarsLogParseResult,
} from '@/lib/imports/parse-terraforming-mars-log';
import {
  parseTerraformingMarsEndgameOcr,
  type ImportedScoreRow,
} from '@/lib/imports/parse-terraforming-mars-endgame-ocr';
import type { BrowserOcrWord } from '@/lib/ocr/browser-tesseract';
import {
  isTerraformingMarsResultPdf,
  parseTerraformingMarsResultPdf,
  type TerraformingMarsResultPdfParseResult,
} from '@/lib/imports/parse-terraforming-mars-result-pdf';
import type {
  ParsedScreenshotAwardPlacement,
  ParsedScreenshotMilestoneClaim,
} from '@/lib/imports/parse-score-details-screenshot';
import {
  applyImportPlayedEntityCorrections,
  parseTerraformingMarsPlayedEntities,
  type ImportPlayedEntityCorrection,
  type ImportPlayedEntityType,
} from '@/lib/imports/parse-terraforming-mars-played-entities';
import { detectImportBoardMapIndependent } from '@/lib/imports/detect-import-board-map-independent';
import { parseTerraformingMarsTileActions } from '@/lib/imports/parse-terraforming-mars-tile-actions';
import { buildImportedBoardState } from '@/lib/imports/build-imported-board-state';
import {
  classifyImportObjectiveConfiguration,
  importObjectiveConfigurationLabel,
  IMPORT_OBJECTIVE_CONFIGURATIONS,
  type ImportObjectiveConfiguration,
} from '@/lib/imports/objective-configuration';
import { ImportPlayerIdentityReview } from './import-player-identity-review';
import {
  evaluateImportPlayerIdentity,
  findExactImportedSourceCandidates,
  importPlayerIdentityInputSchema,
  type ImportPlayerIdentityCandidate,
  type ImportPlayerIdentityDraftInput,
} from '@/lib/player-identity/guest-identity';

export type WebImportDraftValues = {
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  ocrConfidence: number | null;
  objectiveCorrections: ImportObjectiveCorrection[];
  objectiveConfiguration: ImportObjectiveConfiguration;
  playedOn: string;
  playerIdentities: ImportPlayerIdentityDraftInput[];
  playerCount: number;
  playedEntityCorrections: ImportPlayedEntityCorrection[];
  rawOcrText: string;
  scoreRows: ImportedScoreRow[];
  resultAwardPlacements: ParsedScreenshotAwardPlacement[];
  resultMilestoneClaims: ParsedScreenshotMilestoneClaim[];
};

export type WebImportActionResult = {
  gameId?: string;
  message?: string;
  status: 'error' | 'idle' | 'success';
};

type WebImportPageProps = {
  groupName: string;
  playerCandidates: ImportPlayerIdentityCandidate[];
  referenceCatalog: ImportGameReferenceCatalog;
  onStartImport: (
    values: WebImportDraftValues,
  ) => Promise<WebImportActionResult>;
};

type SupportedScoreField =
  | 'awardPoints'
  | 'cardPointsTotal'
  | 'citiesPoints'
  | 'cardPointsAnimals'
  | 'cardPointsJovian'
  | 'cardPointsMicrobes'
  | 'finalMegacredits'
  | 'greeneryPoints'
  | 'milestonePoints'
  | 'totalPoints'
  | 'trPoints';

const SUPPORTED_SCORE_FIELDS: Array<{
  key: SupportedScoreField;
  label: string;
}> = [
  { key: 'trPoints', label: 'TR' },
  { key: 'milestonePoints', label: 'Milestones' },
  { key: 'awardPoints', label: 'Awards' },
  { key: 'greeneryPoints', label: 'Greenery' },
  { key: 'citiesPoints', label: 'Cities' },
  { key: 'cardPointsTotal', label: 'Cards' },
  { key: 'totalPoints', label: 'Total' },
  { key: 'finalMegacredits', label: 'Final MC' },
  { key: 'cardPointsMicrobes', label: 'Card microbes' },
  { key: 'cardPointsAnimals', label: 'Card animals' },
  { key: 'cardPointsJovian', label: 'Card Jovian' },
];

function importDraftFingerprint(values: WebImportDraftValues) {
  return JSON.stringify({
    ...values,
    endgameScreenshot: values.endgameScreenshot
      ? {
          lastModified: values.endgameScreenshot.lastModified,
          name: values.endgameScreenshot.name,
          size: values.endgameScreenshot.size,
          type: values.endgameScreenshot.type,
        }
      : null,
    exportedGameLog: values.exportedGameLog.trim(),
    playerIdentities: values.playerIdentities.map((identity) => {
      if (identity.mode === 'existing_player') {
        return {
          mode: identity.mode,
          selectedPlayerId: identity.selectedPlayerId,
          sourcePlayerText: identity.sourcePlayerText.trim(),
          valueSource: identity.valueSource ?? 'user_corrected',
        };
      }

      if (identity.mode === 'username') {
        return {
          createNew: identity.createNew ?? false,
          mode: identity.mode,
          selectedPlayerId: identity.selectedPlayerId ?? null,
          sourcePlayerText: identity.sourcePlayerText.trim(),
          username: identity.username.trim(),
          valueSource: identity.valueSource ?? 'user_corrected',
        };
      }

      return {
        createNew: identity.createNew ?? false,
        firstName: identity.firstName.trim(),
        lastName: identity.lastName.trim(),
        mode: identity.mode,
        selectedPlayerId: identity.selectedPlayerId ?? null,
        sourcePlayerText: identity.sourcePlayerText.trim(),
        valueSource: identity.valueSource ?? 'user_corrected',
      };
    }),
    rawOcrText: values.rawOcrText.trim(),
    scoreRows: values.scoreRows,
  });
}

function dateFromFile(file: File) {
  const date = new Date(file.lastModified);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


function buildParsedPlayerIdentities(
  result: TerraformingMarsLogParseResult,
  candidates: ImportPlayerIdentityCandidate[],
): ImportPlayerIdentityDraftInput[] {
  return result.players.map((player) => {
    const exactCandidates = findExactImportedSourceCandidates({
      candidates,
      sourcePlayerText: player.originalValue,
    });

    return {
      mode: 'existing_player',
      selectedPlayerId:
        exactCandidates.length === 1 ? exactCandidates[0].id : '',
      sourcePlayerText: player.originalValue,
      valueSource: exactCandidates.length === 1 ? 'imported' : 'user_corrected',
    };
  });
}

function fieldStatus(value: string | number | null, source: string) {
  return (
    <div className="tm-stat-card min-w-0">
      <p className="tm-data-label">{source}</p>
      <p className="mt-2 break-words text-lg font-semibold text-stone-100">
        {value ?? 'Unresolved'}
      </p>
    </div>
  );
}

export function WebImportPage({
  groupName,
  playerCandidates,
  referenceCatalog,
  onStartImport,
}: WebImportPageProps) {
  const [exportedGameLog, setExportedGameLog] = useState('');
  const [endgameScreenshot, setEndgameScreenshot] = useState<File | null>(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [ocrWords, setOcrWords] = useState<BrowserOcrWord[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [playedOn, setPlayedOn] = useState('');
  const [confirmedMapId, setConfirmedMapId] = useState('');
  const [objectiveConfiguration, setObjectiveConfiguration] =
    useState<ImportObjectiveConfiguration>('unknown');
  const [resultPdfParse, setResultPdfParse] =
    useState<TerraformingMarsResultPdfParseResult | null>(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [objectiveCorrections, setObjectiveCorrections] = useState<
    ImportObjectiveCorrection[]
  >([]);
  const [playedEntityCorrections, setPlayedEntityCorrections] = useState<
    ImportPlayedEntityCorrection[]
  >([]);
  const [scoreRows, setScoreRows] = useState<ImportedScoreRow[]>([]);
  const [playerIdentities, setPlayerIdentities] = useState<
    ImportPlayerIdentityDraftInput[]
  >([]);
  const [feedback, setFeedback] = useState<WebImportActionResult>({
    status: 'idle',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isResultPdf = Boolean(
    endgameScreenshot && isTerraformingMarsResultPdf(endgameScreenshot),
  );
  const screenshotTextForLog = isResultPdf ? '' : rawOcrText;
  const parseResult = useMemo(
    () =>
      parseTerraformingMarsLog({
        catalog: referenceCatalog,
        exportedLogText: exportedGameLog,
        screenshotOcrText: screenshotTextForLog,
      }),
    [exportedGameLog, screenshotTextForLog, referenceCatalog],
  );
  const playerEvidenceFingerprint = parseResult.players
    .map((player) => player.normalizedValue)
    .join('|');
  const playedEntityParse = useMemo(
    () =>
      parseTerraformingMarsPlayedEntities({
        catalog: referenceCatalog,
        exportedLogText: exportedGameLog,
      }),
    [exportedGameLog, referenceCatalog],
  );
  const reviewedPlayedEntityEvidence = useMemo(
    () =>
      applyImportPlayedEntityCorrections({
        catalog: referenceCatalog,
        corrections: playedEntityCorrections,
        evidence: playedEntityParse.evidence,
      }),
    [playedEntityCorrections, playedEntityParse.evidence, referenceCatalog],
  );
  const screenshotScoreParse = useMemo(
    () =>
      parseTerraformingMarsEndgameOcr({
        players: parseResult.players,
        rawText: rawOcrText,
        words: ocrWords,
      }),
    [ocrWords, parseResult.players, rawOcrText],
  );
  const scoreParseResult = useMemo(
    () =>
      resultPdfParse
        ? { scoreRows: resultPdfParse.scoreRows, warnings: resultPdfParse.warnings }
        : screenshotScoreParse,
    [resultPdfParse, screenshotScoreParse],
  );
  const tileActionSet = useMemo(
    () => parseTerraformingMarsTileActions(exportedGameLog),
    [exportedGameLog],
  );
  const reconstructedBoard = useMemo(
    () => buildImportedBoardState(tileActionSet.actions),
    [tileActionSet.actions],
  );
  const originalObjectiveEvidence = useMemo<ImportObjectiveEvidence[]>(
    () => [
      ...parseResult.map.evidence,
      ...(resultPdfParse?.objectiveEvidence ?? []),
    ],
    [parseResult.map.evidence, resultPdfParse?.objectiveEvidence],
  );
  const reviewedObjectiveEvidence = useMemo(
    () =>
      applyImportObjectiveCorrections({
        catalog: referenceCatalog,
        corrections: objectiveCorrections,
        evidence: originalObjectiveEvidence,
      }),
    [objectiveCorrections, originalObjectiveEvidence, referenceCatalog],
  );
  const mapReview = useMemo(
    () => detectImportBoardMapIndependent({
      catalog: referenceCatalog,
      objectiveConfiguration,
      objectiveEvidence: reviewedObjectiveEvidence,
      oceanSpaceIds: tileActionSet.oceanSpaceIds,
    }),
    [
      objectiveConfiguration,
      referenceCatalog,
      reviewedObjectiveEvidence,
      tileActionSet.oceanSpaceIds,
    ],
  );
  const objectiveConfigurationClass = classifyImportObjectiveConfiguration(
    objectiveConfiguration,
  );
  const milestoneCorrectionOptions =
    objectiveConfigurationClass === 'randomized'
      ? referenceCatalog.allMilestones
      : confirmedMapId && objectiveConfigurationClass === 'standard'
        ? getObjectiveCorrectionOptions(
            referenceCatalog,
            confirmedMapId,
            'milestone',
          )
        : [];
  const awardCorrectionOptions =
    objectiveConfigurationClass === 'randomized'
      ? referenceCatalog.allAwards
      : confirmedMapId && objectiveConfigurationClass === 'standard'
        ? getObjectiveCorrectionOptions(referenceCatalog, confirmedMapId, 'award')
        : [];
  const updateObjectiveCorrection = (
    type: 'award' | 'milestone',
    source: ImportObjectiveEvidence['source'],
    lineNumber: number,
    canonicalId: string,
  ) => {
    setObjectiveCorrections((current) => {
      const remaining = current.filter(
        (correction) =>
          correction.type !== type ||
          correction.source !== source ||
          correction.lineNumber !== lineNumber,
      );
      return canonicalId
        ? [...remaining, { canonicalId, lineNumber, source, type }]
        : remaining;
    });
  };
  const updatePlayedEntityCorrection = (
    lineNumber: number,
    selection: string,
  ) => {
    setPlayedEntityCorrections((current) => {
      const remaining = current.filter(
        (correction) => correction.lineNumber !== lineNumber,
      );
      if (!selection) {
        return remaining;
      }
      const [entityType, canonicalId] = selection.split(':', 2);
      if (
        !canonicalId ||
        !(
          entityType === 'card' ||
          entityType === 'corporation' ||
          entityType === 'prelude'
        )
      ) {
        return remaining;
      }
      return [
        ...remaining,
        {
          canonicalId,
          entityType: entityType as ImportPlayedEntityType,
          lineNumber,
        },
      ];
    });
  };
  const playerCount = parseResult.playerCount ?? 0;
  const currentValues: WebImportDraftValues = {
    endgameScreenshot,
    exportedGameLog,
    generationCount,
    mapId: confirmedMapId,
    ocrConfidence,
    objectiveCorrections,
    objectiveConfiguration,
    playedOn,
    playerIdentities,
    playerCount,
    playedEntityCorrections,
    rawOcrText,
    scoreRows,
    resultAwardPlacements: resultPdfParse?.awardPlacements ?? [],
    resultMilestoneClaims: resultPdfParse?.milestoneClaims ?? [],
  };
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    importDraftFingerprint(currentValues),
  );
  const hasUnsavedChanges =
    importDraftFingerprint(currentValues) !== savedFingerprint;
  const hasBothSources = Boolean(endgameScreenshot && exportedGameLog.trim());
  let workflowState: LogGameWorkflowStateKind = 'importing';

  useEffect(() => {
    setGenerationCount(
      resultPdfParse?.generationCount ?? parseResult.generationCount ?? 0,
    );
  }, [parseResult.generationCount, resultPdfParse?.generationCount]);

  useEffect(() => {
    setConfirmedMapId(mapReview.detectedMapId ?? '');
  }, [mapReview.detectedMapId, mapReview.kind]);

  useEffect(() => {
    setPlayerIdentities(
      buildParsedPlayerIdentities(parseResult, playerCandidates),
    );
    // Candidate lookup is stable for this server render; reset only when parsed seats change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerEvidenceFingerprint]);

  useEffect(() => {
    let cancelled = false;

    if (!endgameScreenshot || !isResultPdf) {
      setResultPdfParse(null);
      return () => {
        cancelled = true;
      };
    }

    if (parseResult.players.length === 0) {
      setResultPdfParse(null);
      setRawOcrText('');
      setIsRecognizing(false);
      setOcrStatus(
        'Result PDF selected. Paste the complete game log to match its player columns.',
      );
      return () => {
        cancelled = true;
      };
    }

    setIsRecognizing(true);
    setOcrProgress(0);
    setOcrStatus('Reading the exact text layer from the game result PDF...');

    void (async () => {
      try {
        const result = await parseTerraformingMarsResultPdf({
          bytes: new Uint8Array(await endgameScreenshot.arrayBuffer()),
          catalog: referenceCatalog,
          playedEntityEvidence: reviewedPlayedEntityEvidence,
          players: parseResult.players,
        });
        if (cancelled) {
          return;
        }
        setResultPdfParse(result);
        setRawOcrText(result.rawText);
        setOcrConfidence(null);
        setOcrProgress(1);
        setOcrStatus(
          'Result PDF read exactly. Verify the detected values below.',
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        setResultPdfParse(null);
        setRawOcrText('');
        setOcrStatus(
          error instanceof Error
            ? error.message
            : 'Unable to read this game result PDF.',
        );
      } finally {
        if (!cancelled) {
          setIsRecognizing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    endgameScreenshot,
    isResultPdf,
    parseResult.players,
    playerEvidenceFingerprint,
    referenceCatalog,
    reviewedPlayedEntityEvidence,
  ]);

  useEffect(() => {
    setScoreRows(scoreParseResult.scoreRows);
  }, [scoreParseResult]);

  if (isSubmitting) {
    workflowState = 'saving';
  } else if (feedback.status === 'success' && !hasUnsavedChanges) {
    workflowState = 'saved';
  } else if (feedback.status === 'error') {
    workflowState = 'save_failed';
  }

  async function handleScreenshotChange(file: File | null) {
    setEndgameScreenshot(file);
    setRawOcrText('');
    setResultPdfParse(null);
    setOcrWords([]);
    setOcrConfidence(null);
    setOcrProgress(0);
    setOcrStatus(null);
    setPlayedOn(file ? dateFromFile(file) : '');

    if (!file) {
      setIsRecognizing(false);
      return;
    }

    if (isTerraformingMarsResultPdf(file)) {
      setIsRecognizing(false);
      setOcrStatus(
        parseResult.players.length > 0
          ? 'Reading the exact text layer from the game result PDF...'
          : 'Result PDF selected. Paste the complete game log to match its player columns.',
      );
      return;
    }

    setIsRecognizing(true);
    setOcrStatus('Reading the end-game screenshot...');

    try {
      const result = await recognizeScreenshotInBrowser(file, (progress) => {
        setOcrProgress(progress.progress);
        setOcrStatus(progress.status);
      });

      setRawOcrText(result.text);
      setOcrWords(result.words ?? []);
      setOcrConfidence(result.confidence);
      setOcrProgress(1);
      setOcrStatus('Screenshot read. Review the detected values below.');
    } catch (error) {
      setOcrStatus(
        error instanceof Error
          ? error.message
          : 'Unable to read text from this screenshot.',
      );
    } finally {
      setIsRecognizing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!endgameScreenshot || !exportedGameLog.trim()) {
      setFeedback({
        status: 'error',
        message: 'Upload the game result PDF or end-game screenshot, then paste the complete exported log.',
      });
      return;
    }
    if (isRecognizing) {
      setFeedback({
        status: 'error',
        message: 'Wait for the uploaded evidence to finish processing.',
      });
      return;
    }
    if (!rawOcrText.trim()) {
      setFeedback({
        status: 'error',
        message: 'The uploaded game result evidence must be readable before the import can continue.',
      });
      return;
    }
    if (
      parseResult.referenceAudit.blockingIssues.length > 0 ||
      !playedOn ||
      !confirmedMapId ||
      objectiveConfiguration === 'unknown' ||
      generationCount < 1 ||
      playerCount < 1
    ) {
      setFeedback({
        status: 'error',
        message: 'Verify or correct every unresolved detected game value.',
      });
      return;
    }
    // Mirror the server's map gate so a board/objective conflict, or a chosen
    // map that contradicts a confident board detection, is surfaced with its
    // specific reason instead of a generic save error.
    if (
      mapReview.kind === 'conflicting' ||
      (mapReview.kind === 'confident' &&
        mapReview.detectedMapId !== null &&
        mapReview.detectedMapId !== confirmedMapId)
    ) {
      setFeedback({ status: 'error', message: mapReview.message });
      return;
    }
    const selectedMilestoneIds = new Set(
      objectiveConfigurationClass === 'randomized'
        ? referenceCatalog.allMilestones.map((objective) => objective.id)
        : referenceCatalog.milestones
            .filter((relationship) => relationship.mapId === confirmedMapId)
            .map((relationship) => relationship.milestoneId),
    );
    const selectedAwardIds = new Set(
      objectiveConfigurationClass === 'randomized'
        ? referenceCatalog.allAwards.map((objective) => objective.id)
        : referenceCatalog.awards
            .filter((relationship) => relationship.mapId === confirmedMapId)
            .map((relationship) => relationship.awardId),
    );
    if (
      reviewedObjectiveEvidence.some(
        (evidence) =>
          !evidence.canonicalId ||
          !(evidence.type === 'milestone'
            ? selectedMilestoneIds
            : selectedAwardIds
          ).has(evidence.canonicalId),
      )
    ) {
      setFeedback({
        status: 'error',
        message: 'Resolve every milestone and award against the confirmed map.',
      });
      return;
    }
    if (
      scoreRows.length !== playerCount ||
      scoreRows.some((row) =>
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
      setFeedback({
        status: 'error',
        message: 'Verify or correct every supported score value read from the result evidence.',
      });
      return;
    }
    if (
      playedEntityParse.errors.length > 0 ||
      reviewedPlayedEntityEvidence.some(
        (evidence) =>
          evidence.resolution === 'ambiguous' ||
          evidence.resolution === 'unknown',
      )
    ) {
      setFeedback({
        status: 'error',
        message: 'Resolve every played corporation, Prelude, and card against the canonical catalog.',
      });
      return;
    }

    const parsedPlayerIdentities = playerIdentities.map((identity) =>
      importPlayerIdentityInputSchema.safeParse(identity),
    );
    const identityStates = playerIdentities.map((identity) =>
      evaluateImportPlayerIdentity({ candidates: playerCandidates, value: identity }),
    );
    const blockingIdentityState = identityStates.find((state) =>
      [
        'ambiguous_match',
        'duplicate_guest_candidate',
        'inaccessible_identity',
        'invalid_identity_input',
        'unavailable_identity',
        'unresolved_player',
      ].includes(state.kind),
    );

    if (
      playerIdentities.length !== playerCount ||
      parsedPlayerIdentities.some((identity) => !identity.success) ||
      blockingIdentityState
    ) {
      setFeedback({
        status: 'error',
        message:
          blockingIdentityState && 'message' in blockingIdentityState
            ? blockingIdentityState.message
            : 'Verify the match for every imported player.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submittedValues = {
        ...currentValues,
        exportedGameLog: exportedGameLog.trim(),
        playerIdentities: parsedPlayerIdentities.map((identity) =>
          identity.success ? identity.data : identity,
        ) as ImportPlayerIdentityDraftInput[],
      };
      const result = await onStartImport(submittedValues);

      setFeedback(result);
      if (result.status === 'success') {
        setSavedFingerprint(importDraftFingerprint(submittedValues));
      }
    } catch (error) {
      setFeedback({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to save this import draft right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <EntryMethodSelector
        currentMethod="import"
        groupName={groupName}
        hasUnsavedChanges={hasUnsavedChanges}
        workflowState={workflowState}
      />
      <section className="rounded-2xl border border-orange-900/30 bg-black/25 p-4">
        <h2 className="font-serif text-2xl font-semibold">Import Game</h2>
        <p className="mt-2 text-sm text-stone-300">
          Upload the game result PDF (preferred) or an end-game screenshot,
          then paste the complete exported log. TM Stats parses the fields from
          those sources; you only verify or correct what it detected.
        </p>
        <p className="mt-3 text-sm">
          <Link
            className="font-semibold text-orange-300 underline decoration-orange-500/60 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
            href="/import-instructions"
          >
            How to get your game log
          </Link>
        </p>
        <aside
          className="mt-4 rounded-xl border border-amber-500/50 bg-amber-950/30 p-3 text-sm text-amber-100"
          role="alert"
        >
          The exported log does not state whether objectives were board-defined
          or randomized. Confirm that setup choice below; randomized objectives
          remain independent from map detection.
        </aside>
      </section>

      <form
        aria-busy={isSubmitting || isRecognizing}
        className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-950/50 p-4"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Game Result PDF or End-game Screenshot</span>
          <input
            aria-label="Game Result PDF or End-game Screenshot"
            accept="image/*,application/pdf,.pdf"
            className="rounded-xl border border-dashed border-stone-700 bg-black/20 px-4 py-3 text-sm"
            onChange={(event) =>
              void handleScreenshotChange(event.target.files?.[0] ?? null)
            }
            type="file"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-stone-200">Complete Exported Game Log</span>
          <textarea
            aria-label="Complete Exported Game Log"
            className="min-h-48 rounded-2xl border border-stone-800 bg-black/30 px-4 py-3"
            onChange={(event) => {
              setExportedGameLog(event.target.value);
              setObjectiveCorrections([]);
              setPlayedEntityCorrections([]);
            }}
            placeholder="Paste the complete exported log text here."
            required
            value={exportedGameLog}
          />
        </label>

        {ocrStatus ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-stone-800 bg-black/20 p-3 text-sm text-stone-300"
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{ocrStatus}</span>
              <span>{Math.round(ocrProgress * 100)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full bg-orange-400 transition-[width]"
                style={{ width: `${Math.round(ocrProgress * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {hasBothSources ? (
          <section
            aria-labelledby="detected-game-values-heading"
            className="rounded-2xl border border-orange-900/30 bg-black/25 p-4"
          >
            <h2
              className="font-serif text-xl font-semibold"
              id="detected-game-values-heading"
            >
              Verify Detected Game
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              These values came from the supplied evidence. Change a value only
              when the source was read incorrectly.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {fieldStatus(parseResult.playerCount, 'Players · exported log')}
              {fieldStatus(generationCount || null, 'Generations · exported log')}
              {fieldStatus(
                mapReview.candidates.find((map) => map.id === confirmedMapId)?.name ??
                  referenceCatalog.maps.find((map) => map.id === confirmedMapId)?.name ??
                  null,
                'Map · milestones and awards',
              )}
              {fieldStatus(playedOn || null, 'Date · screenshot file evidence')}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-2 text-sm">
                <span className="tm-data-label">Map — verify or correct</span>
                <select
                  aria-label="Detected map — verify or correct"
                  className="tm-input"
                  onChange={(event) => {
                    setConfirmedMapId(event.target.value);
                    setObjectiveCorrections([]);
                  }}
                  value={confirmedMapId}
                >
                  <option value="">Select only if evidence needs correction</option>
                  {referenceCatalog.maps.map((map) => (
                    <option key={map.id} value={map.id}>{map.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="tm-data-label">Objective setup — required</span>
                <select
                  aria-label="Objective setup — required"
                  className="tm-input"
                  onChange={(event) => {
                    setObjectiveConfiguration(
                      event.target.value as ImportObjectiveConfiguration,
                    );
                    setObjectiveCorrections([]);
                  }}
                  value={objectiveConfiguration}
                >
                  {IMPORT_OBJECTIVE_CONFIGURATIONS.map((configuration) => (
                    <option key={configuration} value={configuration}>
                      {importObjectiveConfigurationLabel(configuration)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="tm-data-label">Generations — verify or correct</span>
                <input
                  aria-label="Detected generations — verify or correct"
                  className="tm-input"
                  min={1}
                  onChange={(event) => setGenerationCount(Number(event.target.value))}
                  type="number"
                  value={generationCount || ''}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="tm-data-label">Date — verify or correct</span>
                <input
                  aria-label="Detected date — verify or correct"
                  className="tm-input"
                  onChange={(event) => setPlayedOn(event.target.value)}
                  type="date"
                  value={playedOn}
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-stone-800 bg-black/20 p-3 text-sm">
              <p className="font-semibold text-stone-100">Map evidence</p>
              <p className="mt-1 text-stone-300">{mapReview.message}</p>
              <p className="mt-1 text-stone-400">
                {tileActionSet.actions.length} tile actions reconstructed across{' '}
                {reconstructedBoard.spaces.length} board spaces;{' '}
                {tileActionSet.unknownTileTypeCount} unknown tile labels and{' '}
                {reconstructedBoard.conflicts.length} placement conflicts require
                review.
              </p>
              {reviewedObjectiveEvidence.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-stone-300">
                  {reviewedObjectiveEvidence.map((evidence) => (
                    <li key={`${evidence.source}-${evidence.lineNumber}-${evidence.type}`}>
                      {evidence.originalValue} — {evidence.canonicalName ?? 'needs correction'}
                      {confirmedMapId ? (
                        <label className="mt-2 grid gap-1">
                          <span className="sr-only">
                            Correct {evidence.type} {evidence.originalValue}
                          </span>
                          <select
                            aria-label={`Correct ${evidence.type} ${evidence.originalValue}`}
                            className="tm-input"
                            onChange={(event) =>
                              updateObjectiveCorrection(
                                evidence.type,
                                evidence.source,
                                evidence.lineNumber,
                                event.target.value,
                              )
                            }
                            value={evidence.canonicalId ?? ''}
                          >
                            <option value="">Needs correction</option>
                            {(evidence.type === 'milestone'
                              ? milestoneCorrectionOptions
                              : awardCorrectionOptions
                            ).map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span className="mt-2 block text-xs text-amber-100">
                          Confirm the map before correcting this objective.
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>


            {resultPdfParse?.awardPlacements.length ? (
              <div className="mt-4 rounded-xl border border-stone-800 bg-black/20 p-3 text-sm">
                <p className="font-semibold text-stone-100">PDF award placements</p>
                <ul className="mt-2 grid gap-1 text-stone-300">
                  {resultPdfParse.awardPlacements.map((placement, index) => (
                    <li
                      key={`${placement.matchedAwardId ?? placement.awardName}-${placement.placement}-${placement.playerName}-${index}`}
                    >
                      {placement.awardName}: {placement.playerName} ({placement.placement === 1 ? '1st' : '2nd'} place)
                      {placement.fundedByPlayerName
                        ? `; funded by ${placement.fundedByPlayerName}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {parseResult.referenceAudit.blockingIssues.length > 0 ? (
              <div className="mt-4 text-sm text-amber-200" role="alert">
                The canonical map catalog is incomplete. This import cannot be
                saved until its reference data is corrected.
              </div>
            ) : null}
          </section>
        ) : null}

        {hasBothSources && playerIdentities.length > 0 ? (
          <ImportPlayerIdentityReview
            candidates={playerCandidates}
            onChange={setPlayerIdentities}
            values={playerIdentities}
          />
        ) : null}

        {hasBothSources && reviewedPlayedEntityEvidence.length > 0 ? (
          <section
            aria-labelledby="detected-played-entities-heading"
            className="rounded-2xl border border-orange-900/30 bg-black/25 p-4"
          >
            <h2
              className="font-serif text-xl font-semibold"
              id="detected-played-entities-heading"
            >
              Verify Corporations, Preludes, and Cards
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              Every “played” line is retained. Exact canonical names and
              approved aliases are resolved without broad fuzzy matching.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-stone-200">
              {reviewedPlayedEntityEvidence.map((evidence) => (
                <li
                  className="tm-stat-card min-w-0 break-words"
                  key={`${evidence.lineNumber}-${evidence.originalValue}`}
                >
                  <span className="font-semibold">{evidence.originalPlayerValue}</span>
                  {' · '}
                  {evidence.originalValue}
                  {' → '}
                  {evidence.canonicalName ?? 'Needs correction'}
                  {evidence.entityType ? ` (${evidence.entityType})` : ''}
                  <label className="mt-2 grid gap-1">
                    <span className="sr-only">
                      Correct played value {evidence.originalValue}
                    </span>
                    <select
                      aria-label={`Correct played value ${evidence.originalValue}`}
                      className="tm-input"
                      onChange={(event) =>
                        updatePlayedEntityCorrection(
                          evidence.lineNumber,
                          event.target.value,
                        )
                      }
                      value={
                        evidence.entityType && evidence.canonicalId
                          ? `${evidence.entityType}:${evidence.canonicalId}`
                          : ''
                      }
                    >
                      <option value="">Needs correction</option>
                      <optgroup label="Corporations">
                        {referenceCatalog.corporations.map((corporation) => (
                          <option
                            key={corporation.id}
                            value={`corporation:${corporation.id}`}
                          >
                            {corporation.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Preludes">
                        {referenceCatalog.preludes.map((prelude) => (
                          <option
                            key={prelude.id}
                            value={`prelude:${prelude.id}`}
                          >
                            {prelude.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Cards">
                        {referenceCatalog.cards.map((card) => (
                          <option key={card.id} value={`card:${card.id}`}>
                            {card.cardName}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                </li>
              ))}
            </ul>
            {playedEntityParse.warnings.length > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm text-amber-100">
                {playedEntityParse.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {hasBothSources && scoreRows.length > 0 ? (
          <section
            aria-labelledby="detected-scores-heading"
            className="rounded-2xl border border-orange-900/30 bg-black/25 p-4"
          >
            <h2
              className="font-serif text-xl font-semibold"
              id="detected-scores-heading"
            >
              Verify Detected Scores
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              Score columns come from the game result PDF or screenshot.
              Missing values remain unresolved and must be corrected against
              that evidence; they are never converted to zero.
            </p>
            <div className="mt-4 grid gap-4">
              {scoreRows.map((row, rowIndex) => (
                <fieldset
                  className="tm-stat-card grid min-w-0 gap-3"
                  key={row.normalizedPlayerName}
                >
                  <legend className="px-1 font-semibold text-stone-100">
                    {row.originalPlayerName}
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {SUPPORTED_SCORE_FIELDS.map((field) => (
                      <label className="grid gap-1 text-sm" key={field.key}>
                        <span className="tm-data-label">{field.label}</span>
                        <input
                          aria-label={`${row.originalPlayerName} ${field.label}`}
                          className="tm-input"
                          min={0}
                          onChange={(event) => {
                            const value = event.target.value;
                            setScoreRows((current) =>
                              current.map((currentRow, currentIndex) =>
                                currentIndex === rowIndex
                                  ? {
                                      ...currentRow,
                                      [field.key]: value === '' ? null : Number(value),
                                    }
                                  : currentRow,
                              ),
                            );
                          }}
                          type="number"
                          value={row[field.key] ?? ''}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-stone-400">
                    Parse state: {row.status.replaceAll('_', ' ')}
                    {row.sourceWords.length > 0
                      ? ` · Evidence: ${row.sourceWords.join(' ')}`
                      : ' · Score row not located'}
                  </p>
                  {row.unsupportedComponentCount > 0 ? (
                    <p className="text-sm text-amber-200" role="alert">
                      This row contains {row.unsupportedComponentCount}{' '}
                      expansion score component
                      {row.unsupportedComponentCount === 1 ? '' : 's'} that do
                      not have a TM Stats score column. The source remains
                      visible and the card score is not guessed.
                    </p>
                  ) : null}
                </fieldset>
              ))}
            </div>
            {scoreParseResult.warnings.length > 0 ? (
              <ul className="mt-4 grid gap-1 text-sm text-amber-100">
                {scoreParseResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {feedback.message ? (
          <p
            aria-live={feedback.status === 'error' ? 'assertive' : 'polite'}
            className={
              feedback.status === 'error'
                ? 'text-sm text-amber-200'
                : 'text-sm text-emerald-300'
            }
            role={feedback.status === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        ) : null}

        <button
          className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || isRecognizing}
          type="submit"
        >
          {isRecognizing
            ? 'Reading Result Evidence...'
            : isSubmitting
              ? 'Saving Import Draft…'
              : 'Save Verified Import Draft'}
        </button>
      </form>
    </div>
  );
}
