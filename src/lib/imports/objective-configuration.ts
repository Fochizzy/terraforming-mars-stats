export const IMPORT_OBJECTIVE_CONFIGURATIONS = [
  'board_defined',
  'randomized_limited',
  'randomized_full',
  'randomized_unspecified',
  'unknown',
] as const;

export type ImportObjectiveConfiguration =
  (typeof IMPORT_OBJECTIVE_CONFIGURATIONS)[number];

export type ImportObjectiveConfigurationClass =
  | 'standard'
  | 'randomized'
  | 'unknown';

export function classifyImportObjectiveConfiguration(
  configuration: ImportObjectiveConfiguration,
): ImportObjectiveConfigurationClass {
  if (configuration === 'board_defined') {
    return 'standard';
  }
  if (configuration.startsWith('randomized_')) {
    return 'randomized';
  }
  return 'unknown';
}

export function isRandomizedImportObjectiveConfiguration(
  configuration: ImportObjectiveConfiguration,
) {
  return classifyImportObjectiveConfiguration(configuration) === 'randomized';
}

export function importObjectiveConfigurationLabel(
  configuration: ImportObjectiveConfiguration,
) {
  switch (configuration) {
    case 'board_defined':
      return 'Board-defined objectives';
    case 'randomized_limited':
      return 'Randomized - limited synergy';
    case 'randomized_full':
      return 'Randomized - full random';
    case 'randomized_unspecified':
      return 'Randomized - exact mode not present in export';
    case 'unknown':
      return 'Unknown - verify against game setup';
  }
}
