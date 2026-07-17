/**
 * Analytics scope contracts (Phase 2, Step 2.1).
 *
 * A scope names the context an analytics question is asked in: which entity
 * it is about and which recorded-game population it may draw from. The six
 * scope types below are the only approved contexts; a metric must declare
 * which of them it supports, and absence from that set is an unavailable
 * capability rather than an empty result.
 *
 * Route ownership determines the primary scope — there is no shared `scope`
 * URL parameter, and URL serialization belongs to Step 2.2. Scope identities
 * are untrusted input: server-side repositories revalidate authorization
 * (Step 2.5); nothing in this module grants access. Scope contracts stay free
 * of React and rendering concerns by design.
 */

import {
  analyticsSubjectKey,
  validateAnalyticsSubjectRef,
  type AnalyticsSubjectKind,
  type AnalyticsSubjectRef,
} from './subjects';

export const ANALYTICS_SCOPE_TYPES = [
  'global',
  'individual',
  'group',
  'comparison',
  'game',
  'domain',
] as const;

export type AnalyticsScopeType = (typeof ANALYTICS_SCOPE_TYPES)[number];

export function isAnalyticsScopeType(
  value: unknown,
): value is AnalyticsScopeType {
  return (
    typeof value === 'string' &&
    (ANALYTICS_SCOPE_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Aggregates across groups that opted into global analytics. Source queries
 * must enforce `group_settings.global_analytics_enabled`; the scope carries
 * no group-private identity and must never expose group-private dimensions.
 */
export type GlobalAnalyticsScope = { type: 'global' };

/** Analytics for one saved or linked player. */
export type IndividualAnalyticsScope = {
  type: 'individual';
  /** Stable saved-player identity (`players.id`). Display names are not identity. */
  playerId: string;
  /**
   * Optional authorized group context for baselines. Context only — never an
   * authorization grant, which stays server-side.
   */
  groupId?: string;
};

/** Analytics for one authorized group. Membership and RLS apply server-side. */
export type GroupAnalyticsScope = {
  type: 'group';
  /** Stable group identity (`groups.id`). */
  groupId: string;
};

/**
 * Side-by-side analysis of two or more typed subjects in one shared context.
 * Structural rules live in {@link validateAnalyticsScope}; whether the
 * subjects' denominators, coverage, units, and formula versions are actually
 * compatible is metric-level work owned by later steps.
 */
export type ComparisonAnalyticsScope = {
  type: 'comparison';
  /** Two or more typed subjects; duplicates by stable identity are invalid. */
  subjects: readonly AnalyticsSubjectRef[];
  /** Optional shared authorized group context common to every subject. */
  sharedGroupId?: string;
};

/**
 * Facts and derived values for one authorized game. Per-game facts do not
 * imply aggregate eligibility, and replay coverage may be partial.
 */
export type GameAnalyticsScope = {
  type: 'game';
  /** Stable game identity (`games.id`). */
  gameId: string;
};

/**
 * Subject kinds that can anchor a domain analysis. A subset of
 * {@link AnalyticsSubjectKind}: players, groups, and games are primary
 * entities with their own scopes, not analysis domains.
 */
export const ANALYTICS_DOMAIN_KINDS = [
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
] as const satisfies readonly AnalyticsSubjectKind[];

export type AnalyticsDomainKind = (typeof ANALYTICS_DOMAIN_KINDS)[number];

export function isAnalyticsDomainKind(
  value: unknown,
): value is AnalyticsDomainKind {
  return (
    typeof value === 'string' &&
    (ANALYTICS_DOMAIN_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Entity/domain analysis such as corporation, card, or tag performance.
 * Catalog existence is not gameplay evidence: each metric still declares
 * which domains it supports.
 */
export type DomainAnalyticsScope = {
  type: 'domain';
  domain: AnalyticsDomainKind;
  /** Optional focused entity; its kind must equal `domain` when present. */
  entity?: AnalyticsSubjectRef;
  /**
   * Optional authorized group context. Absent means the analysis draws from
   * the globally opted-in population, never from an arbitrary group.
   */
  groupId?: string;
};

export type AnalyticsScope =
  | GlobalAnalyticsScope
  | IndividualAnalyticsScope
  | GroupAnalyticsScope
  | ComparisonAnalyticsScope
  | GameAnalyticsScope
  | DomainAnalyticsScope;

export const ANALYTICS_POPULATION_KINDS = [
  'global-opted-in-group-games',
  'authorized-player-games',
  'authorized-group-games',
  'comparison-subject-games',
  'authorized-single-game',
  'domain-context-games',
] as const;

export type AnalyticsPopulationKind =
  (typeof ANALYTICS_POPULATION_KINDS)[number];

/**
 * The recorded-game population a scope draws from before Step 2.2 filters
 * narrow it. Descriptive only: it documents which population and whether
 * global opt-in must be enforced at the source; it performs no query and
 * grants no access.
 */
export type AnalyticsDatasetContext = {
  population: AnalyticsPopulationKind;
  /**
   * True when source selection must enforce
   * `group_settings.global_analytics_enabled` for every contributing group.
   */
  requiresGlobalOptIn: boolean;
  groupId?: string;
  playerId?: string;
  gameId?: string;
  /** Number of compared subjects; present for comparison populations only. */
  subjectCount?: number;
};

function assertNeverScope(value: never): never {
  throw new Error(`Unhandled analytics scope: ${JSON.stringify(value)}`);
}

/** Derives the dataset/population context implied by a scope. */
export function describeAnalyticsDatasetContext(
  scope: AnalyticsScope,
): AnalyticsDatasetContext {
  switch (scope.type) {
    case 'global':
      return {
        population: 'global-opted-in-group-games',
        requiresGlobalOptIn: true,
      };
    case 'individual':
      return {
        population: 'authorized-player-games',
        requiresGlobalOptIn: false,
        playerId: scope.playerId,
        ...(scope.groupId === undefined ? {} : { groupId: scope.groupId }),
      };
    case 'group':
      return {
        population: 'authorized-group-games',
        requiresGlobalOptIn: false,
        groupId: scope.groupId,
      };
    case 'comparison':
      return {
        population: 'comparison-subject-games',
        requiresGlobalOptIn: false,
        subjectCount: scope.subjects.length,
        ...(scope.sharedGroupId === undefined
          ? {}
          : { groupId: scope.sharedGroupId }),
      };
    case 'game':
      return {
        population: 'authorized-single-game',
        requiresGlobalOptIn: false,
        gameId: scope.gameId,
      };
    case 'domain':
      return scope.groupId === undefined
        ? { population: 'domain-context-games', requiresGlobalOptIn: true }
        : {
            population: 'domain-context-games',
            requiresGlobalOptIn: false,
            groupId: scope.groupId,
          };
    default:
      return assertNeverScope(scope);
  }
}

export const ANALYTICS_SCOPE_ISSUE_CODES = [
  'missing-entity-id',
  'too-few-comparison-subjects',
  'duplicate-comparison-subjects',
  'invalid-subject-reference',
  'domain-entity-mismatch',
] as const;

export type AnalyticsScopeIssueCode =
  (typeof ANALYTICS_SCOPE_ISSUE_CODES)[number];

export type AnalyticsScopeIssue = {
  code: AnalyticsScopeIssueCode;
  /** Human-readable explanation of why the scope is invalid. */
  message: string;
  /** Path of the offending field, e.g. `subjects[1].preludeId`. */
  path?: string;
};

export type AnalyticsScopeValidation =
  | { valid: true }
  | { valid: false; issues: readonly AnalyticsScopeIssue[] };

function isBlank(value: string): boolean {
  return value.trim() === '';
}

function missingIdIssue(path: string): AnalyticsScopeIssue {
  return {
    code: 'missing-entity-id',
    message: `Scope identity field "${path}" must not be blank`,
    path,
  };
}

function collectSubjectIssues(
  subject: AnalyticsSubjectRef,
  path: string,
): AnalyticsScopeIssue[] {
  return validateAnalyticsSubjectRef(subject).map((issue) => ({
    code: 'invalid-subject-reference' as const,
    message: issue.message,
    path: `${path}.${issue.field}`,
  }));
}

/**
 * Structural validation of a scope: required identities are non-blank,
 * comparisons have at least two distinct valid subjects, and a focused domain
 * entity matches its declared domain. Valid structure does not imply
 * authorization or capability support — those remain separate contracts.
 */
export function validateAnalyticsScope(
  scope: AnalyticsScope,
): AnalyticsScopeValidation {
  const issues: AnalyticsScopeIssue[] = [];

  switch (scope.type) {
    case 'global':
      break;
    case 'individual':
      if (isBlank(scope.playerId)) issues.push(missingIdIssue('playerId'));
      if (scope.groupId !== undefined && isBlank(scope.groupId)) {
        issues.push(missingIdIssue('groupId'));
      }
      break;
    case 'group':
      if (isBlank(scope.groupId)) issues.push(missingIdIssue('groupId'));
      break;
    case 'comparison': {
      if (scope.subjects.length < 2) {
        issues.push({
          code: 'too-few-comparison-subjects',
          message: 'A comparison scope requires at least two subjects',
          path: 'subjects',
        });
      }
      const seenKeys = new Set<string>();
      scope.subjects.forEach((subject, index) => {
        const path = `subjects[${index}]`;
        const subjectIssues = collectSubjectIssues(subject, path);
        issues.push(...subjectIssues);
        if (subjectIssues.length > 0) {
          return;
        }
        const key = analyticsSubjectKey(subject);
        if (seenKeys.has(key)) {
          issues.push({
            code: 'duplicate-comparison-subjects',
            message: `Comparison subjects must be distinct; "${key}" appears more than once`,
            path,
          });
          return;
        }
        seenKeys.add(key);
      });
      if (scope.sharedGroupId !== undefined && isBlank(scope.sharedGroupId)) {
        issues.push(missingIdIssue('sharedGroupId'));
      }
      break;
    }
    case 'game':
      if (isBlank(scope.gameId)) issues.push(missingIdIssue('gameId'));
      break;
    case 'domain': {
      if (scope.entity !== undefined) {
        if (scope.entity.kind !== scope.domain) {
          issues.push({
            code: 'domain-entity-mismatch',
            message: `Focused entity kind "${scope.entity.kind}" does not match domain "${scope.domain}"`,
            path: 'entity',
          });
        } else {
          issues.push(...collectSubjectIssues(scope.entity, 'entity'));
        }
      }
      if (scope.groupId !== undefined && isBlank(scope.groupId)) {
        issues.push(missingIdIssue('groupId'));
      }
      break;
    }
    default:
      assertNeverScope(scope);
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
