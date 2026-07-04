import { normalizePlayerAlias } from './normalize-player-alias';

export function parseImportParticipants(input: string) {
  const participants = input
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (participants.length === 0) {
    throw new Error('Add at least one participant before saving the import.');
  }

  const seenAliases = new Set<string>();

  for (const participant of participants) {
    const normalized = normalizePlayerAlias(participant);

    if (!normalized) {
      continue;
    }

    if (seenAliases.has(normalized)) {
      throw new Error('Imported participant names must be unique.');
    }

    seenAliases.add(normalized);
  }

  return participants;
}
