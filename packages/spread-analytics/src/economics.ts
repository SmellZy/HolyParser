import {
  DecimalOverflowError,
  type ExactDecimal,
  type InstrumentMetadataObservation,
} from "@arbitrage/market-data";
import { sameText, type WorkBudget } from "./bounds.js";
import type { NativeEconomicsEvidence } from "./model.js";
import { MatchingFailure, type MatchReasonCode } from "./reasons.js";

export function economicsAvailability(
  metadata: InstrumentMetadataObservation,
  evidence: NativeEconomicsEvidence,
): readonly MatchReasonCode[] {
  const reasons: MatchReasonCode[] = [];
  if (
    metadata.contractMultiplier.state !== "KNOWN" ||
    evidence.baseUnitsPerNativeQuantity.state !== "KNOWN"
  ) {
    reasons.push("MULTIPLIER_UNKNOWN");
  }
  if (
    metadata.contractValueConvention.state !== "KNOWN" ||
    evidence.payoff.state !== "KNOWN"
  ) {
    reasons.push("VALUE_CONVENTION_UNVERIFIED");
  }
  if (!evidence.collateralVerified) {
    reasons.push("COLLATERAL_ECONOMICS_UNVERIFIED");
  }
  return Object.freeze([...new Set(reasons)]);
}

function requireFactor(
  metadata: InstrumentMetadataObservation,
  evidence: NativeEconomicsEvidence,
): ExactDecimal {
  if (
    metadata.contractMultiplier.state !== "KNOWN" ||
    evidence.baseUnitsPerNativeQuantity.state !== "KNOWN"
  )
    throw new MatchingFailure("MULTIPLIER_UNKNOWN", "Multiplier unknown.");
  const value = evidence.baseUnitsPerNativeQuantity.value;
  if (value.isZero() || value.isNegative())
    throw new MatchingFailure("MULTIPLIER_INVALID", "Multiplier invalid.");
  if (!metadata.contractMultiplier.value.equals(value))
    throw new MatchingFailure(
      "METADATA_EVIDENCE_CONFLICT",
      "Multiplier conflict.",
    );
  return value;
}
function requirePayoff(
  metadata: InstrumentMetadataObservation,
  evidence: NativeEconomicsEvidence,
): "LINEAR" | "INVERSE" | "QUANTO" {
  if (metadata.contractValueConvention.state !== "KNOWN")
    throw new MatchingFailure(
      "VALUE_CONVENTION_UNVERIFIED",
      "Convention unknown.",
    );
  if (evidence.payoff.state !== "KNOWN")
    throw new MatchingFailure(evidence.payoff.reasonCode, "Payoff unknown.");
  if (metadata.contractValueConvention.value !== evidence.payoff.value)
    throw new MatchingFailure("METADATA_EVIDENCE_CONFLICT", "Payoff conflict.");
  return evidence.payoff.value;
}
export function compareEconomics(
  leftMeta: InstrumentMetadataObservation,
  left: NativeEconomicsEvidence,
  rightMeta: InstrumentMetadataObservation,
  right: NativeEconomicsEvidence,
  work: WorkBudget,
): MatchReasonCode {
  requireFactor(leftMeta, left);
  requireFactor(rightMeta, right);
  const lp = requirePayoff(leftMeta, left),
    rp = requirePayoff(rightMeta, right);
  if (lp !== rp || lp !== "LINEAR") return "VALUE_CONVENTION_MISMATCH";
  if (
    left.nativeQuantityUnit.state !== "KNOWN" ||
    right.nativeQuantityUnit.state !== "KNOWN" ||
    left.canonicalBaseUnit.state !== "KNOWN" ||
    right.canonicalBaseUnit.state !== "KNOWN" ||
    // Unit labels are bounded by validation; charge the equality pass.
    !sameText(left.canonicalBaseUnit.value, right.canonicalBaseUnit.value, work)
  )
    return "CONTRACT_UNIT_MISMATCH";
  if (!left.collateralVerified || !right.collateralVerified)
    throw new MatchingFailure(
      "COLLATERAL_ECONOMICS_UNVERIFIED",
      "Collateral unknown.",
    );
  return "COMPATIBLE_APPROVED";
}
export function normalizeBaseExposure(
  quantity: ExactDecimal,
  factor: ExactDecimal,
): ExactDecimal {
  if (factor.isZero() || factor.isNegative())
    throw new MatchingFailure("MULTIPLIER_INVALID", "Multiplier invalid.");
  try {
    return quantity.multiply(factor);
  } catch (error) {
    if (error instanceof DecimalOverflowError)
      throw new MatchingFailure("DECIMAL_BOUND_EXCEEDED", "Decimal overflow.");
    throw error;
  }
}

export function normalizeQuoteNotional(
  baseExposure: ExactDecimal,
  price: ExactDecimal,
): ExactDecimal {
  if (baseExposure.isNegative() || price.isNegative())
    throw new MatchingFailure(
      "INPUT_INVALID",
      "Exposure and price must be non-negative.",
    );
  try {
    return baseExposure.multiply(price);
  } catch (error) {
    if (error instanceof DecimalOverflowError)
      throw new MatchingFailure("DECIMAL_BOUND_EXCEEDED", "Decimal overflow.");
    throw error;
  }
}
