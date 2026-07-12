import type { CreateImportDraftInput } from './build-import-draft';
import { parseImportParticipants } from './parse-import-participants';
import type { ReadGameResultScreenshotResult } from './read-game-result-screenshot';

export type ScreenshotOcrPayload = ReadGameResultScreenshotResult;

export type CreateImportDraftFormValues = {
  boardScreenshots?: File[];
  confirmedPlayerLinks?: Array<{
    importedName: string;
    playerId: string;
  }>;
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount?: number | null;
  mapId?: string | null;
  participants: string;
  playedOn: string;
  playerCount: number;
  playerIdentities?: PlayerIdentityInput[];
  scoreDetailsScreenshot?: File | null;
  screenshotOcr?: ScreenshotOcrPayload | null;
};

export type PlayerIdentityInput = {
  fullName: string;
  importedName: string;
  username: string;
};

export type ParsedCreateImportDraftFormData = CreateImportDraftInput & {
  boardScreenshots: File[];
  playerIdentities: PlayerIdentityInput[];
  scoreDetailsScreenshot: File | null;
  screenshotOcr: ScreenshotOcrPayload | null;
};

function readConfirmedPlayerLinks(formData: FormData) {
  const rawValue = readTextField(formData, 'confirmedPlayerLinks');

  if (!rawValue) {
    return [] as Array<{ importedName: string; playerId: string }>;
  }

  const parsedValue = JSON.parse(rawValue);

  if (!Array.isArray(parsedValue)) {
    throw new Error('Expected confirmedPlayerLinks to be an array.');
  }

  return parsedValue.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const importedName =
      'importedName' in entry && typeof entry.importedName === 'string'
        ? entry.importedName.trim()
        : '';
    const playerId =
      'playerId' in entry && typeof entry.playerId === 'string'
        ? entry.playerId.trim()
        : '';

    if (!importedName || !playerId) {
      return [];
    }

    return [{ importedName, playerId }];
  });
}

function readPlayerIdentities(formData: FormData): PlayerIdentityInput[] {
  const rawValue = readTextField(formData, 'playerIdentities');

  if (!rawValue) {
    return [];
  }

  const parsedValue = JSON.parse(rawValue);

  if (!Array.isArray(parsedValue)) {
    throw new Error('Expected playerIdentities to be an array.');
  }

  return parsedValue.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const importedName =
      'importedName' in entry && typeof entry.importedName === 'string'
        ? entry.importedName.trim()
        : '';

    if (!importedName) {
      return [];
    }

    const username =
      'username' in entry && typeof entry.username === 'string'
        ? entry.username.trim()
        : '';
    const fullName =
      'fullName' in entry && typeof entry.fullName === 'string'
        ? entry.fullName.trim()
        : '';

    if (!username && !fullName) {
      return [];
    }

    return [{ fullName, importedName, username }];
  });
}

function readTextField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readIntegerField(formData: FormData, key: string) {
  const value = Number(readTextField(formData, key));

  if (!Number.isFinite(value)) {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function readOptionalIntegerField(formData: FormData, key: string) {
  const rawValue = readTextField(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readNumberField(source: Record<string, unknown>, key: string) {
  const value = source[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readGlobalParameters(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const source = entry as Record<string, unknown>;
    const playerName = source.playerName;
    const oceans = readNumberField(source, 'oceans');
    const oxygen = readNumberField(source, 'oxygen');
    const temperature = readNumberField(source, 'temperature');
    const total = readNumberField(source, 'total');

    if (
      typeof playerName !== 'string' ||
      !playerName ||
      oceans === null ||
      oxygen === null ||
      temperature === null ||
      total === null
    ) {
      return [];
    }

    return [{ oceans, oxygen, playerName, temperature, total }];
  });

  return parsed.length > 0 ? parsed : undefined;
}

function readScreenshotOcr(formData: FormData): ScreenshotOcrPayload | null {
  const rawValue = readTextField(formData, 'screenshotOcr');

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }

    const endgameLines = readStringArray(
      (parsedValue as { endgameLines?: unknown }).endgameLines,
    );
    const rawColumns = (parsedValue as { scoreDetailsColumns?: unknown })
      .scoreDetailsColumns;
    const scoreDetailsColumns = Array.isArray(rawColumns)
      ? rawColumns.flatMap((column) => {
          if (!column || typeof column !== 'object') {
            return [];
          }

          return [
            {
              textLines: readStringArray(
                (column as { textLines?: unknown }).textLines,
              ),
            },
          ];
        })
      : [];

    if (
      endgameLines.length === 0 &&
      scoreDetailsColumns.every((column) => column.textLines.length === 0)
    ) {
      return null;
    }

    const rawLayout = (parsedValue as { endgameLayout?: unknown }).endgameLayout;
    const rawGenerationCount = (parsedValue as { generationCount?: unknown })
      .generationCount;

    return {
      endgameLayout:
        rawLayout === 'legacy' || rawLayout === 'victory_breakdown'
          ? rawLayout
          : undefined,
      endgameLines,
      generationCount:
        typeof rawGenerationCount === 'number' &&
        Number.isFinite(rawGenerationCount)
          ? rawGenerationCount
          : null,
      globalParameters: readGlobalParameters(
        (parsedValue as { globalParameters?: unknown }).globalParameters,
      ),
      scoreDetailsColumns,
    };
  } catch {
    return null;
  }
}

function readOptionalFileField(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File)) {
    return null;
  }

  if (!value.name && value.size === 0) {
    return null;
  }

  return value;
}

function readOptionalFileListField(formData: FormData, key: string) {
  return formData.getAll(key).flatMap((value) => {
    if (!(value instanceof File)) {
      return [];
    }

    if (!value.name && value.size === 0) {
      return [];
    }

    return [value];
  });
}

export function buildCreateImportDraftFormData(
  values: CreateImportDraftFormValues,
) {
  const formData = new FormData();

  formData.set('playedOn', values.playedOn);
  formData.set('playerCount', String(values.playerCount));
  formData.set('exportedGameLog', values.exportedGameLog.trim());
  formData.set('participants', values.participants);
  formData.set(
    'confirmedPlayerLinks',
    JSON.stringify(values.confirmedPlayerLinks ?? []),
  );
  formData.set(
    'playerIdentities',
    JSON.stringify(values.playerIdentities ?? []),
  );

  if (values.mapId?.trim()) {
    formData.set('mapId', values.mapId);
  }

  if (typeof values.generationCount === 'number') {
    formData.set('generationCount', String(values.generationCount));
  }

  if (values.endgameScreenshot) {
    formData.set('endgameScreenshot', values.endgameScreenshot);
  }

  if (values.scoreDetailsScreenshot) {
    formData.set('scoreDetailsScreenshot', values.scoreDetailsScreenshot);
  }

  if (values.screenshotOcr) {
    formData.set('screenshotOcr', JSON.stringify(values.screenshotOcr));
  }

  for (const boardScreenshot of values.boardScreenshots ?? []) {
    formData.append('boardScreenshots', boardScreenshot);
  }

  return formData;
}

export function parseCreateImportDraftFormData(
  formData: FormData,
): ParsedCreateImportDraftFormData {
  const endgameScreenshot = readOptionalFileField(
    formData,
    'endgameScreenshot',
  );
  const scoreDetailsScreenshot = readOptionalFileField(
    formData,
    'scoreDetailsScreenshot',
  );

  return {
    boardScreenshots: readOptionalFileListField(formData, 'boardScreenshots'),
    confirmedPlayerLinks: readConfirmedPlayerLinks(formData),
    endgameScreenshot,
    endgameScreenshotName: endgameScreenshot?.name ?? null,
    exportedGameLog: readTextField(formData, 'exportedGameLog'),
    generationCount: readOptionalIntegerField(formData, 'generationCount'),
    mapId: readTextField(formData, 'mapId'),
    participantNames: parseImportParticipants(readTextField(formData, 'participants')),
    playedOn: readTextField(formData, 'playedOn'),
    playerCount: readIntegerField(formData, 'playerCount'),
    playerIdentities: readPlayerIdentities(formData),
    scoreDetailsScreenshot,
    screenshotOcr: readScreenshotOcr(formData),
  };
}
