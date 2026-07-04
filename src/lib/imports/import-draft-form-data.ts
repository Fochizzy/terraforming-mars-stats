import type { CreateImportDraftInput } from './build-import-draft';
import { parseImportParticipants } from './parse-import-participants';

export type CreateImportDraftFormValues = {
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  participants: string;
  playedOn: string;
  playerCount: number;
};

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
