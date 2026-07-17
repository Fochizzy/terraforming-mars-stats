/** Public pure calculation utilities (Phase 2, Step 2.4). */

export {
  aggregateEndHandCarryover,
  aggregateHandUtilization,
  aggregatePurchaseConversion,
  aggregatePurchasedHandShare,
  calculateEndHandCarryover,
  calculateHandUtilization,
  calculatePurchaseConversion,
  calculatePurchasedHandShare,
  type CardAcquisitionRateAggregate,
  type CardAcquisitionRateAggregateInput,
  type CardAcquisitionRateEvaluation,
  type CardAcquisitionRateInput,
  type EndHandCarryoverInput,
  type HandUtilizationInput,
  type PurchaseConversionInput,
  type PurchasedHandShareInput,
} from './card-acquisition';

export {
  calculateWinPointDifferential,
  type WinPointDifferentialEvaluation,
  type WinPointDifferentialInput,
} from './win-point-differential';
