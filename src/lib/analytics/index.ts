/**
 * Shared analytics scope and capability contracts (Phase 2, Step 2.1).
 *
 * Client-safe pure TypeScript only: no React, no Supabase, no server-only
 * imports. Later steps build on these contracts — Step 2.2 adds filters and
 * URL state, Step 2.3 adds metric/sample/eligibility results, Step 2.4 adds
 * approved calculations, and Step 2.5 adds repository queries. See
 * `docs/redesign/ANALYTICS-SCOPE-CAPABILITY-MODEL.md` for the usage guide.
 */

export {
  ANALYTICS_SCORE_SOURCE_KEYS,
  ANALYTICS_SUBJECT_ISSUE_CODES,
  ANALYTICS_SUBJECT_KINDS,
  analyticsSubjectKey,
  analyticsSubjectRefsEqual,
  isAnalyticsScoreSourceKey,
  isAnalyticsSubjectKind,
  validateAnalyticsSubjectRef,
  type AnalyticsScoreSourceKey,
  type AnalyticsSubjectDisplay,
  type AnalyticsSubjectIssue,
  type AnalyticsSubjectIssueCode,
  type AnalyticsSubjectKind,
  type AnalyticsSubjectRef,
  type AwardSubjectRef,
  type CardSubjectRef,
  type CorporationPreludePairingSubjectRef,
  type CorporationSubjectRef,
  type GameSubjectRef,
  type GroupSubjectRef,
  type LabeledAnalyticsSubject,
  type MapSubjectRef,
  type MilestoneSubjectRef,
  type PlayerSubjectRef,
  type PreludeSubjectRef,
  type ScoreSourceSubjectRef,
  type StyleSubjectRef,
  type TagSubjectRef,
} from './subjects';

export {
  ANALYTICS_DOMAIN_KINDS,
  ANALYTICS_POPULATION_KINDS,
  ANALYTICS_SCOPE_ISSUE_CODES,
  ANALYTICS_SCOPE_TYPES,
  describeAnalyticsDatasetContext,
  isAnalyticsDomainKind,
  isAnalyticsScopeType,
  validateAnalyticsScope,
  type AnalyticsDatasetContext,
  type AnalyticsDomainKind,
  type AnalyticsPopulationKind,
  type AnalyticsScope,
  type AnalyticsScopeIssue,
  type AnalyticsScopeIssueCode,
  type AnalyticsScopeType,
  type AnalyticsScopeValidation,
  type ComparisonAnalyticsScope,
  type DomainAnalyticsScope,
  type GameAnalyticsScope,
  type GlobalAnalyticsScope,
  type GroupAnalyticsScope,
  type IndividualAnalyticsScope,
} from './scopes';

export {
  ANALYTICS_COVERAGE_ISSUE_CODES,
  ANALYTICS_COVERAGE_STATUSES,
  analyticsCoverageRatio,
  analyticsCoverageStatus,
  normalizeAnalyticsCoverage,
  toCoverageObservation,
  validateAnalyticsCoverage,
  type AnalyticsCoverage,
  type AnalyticsCoverageBreakdownEntry,
  type AnalyticsCoverageCounts,
  type AnalyticsCoverageIssue,
  type AnalyticsCoverageIssueCode,
  type AnalyticsCoverageStatus,
  type AnalyticsSourceCoverage,
} from './coverage';

export {
  ANALYTICS_EVIDENCE_ISSUE_CODES,
  ANALYTICS_EVIDENCE_SOURCE_KINDS,
  isAnalyticsEvidenceSourceKind,
  validateAnalyticsEvidence,
  type AnalyticsCalculationVersion,
  type AnalyticsEvidence,
  type AnalyticsEvidenceIssue,
  type AnalyticsEvidenceIssueCode,
  type AnalyticsEvidenceSource,
  type AnalyticsEvidenceSourceKind,
  type AnalyticsEvidenceVerification,
} from './evidence';

export {
  ANALYTICS_CAPABILITY_ISSUE_CODES,
  ANALYTICS_CAPABILITY_REASON_CODES,
  ANALYTICS_CAPABILITY_STATUSES,
  describeAnalyticsCapabilityStatus,
  describeUnsupportedScope,
  isAnalyticsCapabilityExecutable,
  isAnalyticsCapabilityReasonCode,
  isAnalyticsCapabilityStatus,
  isScopeSupportedByCapability,
  validateAnalyticsCapabilityResult,
  type AnalyticsCapabilityIssue,
  type AnalyticsCapabilityIssueCode,
  type AnalyticsCapabilityReason,
  type AnalyticsCapabilityReasonCode,
  type AnalyticsCapabilityRemediation,
  type AnalyticsCapabilityResult,
  type AnalyticsCapabilityStatus,
  type AnalyticsDataRequirement,
  type AnalyticsScopeSupportDeclaration,
  type AnalyticsUnsupportedScopeDeclaration,
  type InsufficientEvidenceAnalyticsCapability,
  type NonExecutableAnalyticsCapability,
  type PartiallySupportedAnalyticsCapability,
  type RequiresNewFieldsAnalyticsCapability,
  type RequiresQueryWorkAnalyticsCapability,
  type RequiresViewAnalyticsCapability,
  type SupportedAnalyticsCapability,
  type UnavailableAnalyticsCapability,
} from './capabilities';

export {
  DECLARED_ANALYTICS_CAPABILITIES,
  DECLARED_ANALYTICS_CAPABILITY_KEYS,
  getDeclaredAnalyticsCapability,
} from './capability-declarations';

export {
  capabilityUnavailableAnalyticsValue,
  isCapabilityUnavailableAnalyticsValue,
  isLoadErrorAnalyticsValue,
  isReadyAnalyticsValue,
  loadErrorAnalyticsValue,
  readyAnalyticsValue,
  type AnalyticsLoadError,
  type AnalyticsResultWarning,
  type AnalyticsValueResult,
  type CapabilityUnavailableAnalyticsValue,
  type LoadErrorAnalyticsValue,
  type ReadyAnalyticsValue,
} from './value-availability';
