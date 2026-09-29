export const MATCHING_POLICY_VERSION = "instrument-matching-pilot/v1" as const;
export const MATCHING_RESOURCE_SCOPE =
  "instrument-matching-resources/v1" as const;
export const EXPOSURE_KEY_VERSION = "instrument-exposure-pilot/v1" as const;

export const MATCHING_LIMITS = Object.freeze({
  instruments: 1_024,
  partnersPerInstrument: 32,
  candidatePairs: 8_192,
  bindings: 4_096,
  aliasDepth: 1,
  mappingVersionsPerMapping: 64,
  mappingEventRecords: 4_096,
  evidencePerSubject: 32,
  evidenceReferences: 32_768,
  evidenceRecordBytes: 8_192,
  conflicts: 128,
  diagnostics: 200,
  atomicIdUtf16: 160,
  atomicIdUtf8: 640,
  compositeIdUtf8: 4_096,
  reasonTextUtf8: 512,
  inputBytes: 16_777_216,
  outputBytes: 16_777_216,
  jsonDepth: 16,
  jsonNodes: 100_000,
  objectKeys: 64,
  genericArray: 32_768,
  decimalWireChars: 256,
  decimalCoefficientDigits: 78,
  decimalWireScale: 36,
  decimalDomainScale: 78,
  logicalSteps: 100_000,
  cancellationInterval: 128,
  metadataAgeMs: 60_000n,
  maximumValidityMs: 2_592_000_000n,
});

const SPECIAL_NATIVE_FAMILIES = Object.freeze([
  "OKX_PRE_MARKET",
  "OKX_XPERP",
] as const);

export function isSpecialNativeFamily(value: string): boolean {
  return SPECIAL_NATIVE_FAMILIES.some((family) => family === value);
}
