type BuildImportDraftNotesInput = {
  endgameScreenshotName?: string | null;
  exportedGameLog?: string | null;
};

export function buildImportDraftNotes(input: BuildImportDraftNotesInput) {
  const hasImportedLog = Boolean(input.exportedGameLog?.trim());
  const hasScreenshot = Boolean(input.endgameScreenshotName?.trim());

  if (!hasImportedLog && !hasScreenshot) {
    return '';
  }

  return [
    'Imported evidence attached.',
    'Review the saved game log and screenshot details before finalizing.',
  ].join('\n\n');
}
