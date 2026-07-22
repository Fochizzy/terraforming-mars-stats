import { assertImportCandidateNamesWithinBounds } from './import-candidate-name-bounds';
import { normalizePlayerAlias } from './normalize-player-alias';

export function parseImportParticipants(input: string) {
  const participants = input
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);

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

  // The participants textarea is free browser-supplied text, and every name in
  // it becomes a question for the security-definer identity matcher. A game has
  // at most five players, so a longer list is either a mistake worth surfacing
  // or a bulk identity probe.
  assertImportCandidateNamesWithinBounds(participants, 'participants');

  return participants;
}
