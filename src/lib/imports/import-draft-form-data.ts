import type { CreateImportDraftInput } from './build-import-draft';
import { parseImportParticipants } from './parse-import-participants';

export type CreateImportDraftFormValues = {
  confirmedPlayerLinks?: Array<{
    importedName: string;
    playerId: string;
  }>;
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  participants: string;
  playedOn: string;
  playerCount: number;
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

export function buildCreateImportDraftFormData(
  values: CreateImportDraftFormValues,
) {
  const formData = new FormData();

  formData.set('playedOn', values.playedOn);
  formData.set('mapId', values.mapId);
  formData.set('playerCount', String(values.playerCount));
  formData.set('generationCount', String(values.generationCount));
  formData.set('exportedGameLog', values.exportedGameLog.trim());
  formData.set('participants', values.participants);
  formData.set(
    'confirmedPlayerLinks',
    JSON.stringify(values.confirmedPlayerLinks ?? []),
  );

  if (values.endgameScreenshot) {
    formData.set('endgameScreenshot', values.endgameScreenshot);
  }

  return formData;
}

export function parseCreateImportDraftFormData(
  formData: FormData,
): CreateImportDraftInput {
  const endgameScreenshot = readOptionalFileField(
    formData,
    'endgameScreenshot',
  );

  return {
    confirmedPlayerLinks: readConfirmedPlayerLinks(formData),
    endgameScreenshot,
    endgameScreenshotName: endgameScreenshot?.name ?? null,
    exportedGameLog: readTextField(formData, 'exportedGameLog'),
    generationCount: readIntegerField(formData, 'generationCount'),
    mapId: readTextField(formData, 'mapId'),
    participantNames: parseImportParticipants(readTextField(formData, 'participants')),
    playedOn: readTextField(formData, 'playedOn'),
    playerCount: readIntegerField(formData, 'playerCount'),
  };
}
