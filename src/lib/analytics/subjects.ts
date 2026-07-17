/**
 * Analytics subject identity (Phase 2, Step 2.1).
 *
 * A subject reference identifies the entity an analytics capability or metric
 * is about. References carry stable repository identity only: database IDs
 * for cataloged rows (`players.id`, `corporations.id`, …), canonical codes
 * where the repository already treats the code as the stable key (tag and
 * style codes), and the typed score-source key registry. Display names are
 * presentation metadata and are never part of identity, so renaming an entity
 * cannot change what a reference points to.
 *
 * Kinds are limited to entities whose stable identity exists in the current
 * repository. Lineups and board positions are deliberately absent: current
 * lineup analytics expose only display labels, and no canonical board
 * coordinate model exists, so neither has a stable identity to reference.
 */

export const ANALYTICS_SUBJECT_KINDS = [
  'player',
  'group',
  'game',
  'corporation',
  'prelude',
  'corporation-prelude-pairing',
  'card',
  'tag',
  'score-source',
  'style',
  'map',
  'milestone',
  'award',
] as const;

export type AnalyticsSubjectKind = (typeof ANALYTICS_SUBJECT_KINDS)[number];

export function isAnalyticsSubjectKind(
  value: unknown,
): value is AnalyticsSubjectKind {
  return (
    typeof value === 'string' &&
    (ANALYTICS_SUBJECT_KINDS as readonly string[]).includes(value)
  );
}

/**
 * The ten persisted final-score components on `game_players`. The key values
 * intentionally match the Step 1.2 `ScoreSourceKey` asset registry so score
 * analytics and score-source artwork share one vocabulary. Whether all ten
 * belong in a canonical display set is a later product decision; these keys
 * describe recordable sources, not presentation policy.
 */
export const ANALYTICS_SCORE_SOURCE_KEYS = [
  'animal',
  'award',
  'card',
  'city',
  'greenery',
  'jovian',
  'microbe',
  'milestone',
  'other_card',
  'tr',
] as const;

export type AnalyticsScoreSourceKey =
  (typeof ANALYTICS_SCORE_SOURCE_KEYS)[number];

export function isAnalyticsScoreSourceKey(
  value: unknown,
): value is AnalyticsScoreSourceKey {
  return (
    typeof value === 'string' &&
    (ANALYTICS_SCORE_SOURCE_KEYS as readonly string[]).includes(value)
  );
}

/** Reference by `players.id`. Saved-player identity is group-local. */
export type PlayerSubjectRef = { kind: 'player'; playerId: string };

/** Reference by `groups.id`. */
export type GroupSubjectRef = { kind: 'group'; groupId: string };

/** Reference by `games.id`. */
export type GameSubjectRef = { kind: 'game'; gameId: string };

/** Reference by `corporations.id`. */
export type CorporationSubjectRef = {
  kind: 'corporation';
  corporationId: string;
};

/** Reference by `preludes.id`. */
export type PreludeSubjectRef = { kind: 'prelude'; preludeId: string };

/**
 * A corporation played together with a Prelude, referenced by both catalog
 * IDs. This replaces the current display-label pairing strings, which are not
 * stable identity.
 */
export type CorporationPreludePairingSubjectRef = {
  kind: 'corporation-prelude-pairing';
  corporationId: string;
  preludeId: string;
};

/** Reference by `cards.id` (catalog identity, not a physical card instance). */
export type CardSubjectRef = { kind: 'card'; cardId: string };

/**
 * Reference by canonical tag code (e.g. `science`). The authoritative tag
 * vocabulary is catalog-driven and still under review, so the code is a
 * validated string rather than a hard-coded union.
 */
export type TagSubjectRef = { kind: 'tag'; tagCode: string };

/** Reference by the typed ten-key score-source registry. */
export type ScoreSourceSubjectRef = {
  kind: 'score-source';
  scoreSourceKey: AnalyticsScoreSourceKey;
};

/**
 * Reference by `style_definitions.code`. Declared-versus-inferred provenance
 * is observation metadata, not identity, and lives outside the reference.
 */
export type StyleSubjectRef = { kind: 'style'; styleCode: string };

/** Reference by `maps.id`. */
export type MapSubjectRef = { kind: 'map'; mapId: string };

/** Reference by `milestones.id`. */
export type MilestoneSubjectRef = { kind: 'milestone'; milestoneId: string };

/** Reference by `awards.id`. */
export type AwardSubjectRef = { kind: 'award'; awardId: string };

export type AnalyticsSubjectRef =
  | PlayerSubjectRef
  | GroupSubjectRef
  | GameSubjectRef
  | CorporationSubjectRef
  | PreludeSubjectRef
  | CorporationPreludePairingSubjectRef
  | CardSubjectRef
  | TagSubjectRef
  | ScoreSourceSubjectRef
  | StyleSubjectRef
  | MapSubjectRef
  | MilestoneSubjectRef
  | AwardSubjectRef;

/**
 * Optional presentation metadata for a subject. Deliberately separate from
 * the reference so labels can never act as identity.
 */
export type AnalyticsSubjectDisplay = {
  /** Human-readable label, e.g. the corporation name. */
  label: string;
  /** Optional compact label for dense contexts. */
  shortLabel?: string;
};

/** A subject reference with optional display metadata attached. */
export type LabeledAnalyticsSubject = {
  subject: AnalyticsSubjectRef;
  /** Omitting or changing display metadata never changes identity. */
  display?: AnalyticsSubjectDisplay;
};

function assertNeverSubject(value: never): never {
  throw new Error(`Unhandled analytics subject kind: ${JSON.stringify(value)}`);
}

/**
 * Deterministic identity key for a subject reference, used for equality and
 * duplicate detection. Built exclusively from the kind and stable identifiers;
 * display metadata never participates.
 */
export function analyticsSubjectKey(ref: AnalyticsSubjectRef): string {
  switch (ref.kind) {
    case 'player':
      return `player:${ref.playerId}`;
    case 'group':
      return `group:${ref.groupId}`;
    case 'game':
      return `game:${ref.gameId}`;
    case 'corporation':
      return `corporation:${ref.corporationId}`;
    case 'prelude':
      return `prelude:${ref.preludeId}`;
    case 'corporation-prelude-pairing':
      return `corporation-prelude-pairing:${ref.corporationId}:${ref.preludeId}`;
    case 'card':
      return `card:${ref.cardId}`;
    case 'tag':
      return `tag:${ref.tagCode}`;
    case 'score-source':
      return `score-source:${ref.scoreSourceKey}`;
    case 'style':
      return `style:${ref.styleCode}`;
    case 'map':
      return `map:${ref.mapId}`;
    case 'milestone':
      return `milestone:${ref.milestoneId}`;
    case 'award':
      return `award:${ref.awardId}`;
    default:
      return assertNeverSubject(ref);
  }
}

/** Identity equality by stable key; display metadata is ignored by design. */
export function analyticsSubjectRefsEqual(
  a: AnalyticsSubjectRef,
  b: AnalyticsSubjectRef,
): boolean {
  return analyticsSubjectKey(a) === analyticsSubjectKey(b);
}

export const ANALYTICS_SUBJECT_ISSUE_CODES = [
  'blank-identifier',
  'unknown-score-source-key',
] as const;

export type AnalyticsSubjectIssueCode =
  (typeof ANALYTICS_SUBJECT_ISSUE_CODES)[number];

export type AnalyticsSubjectIssue = {
  code: AnalyticsSubjectIssueCode;
  message: string;
  /** Identity field the issue refers to, e.g. `playerId`. */
  field: string;
};

function isBlank(value: string): boolean {
  return value.trim() === '';
}

function blankIdentifierIssue(field: string): AnalyticsSubjectIssue {
  return {
    code: 'blank-identifier',
    message: `Subject identity field "${field}" must not be blank`,
    field,
  };
}

/**
 * Structural validation of a subject reference. Returns an empty array when
 * the reference is valid. Identity fields must be non-blank; score-source
 * keys must belong to the typed registry. Format rules beyond that (for
 * example UUID shape) belong to the Step 2.2 parsers and the server-side
 * repositories, which revalidate identity and authorization.
 */
export function validateAnalyticsSubjectRef(
  ref: AnalyticsSubjectRef,
): readonly AnalyticsSubjectIssue[] {
  const issues: AnalyticsSubjectIssue[] = [];

  switch (ref.kind) {
    case 'player':
      if (isBlank(ref.playerId)) issues.push(blankIdentifierIssue('playerId'));
      break;
    case 'group':
      if (isBlank(ref.groupId)) issues.push(blankIdentifierIssue('groupId'));
      break;
    case 'game':
      if (isBlank(ref.gameId)) issues.push(blankIdentifierIssue('gameId'));
      break;
    case 'corporation':
      if (isBlank(ref.corporationId)) {
        issues.push(blankIdentifierIssue('corporationId'));
      }
      break;
    case 'prelude':
      if (isBlank(ref.preludeId)) {
        issues.push(blankIdentifierIssue('preludeId'));
      }
      break;
    case 'corporation-prelude-pairing':
      if (isBlank(ref.corporationId)) {
        issues.push(blankIdentifierIssue('corporationId'));
      }
      if (isBlank(ref.preludeId)) {
        issues.push(blankIdentifierIssue('preludeId'));
      }
      break;
    case 'card':
      if (isBlank(ref.cardId)) issues.push(blankIdentifierIssue('cardId'));
      break;
    case 'tag':
      if (isBlank(ref.tagCode)) issues.push(blankIdentifierIssue('tagCode'));
      break;
    case 'score-source':
      if (!isAnalyticsScoreSourceKey(ref.scoreSourceKey)) {
        issues.push({
          code: 'unknown-score-source-key',
          message: `"${String(ref.scoreSourceKey)}" is not a registered score-source key`,
          field: 'scoreSourceKey',
        });
      }
      break;
    case 'style':
      if (isBlank(ref.styleCode)) {
        issues.push(blankIdentifierIssue('styleCode'));
      }
      break;
    case 'map':
      if (isBlank(ref.mapId)) issues.push(blankIdentifierIssue('mapId'));
      break;
    case 'milestone':
      if (isBlank(ref.milestoneId)) {
        issues.push(blankIdentifierIssue('milestoneId'));
      }
      break;
    case 'award':
      if (isBlank(ref.awardId)) issues.push(blankIdentifierIssue('awardId'));
      break;
    default:
      assertNeverSubject(ref);
  }

  return issues;
}
