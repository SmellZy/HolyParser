import {
  publicCapabilityNames,
  validateAdapterCapabilities,
  type AdapterCapabilities,
  type CapabilityDeclaration,
  type PublicCapabilityName,
  type PublicCapabilityPort,
  type PublicMarketDataAdapter,
} from "./capabilities.js";
import type { ProductGroup, Venue } from "./identifiers.js";
import type { SourceId } from "./quality.js";

export function capabilityDeclaration(
  state: CapabilityDeclaration["state"],
  note: string,
  sourceIds: ReadonlyArray<SourceId> = [],
): CapabilityDeclaration {
  return Object.freeze({ state, note, sourceIds: [...sourceIds] });
}

export function defineCapabilities(
  declarations: Partial<Record<PublicCapabilityName, CapabilityDeclaration>>,
  fallback: CapabilityDeclaration,
): AdapterCapabilities {
  return Object.freeze(
    Object.fromEntries(
      publicCapabilityNames.map((name) => [
        name,
        declarations[name] ?? fallback,
      ]),
    ) as unknown as AdapterCapabilities,
  );
}

export class MockPublicMarketDataAdapter implements PublicMarketDataAdapter {
  readonly ports: Readonly<
    Partial<Record<PublicCapabilityName, PublicCapabilityPort>>
  >;

  constructor(
    readonly venue: Venue,
    readonly productGroup: ProductGroup,
    readonly capabilities: AdapterCapabilities,
    ports: Readonly<
      Partial<Record<PublicCapabilityName, PublicCapabilityPort>>
    >,
  ) {
    this.ports = Object.freeze({ ...ports });
    validateAdapterCapabilities(this);
  }
}
