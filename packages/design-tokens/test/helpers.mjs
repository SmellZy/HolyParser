import assert from "node:assert/strict";
import { loadAndValidate } from "../scripts/lib.mjs";

export async function canonicalSource() {
  const { source } = await loadAndValidate({
    requireCanonicalSourceBytes: false,
  });
  return structuredClone(source);
}

export function expectCode(action, code) {
  assert.throws(action, (error) => {
    assert.match(error.message, new RegExp(code));
    return true;
  });
}

export function colorToken(id, value = "#123456") {
  return {
    id,
    kind: "primitive",
    family: "primitive",
    type: "color",
    description: "Synthetic test token.",
    accessibilityRole: "not-directly-consumable",
    lifecycle: "active",
    introducedIn: "1.0.0",
    value,
  };
}
