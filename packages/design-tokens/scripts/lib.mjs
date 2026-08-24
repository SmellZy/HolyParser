import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const repoRoot = resolve(packageRoot, "../..");

const SOURCE_RELATIVE_PATHS = [
  "schema/design-tokens.schema.json",
  "src/chart-encodings.source.json",
  "src/contrast-pairs.source.json",
  "src/status-presentations.source.json",
  "src/token-set.meta.json",
  "src/tokens.source.json",
];

const TOKEN_FIELDS = [
  "id",
  "kind",
  "family",
  "type",
  "description",
  "accessibilityRole",
  "lifecycle",
  "introducedIn",
  "deprecatedIn",
  "replacement",
  "removeAfterVersion",
  "migrationNote",
  "value",
  "dark",
  "light",
];

const TOKEN_KINDS = new Set(["primitive", "semantic"]);
const TOKEN_FAMILIES = new Set([
  "action",
  "background",
  "border",
  "capability",
  "chart",
  "elevation",
  "financial",
  "focus",
  "layer",
  "motion",
  "opacity",
  "primitive",
  "radius",
  "sizing",
  "spacing",
  "status",
  "surface",
  "text",
  "typography",
]);
const TOKEN_TYPES = new Set([
  "color",
  "cubicBezier",
  "dimension",
  "duration",
  "fontFamily",
  "fontWeight",
  "integer",
  "number",
  "shadow",
  "string",
]);
const SYSTEM_COLORS = [
  "ButtonFace",
  "ButtonText",
  "Canvas",
  "CanvasText",
  "GrayText",
  "Highlight",
  "HighlightText",
  "LinkText",
  "Mark",
  "MarkText",
];
const HEX = /^#[0-9A-F]{6}(?:[0-9A-F]{2})?$/;
const ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const ALIAS = /^\{([a-z0-9]+(?:[.-][a-z0-9]+)*)\}$/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const FORBIDDEN_CSS = /(?:url\s*\(|@import|expression\s*\(|javascript:)/i;
const APPROVED_BOUNDS = {
  maxTokens: 2048,
  maxSupportRecords: 4096,
  maxJsonDepth: 16,
  maxJsonNodes: 50000,
  maxObjectKeys: 64,
  maxAliasDepth: 8,
  maxIdBytes: 128,
  maxStringBytes: 512,
  maxDescriptionBytes: 1024,
  maxFontFamilyEntries: 12,
  maxFontFamilyNameBytes: 64,
  maxFontFamilyStackBytes: 512,
  maxShadowLayers: 4,
  maxSourceFileBytes: 1048576,
  maxSourceAggregateBytes: 4194304,
  maxArtifactFileBytes: 2097152,
  maxArtifactAggregateBytes: 6291456,
  maxDiagnostics: 200,
};

export class Diagnostics {
  constructor(limit = 200) {
    this.limit = limit;
    this.items = [];
    this.truncated = false;
  }

  add(code, location, message) {
    if (this.items.length < this.limit) {
      this.items.push({
        code,
        location,
        message: String(message).slice(0, 240),
      });
    } else {
      this.truncated = true;
    }
  }

  throwIfAny() {
    if (this.items.length === 0) return;
    const lines = this.items.map(
      ({ code, location, message }) => `${code} ${location}: ${message}`,
    );
    if (this.truncated)
      lines.push("DIAGNOSTIC_LIMIT: additional findings omitted");
    throw new Error(lines.join("\n"));
  }
}

export function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function utf8Bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function countJson(value, bounds, diagnostics, location, state, depth = 1) {
  if (depth > bounds.maxJsonDepth) {
    diagnostics.add(
      "JSON_DEPTH_EXCEEDED",
      location,
      `maximum ${bounds.maxJsonDepth}`,
    );
    return;
  }
  state.nodes += 1;
  if (state.nodes > bounds.maxJsonNodes) {
    diagnostics.add(
      "JSON_NODE_LIMIT_EXCEEDED",
      location,
      `maximum ${bounds.maxJsonNodes}`,
    );
    return;
  }
  if (typeof value === "string") {
    const limit = location.endsWith(".description")
      ? bounds.maxDescriptionBytes
      : bounds.maxStringBytes;
    if (utf8Bytes(value) > limit) {
      diagnostics.add(
        "STRING_TOO_LONG",
        location,
        `maximum ${limit} UTF-8 bytes`,
      );
    }
    if (CONTROL.test(value))
      diagnostics.add("CONTROL_CHARACTER", location, "control character");
    return;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      countJson(
        value[index],
        bounds,
        diagnostics,
        `${location}[${index}]`,
        state,
        depth + 1,
      );
    }
    return;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > bounds.maxObjectKeys) {
      diagnostics.add(
        "OBJECT_KEY_LIMIT_EXCEEDED",
        location,
        `maximum ${bounds.maxObjectKeys}`,
      );
    }
    for (const key of keys) {
      countJson(
        value[key],
        bounds,
        diagnostics,
        `${location}.${key}`,
        state,
        depth + 1,
      );
    }
  }
}

export async function readJsonBounded(path, maxBytes, diagnostics) {
  const bytes = await readFile(path);
  if (bytes.length > maxBytes) {
    diagnostics.add("SOURCE_FILE_TOO_LARGE", path, `maximum ${maxBytes} bytes`);
    return { bytes, value: null };
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    diagnostics.add("UTF8_BOM_PROHIBITED", path, "UTF-8 BOM is prohibited");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    diagnostics.add("INVALID_UTF8", path, "input is not valid UTF-8");
    return { bytes, value: null };
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    diagnostics.add("MALFORMED_JSON", path, "JSON parsing failed");
    return { bytes, text, value: null };
  }
  return { bytes, text, value };
}

function expectFields(record, allowed, required, diagnostics, location) {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key))
      diagnostics.add(
        "UNKNOWN_FIELD",
        `${location}.${key}`,
        "field is not allowed",
      );
  }
  for (const key of required) {
    if (!(key in record))
      diagnostics.add(
        "MISSING_FIELD",
        `${location}.${key}`,
        "field is required",
      );
  }
  const actual = Object.keys(record).filter((key) => allowed.includes(key));
  const expected = allowed.filter((key) => key in record);
  if (actual.join("\0") !== expected.join("\0")) {
    diagnostics.add(
      "FIELD_ORDER_INVALID",
      location,
      "fields must follow schema order",
    );
  }
}

function validateLiteral(type, value, diagnostics, location, bounds) {
  if (typeof value === "string" && ALIAS.test(value)) return;
  if (typeof value === "string" && FORBIDDEN_CSS.test(value)) {
    diagnostics.add(
      "ARBITRARY_CSS_PROHIBITED",
      location,
      "URL/import or executable CSS is prohibited",
    );
  }
  switch (type) {
    case "color":
      if (typeof value !== "string" || !HEX.test(value)) {
        diagnostics.add(
          "INVALID_COLOR",
          location,
          "expected uppercase 6- or 8-digit hexadecimal color",
        );
      }
      break;
    case "dimension":
      if (
        !value ||
        typeof value !== "object" ||
        !Number.isInteger(value.amount) ||
        value.amount < 0 ||
        value.unit !== "px" ||
        Object.keys(value).join("\0") !== "amount\0unit"
      ) {
        diagnostics.add(
          "INVALID_DIMENSION",
          location,
          "expected non-negative integer px dimension",
        );
      }
      break;
    case "duration":
      if (
        !value ||
        typeof value !== "object" ||
        !Number.isInteger(value.milliseconds) ||
        value.milliseconds < 0 ||
        Object.keys(value).join("\0") !== "milliseconds"
      ) {
        diagnostics.add(
          "INVALID_DURATION",
          location,
          "expected non-negative integer milliseconds",
        );
      }
      break;
    case "cubicBezier": {
      const keys = value && typeof value === "object" ? Object.keys(value) : [];
      if (keys.join("\0") !== "x1\0y1\0x2\0y2") {
        diagnostics.add("INVALID_EASING", location, "expected x1/y1/x2/y2");
        break;
      }
      for (const key of keys) {
        if (!/^(?:0(?:\.[0-9]+)?|1(?:\.0+)?)$/.test(value[key])) {
          diagnostics.add(
            "INVALID_EASING",
            `${location}.${key}`,
            "control point must be within 0..1",
          );
        }
      }
      break;
    }
    case "fontFamily": {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.length > bounds.maxFontFamilyEntries
      ) {
        diagnostics.add(
          "INVALID_FONT_STACK",
          location,
          `expected 1..${bounds.maxFontFamilyEntries} families`,
        );
        break;
      }
      let stackBytes = 0;
      for (const [index, family] of value.entries()) {
        if (
          typeof family !== "string" ||
          utf8Bytes(family) > bounds.maxFontFamilyNameBytes ||
          CONTROL.test(family) ||
          FORBIDDEN_CSS.test(family)
        ) {
          diagnostics.add(
            "INVALID_FONT_FAMILY",
            `${location}[${index}]`,
            "invalid font family",
          );
        }
        stackBytes += utf8Bytes(String(family));
      }
      if (stackBytes > bounds.maxFontFamilyStackBytes)
        diagnostics.add(
          "FONT_STACK_TOO_LONG",
          location,
          "font stack bound exceeded",
        );
      break;
    }
    case "fontWeight":
      if (![400, 500, 600, 700].includes(value))
        diagnostics.add(
          "INVALID_FONT_WEIGHT",
          location,
          "weight is not approved",
        );
      break;
    case "integer":
      if (!Number.isInteger(value))
        diagnostics.add("INVALID_INTEGER", location, "expected integer");
      break;
    case "number":
      if (
        typeof value !== "string" ||
        !/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)
      ) {
        diagnostics.add(
          "INVALID_NUMBER",
          location,
          "expected exact non-scientific decimal string",
        );
      }
      break;
    case "shadow":
      if (!Array.isArray(value) || value.length > bounds.maxShadowLayers) {
        diagnostics.add(
          "INVALID_SHADOW",
          location,
          `maximum ${bounds.maxShadowLayers} layers`,
        );
        break;
      }
      for (const [index, layer] of value.entries()) {
        if (
          !layer ||
          typeof layer !== "object" ||
          Object.keys(layer).join("\0") !== "x\0y\0blur\0spread\0color"
        ) {
          diagnostics.add(
            "INVALID_SHADOW",
            `${location}[${index}]`,
            "invalid structured shadow layer",
          );
          continue;
        }
        for (const key of ["x", "y", "blur", "spread"]) {
          if (
            !Number.isInteger(layer[key]) ||
            (key === "blur" && layer[key] < 0)
          )
            diagnostics.add(
              "INVALID_SHADOW",
              `${location}[${index}].${key}`,
              "invalid px value",
            );
        }
        if (typeof layer.color !== "string" || !HEX.test(layer.color))
          diagnostics.add(
            "INVALID_SHADOW",
            `${location}[${index}].color`,
            "invalid color",
          );
      }
      break;
    case "string":
      if (
        typeof value !== "string" ||
        value.length === 0 ||
        CONTROL.test(value) ||
        FORBIDDEN_CSS.test(value)
      )
        diagnostics.add(
          "INVALID_STRING",
          location,
          "invalid structured string",
        );
      break;
    default:
      diagnostics.add("UNKNOWN_TOKEN_TYPE", location, String(type));
  }
}

function validateSortedUnique(records, diagnostics, location) {
  let previous = "";
  const seen = new Set();
  for (const [index, record] of records.entries()) {
    const current = record?.id;
    if (typeof current !== "string") continue;
    if (seen.has(current))
      diagnostics.add("DUPLICATE_ID", `${location}[${index}].id`, current);
    if (index > 0 && !(previous < current))
      diagnostics.add("UNSORTED_ID", `${location}[${index}].id`, current);
    seen.add(current);
    previous = current;
  }
}

function validateSupportOrder(source, diagnostics) {
  const arrays = [
    [source.contrast.pairs, "contrast.pairs"],
    [source.contrast.prohibitions, "contrast.prohibitions"],
    [source.contrast.scrimComposites, "contrast.scrimComposites"],
    [source.chart.categorical, "chart.categorical"],
    [source.chart.semantic, "chart.semantic"],
    [source.chart.emphasis, "chart.emphasis"],
    [source.status.presentations, "status.presentations"],
    [source.status.forcedColors, "status.forcedColors"],
  ];
  for (const [records, location] of arrays) {
    if (!Array.isArray(records))
      diagnostics.add("MISSING_SUPPORT_ARRAY", location, "expected array");
    else validateSortedUnique(records, diagnostics, location);
  }
}

function resolveTokenValue(id, theme, tokensById, diagnostics, path = []) {
  const token = tokensById.get(id);
  if (!token) {
    diagnostics.add("UNKNOWN_ALIAS", id, "alias target does not exist");
    return undefined;
  }
  if (path.includes(id)) {
    diagnostics.add("ALIAS_CYCLE", id, "alias cycle detected");
    return undefined;
  }
  if (path.length >= 8) {
    diagnostics.add("ALIAS_DEPTH_EXCEEDED", id, "maximum alias depth 8");
    return undefined;
  }
  const value = token.value ?? token[theme.toLowerCase()];
  if (typeof value === "string") {
    const match = value.match(ALIAS);
    if (match) {
      const target = tokensById.get(match[1]);
      if (target && target.type !== token.type)
        diagnostics.add(
          "CROSS_TYPE_ALIAS",
          id,
          `${token.type} -> ${target.type}`,
        );
      return resolveTokenValue(match[1], theme, tokensById, diagnostics, [
        ...path,
        id,
      ]);
    }
  }
  return value;
}

function validateTokenRecords(source, diagnostics) {
  const { bounds } = source.meta;
  expectFields(source.tokens, ["tokens"], ["tokens"], diagnostics, "tokens");
  if (!Array.isArray(source.tokens.tokens)) {
    diagnostics.add("MISSING_TOKENS", "tokens.tokens", "expected array");
    return new Map();
  }
  if (source.tokens.tokens.length > bounds.maxTokens)
    diagnostics.add(
      "TOKEN_LIMIT_EXCEEDED",
      "tokens.tokens",
      `maximum ${bounds.maxTokens}`,
    );
  validateSortedUnique(source.tokens.tokens, diagnostics, "tokens.tokens");
  const tokensById = new Map();
  const cssNames = new Set();
  for (const [index, token] of source.tokens.tokens.entries()) {
    const location = `tokens.tokens[${index}]`;
    expectFields(
      token,
      TOKEN_FIELDS,
      [
        "id",
        "kind",
        "family",
        "type",
        "description",
        "accessibilityRole",
        "lifecycle",
        "introducedIn",
      ],
      diagnostics,
      location,
    );
    if (
      typeof token.id !== "string" ||
      !ID.test(token.id) ||
      utf8Bytes(token.id) > bounds.maxIdBytes
    )
      diagnostics.add(
        "INVALID_ID",
        `${location}.id`,
        "invalid canonical token ID",
      );
    if (!TOKEN_KINDS.has(token.kind))
      diagnostics.add(
        "UNKNOWN_TOKEN_KIND",
        `${location}.kind`,
        String(token.kind),
      );
    if (!TOKEN_FAMILIES.has(token.family))
      diagnostics.add(
        "UNKNOWN_TOKEN_FAMILY",
        `${location}.family`,
        String(token.family),
      );
    if (!TOKEN_TYPES.has(token.type))
      diagnostics.add(
        "UNKNOWN_TOKEN_TYPE",
        `${location}.type`,
        String(token.type),
      );
    if (!SEMVER.test(token.introducedIn ?? ""))
      diagnostics.add(
        "INVALID_VERSION",
        `${location}.introducedIn`,
        "expected SemVer",
      );
    if (token.deprecatedIn && !SEMVER.test(token.deprecatedIn))
      diagnostics.add(
        "INVALID_VERSION",
        `${location}.deprecatedIn`,
        "expected SemVer",
      );
    if (token.removeAfterVersion && !SEMVER.test(token.removeAfterVersion))
      diagnostics.add(
        "INVALID_VERSION",
        `${location}.removeAfterVersion`,
        "expected SemVer",
      );
    if (token.lifecycle === "deprecated") {
      for (const field of [
        "deprecatedIn",
        "replacement",
        "removeAfterVersion",
        "migrationNote",
      ])
        if (!token[field])
          diagnostics.add(
            "DEPRECATED_METADATA_MISSING",
            `${location}.${field}`,
            "deprecated tokens require complete migration metadata",
          );
    } else if (
      token.deprecatedIn ||
      token.replacement ||
      token.removeAfterVersion ||
      token.migrationNote
    ) {
      diagnostics.add(
        "ACTIVE_LIFECYCLE_METADATA_INVALID",
        location,
        "active tokens cannot carry deprecation metadata",
      );
    }
    if ("value" in token === ("dark" in token || "light" in token))
      diagnostics.add(
        "VALUE_SHAPE_INVALID",
        location,
        "use value or complete dark/light pair",
      );
    if ("dark" in token !== "light" in token)
      diagnostics.add(
        "THEME_PARITY_MISSING",
        location,
        "DARK and LIGHT are both required",
      );
    for (const key of ["value", "dark", "light"])
      if (key in token)
        validateLiteral(
          token.type,
          token[key],
          diagnostics,
          `${location}.${key}`,
          bounds,
        );
    const cssName = tokenIdToCssName(token.id);
    if (cssNames.has(cssName))
      diagnostics.add("DUPLICATE_CSS_NAME", location, cssName);
    cssNames.add(cssName);
    tokensById.set(token.id, token);
  }
  for (const token of source.tokens.tokens) {
    for (const theme of ["DARK", "LIGHT"])
      resolveTokenValue(token.id, theme, tokensById, diagnostics);
    if (token.replacement) {
      const target = tokensById.get(token.replacement);
      if (!target)
        diagnostics.add("UNKNOWN_REPLACEMENT", token.id, token.replacement);
      else if (target.replacement)
        diagnostics.add(
          "REPLACEMENT_CHAIN_EXCEEDED",
          token.id,
          "maximum replacement chain is one",
        );
      else if (target.type !== token.type || target.family !== token.family)
        diagnostics.add(
          "INCOMPATIBLE_REPLACEMENT",
          token.id,
          "replacement must preserve token type and semantic family",
        );
    }
  }
  return tokensById;
}

function validateMeta(meta, diagnostics) {
  const allowed = [
    "namespace",
    "schemaVersion",
    "tokenSetVersion",
    "generatorContractVersion",
    "artifactPolicy",
    "defaultTheme",
    "resolvedThemes",
    "preferenceModes",
    "canonicalSources",
    "generatedArtifacts",
    "bounds",
    "compatibilityPolicy",
    "compatibilityAliases",
    "rawValueScanner",
  ];
  expectFields(meta, allowed, allowed, diagnostics, "meta");
  for (const field of [
    "schemaVersion",
    "tokenSetVersion",
    "generatorContractVersion",
  ])
    if (!SEMVER.test(meta[field] ?? ""))
      diagnostics.add("INVALID_VERSION", `meta.${field}`, "expected SemVer");
  if (meta.schemaVersion !== "1.0.0" || meta.tokenSetVersion !== "1.0.0")
    diagnostics.add(
      "INITIAL_VERSION_MISMATCH",
      "meta",
      "D1 must begin at 1.0.0/1.0.0",
    );
  if (meta.defaultTheme !== "DARK")
    diagnostics.add(
      "DEFAULT_THEME_INVALID",
      "meta.defaultTheme",
      "DARK is required",
    );
  if (JSON.stringify(meta.resolvedThemes) !== JSON.stringify(["DARK", "LIGHT"]))
    diagnostics.add(
      "RESOLVED_THEMES_INVALID",
      "meta.resolvedThemes",
      "exactly DARK and LIGHT",
    );
  if (
    JSON.stringify(meta.preferenceModes) !==
    JSON.stringify(["SYSTEM", "DARK", "LIGHT"])
  )
    diagnostics.add(
      "PREFERENCE_MODES_INVALID",
      "meta.preferenceModes",
      "SYSTEM is policy metadata only",
    );
  if (JSON.stringify(meta.bounds) !== JSON.stringify(APPROVED_BOUNDS))
    diagnostics.add(
      "RESOURCE_BOUNDS_INVALID",
      "meta.bounds",
      "exact D-083 bounds required",
    );
  const expectedCompatibility = {
    minimumSubsequentMinorReleases: 2,
    minimumDays: 90,
    normalGovernanceCheckpointDays: 180,
    maximumReplacementChain: 1,
    previousAcceptedSetBuildable: true,
    rollbackUnit: "SOURCE_ARTIFACT_MANIFEST_ALIAS_ATOMIC",
    initialAliasCohort: {
      introducedIn: "1.0.0",
      deprecatedIn: "1.0.0",
      createdDate: "2026-08-17",
      removeNotBeforeVersion: "2.0.0",
      removeNotBeforeDate: "2026-11-15",
      migrationNote:
        "Replace Phase 1 legacy CSS names with canonical --hp-* semantic properties before removal.",
    },
  };
  if (
    JSON.stringify(meta.compatibilityPolicy) !==
    JSON.stringify(expectedCompatibility)
  )
    diagnostics.add(
      "COMPATIBILITY_POLICY_INVALID",
      "meta.compatibilityPolicy",
      "exact D-085 policy required",
    );
  const expectedCanonical = SOURCE_RELATIVE_PATHS.map(
    (path) => `packages/design-tokens/${path}`,
  ).sort();
  if (
    JSON.stringify(meta.canonicalSources) !== JSON.stringify(expectedCanonical)
  )
    diagnostics.add(
      "CANONICAL_SOURCE_SET_INVALID",
      "meta.canonicalSources",
      "exact D-079 source set required",
    );
  if (meta.namespace !== "holyparser")
    diagnostics.add(
      "NAMESPACE_INVALID",
      "meta.namespace",
      "holyparser required",
    );
  if (meta.artifactPolicy !== "COMMITTED_GENERATED")
    diagnostics.add(
      "ARTIFACT_POLICY_INVALID",
      "meta.artifactPolicy",
      "committed generated artifacts required",
    );
  const expectedGenerated = [
    "packages/design-tokens/generated/tokens.css",
    "packages/design-tokens/generated/tokens.generated.ts",
  ];
  if (
    JSON.stringify(meta.generatedArtifacts) !==
    JSON.stringify(expectedGenerated)
  )
    diagnostics.add(
      "GENERATED_ARTIFACT_SET_INVALID",
      "meta.generatedArtifacts",
      "exact D-079 artifact set required",
    );
  validateSortedUnique(
    meta.compatibilityAliases.map((alias) => ({ id: alias.cssName })),
    diagnostics,
    "meta.compatibilityAliases",
  );
  if (!Array.isArray(meta.rawValueScanner?.exceptions))
    diagnostics.add(
      "EXCEPTION_REGISTRY_INVALID",
      "meta.rawValueScanner.exceptions",
      "expected array",
    );
}

function validateSupport(source, tokensById, diagnostics) {
  validateSupportOrder(source, diagnostics);
  expectFields(
    source.contrast,
    ["pairs", "prohibitions", "scrimComposites"],
    ["pairs", "prohibitions", "scrimComposites"],
    diagnostics,
    "contrast",
  );
  expectFields(
    source.chart,
    [
      "capacity",
      "overflowError",
      "categorical",
      "sequential",
      "diverging",
      "semantic",
      "emphasis",
    ],
    [
      "capacity",
      "overflowError",
      "categorical",
      "sequential",
      "diverging",
      "semantic",
      "emphasis",
    ],
    diagnostics,
    "chart",
  );
  expectFields(
    source.status,
    ["presentations", "forcedColors", "systemColorAllowlist"],
    ["presentations", "forcedColors", "systemColorAllowlist"],
    diagnostics,
    "status",
  );
  for (const [index, record] of (source.contrast.pairs ?? []).entries())
    expectFields(
      record,
      ["id", "foregrounds", "backgrounds", "usage", "threshold"],
      ["id", "foregrounds", "backgrounds", "usage", "threshold"],
      diagnostics,
      `contrast.pairs[${index}]`,
    );
  for (const [index, record] of (source.contrast.prohibitions ?? []).entries())
    expectFields(
      record,
      ["id", "rule"],
      ["id", "rule"],
      diagnostics,
      `contrast.prohibitions[${index}]`,
    );
  for (const [index, record] of (
    source.contrast.scrimComposites ?? []
  ).entries())
    expectFields(
      record,
      ["id", "scrim", "backgrounds", "contentSurface"],
      ["id", "scrim", "backgrounds", "contentSurface"],
      diagnostics,
      `contrast.scrimComposites[${index}]`,
    );
  for (const [index, record] of (source.chart.categorical ?? []).entries())
    expectFields(
      record,
      ["id", "light", "dark", "marker", "dash"],
      ["id", "light", "dark", "marker", "dash"],
      diagnostics,
      `chart.categorical[${index}]`,
    );
  expectFields(
    source.chart.sequential,
    ["id", "light", "dark", "constraints"],
    ["id", "light", "dark", "constraints"],
    diagnostics,
    "chart.sequential",
  );
  expectFields(
    source.chart.diverging,
    ["id", "order", "light", "dark", "constraints"],
    ["id", "order", "light", "dark", "constraints"],
    diagnostics,
    "chart.diverging",
  );
  for (const [index, record] of (source.chart.semantic ?? []).entries())
    expectFields(
      record,
      ["id", "color", "marker", "dash", "label"],
      ["id", "color", "marker", "dash", "label"],
      diagnostics,
      `chart.semantic[${index}]`,
    );
  for (const [index, record] of (source.chart.emphasis ?? []).entries())
    expectFields(
      record,
      ["id", "opacity", "strokeWidth", "marker"],
      ["id", "opacity", "strokeWidth", "marker"],
      diagnostics,
      `chart.emphasis[${index}]`,
    );
  for (const [index, record] of (source.status.presentations ?? []).entries())
    expectFields(
      record,
      [
        "id",
        "domainState",
        "color",
        "labelKey",
        "icon",
        "marker",
        "descriptionKey",
        "pattern",
      ],
      [
        "id",
        "domainState",
        "color",
        "labelKey",
        "icon",
        "marker",
        "descriptionKey",
        "pattern",
      ],
      diagnostics,
      `status.presentations[${index}]`,
    );
  for (const [index, record] of (source.status.forcedColors ?? []).entries())
    expectFields(
      record,
      ["id", "roles", "systemColors", "presentation"],
      ["id", "roles", "systemColors", "presentation"],
      diagnostics,
      `status.forcedColors[${index}]`,
    );
  for (const [name, records] of Object.entries({
    pairs: source.contrast.pairs,
    prohibitions: source.contrast.prohibitions,
    scrimComposites: source.contrast.scrimComposites,
    categorical: source.chart.categorical,
    semantic: source.chart.semantic,
    emphasis: source.chart.emphasis,
    presentations: source.status.presentations,
    forcedColors: source.status.forcedColors,
  })) {
    if (
      Array.isArray(records) &&
      records.length > source.meta.bounds.maxSupportRecords
    )
      diagnostics.add(
        "SUPPORT_RECORD_LIMIT_EXCEEDED",
        name,
        `maximum ${source.meta.bounds.maxSupportRecords}`,
      );
  }
  for (const [index, alias] of source.meta.compatibilityAliases.entries()) {
    expectFields(
      alias,
      ["cssName", "target"],
      ["cssName", "target"],
      diagnostics,
      `meta.compatibilityAliases[${index}]`,
    );
    if (!/^--[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias.cssName))
      diagnostics.add(
        "INVALID_COMPATIBILITY_ALIAS",
        `meta.compatibilityAliases[${index}].cssName`,
        "exact CSS custom property required",
      );
    const target = tokensById.get(alias.target);
    if (!target)
      diagnostics.add(
        "UNKNOWN_COMPATIBILITY_TARGET",
        `meta.compatibilityAliases[${index}].target`,
        alias.target,
      );
    else if (target.lifecycle !== "active")
      diagnostics.add(
        "NON_CURRENT_COMPATIBILITY_TARGET",
        `meta.compatibilityAliases[${index}].target`,
        alias.target,
      );
  }
  if (
    source.chart.capacity !== 8 ||
    source.chart.overflowError !== "CHART_SERIES_CAPACITY_EXCEEDED"
  )
    diagnostics.add(
      "CHART_CAPACITY_INVALID",
      "chart",
      "capacity 8 and typed overflow are required",
    );
  const tuples = new Set();
  for (const series of source.chart.categorical ?? []) {
    if (!HEX.test(series.light) || !HEX.test(series.dark))
      diagnostics.add("INVALID_COLOR", series.id, "invalid chart color");
    const tuple = `${series.light}|${series.dark}|${series.marker}|${series.dash}`;
    if (tuples.has(tuple))
      diagnostics.add(
        "DUPLICATE_CHART_TUPLE",
        series.id,
        "categorical tuple must be unique",
      );
    tuples.add(tuple);
  }
  if (tuples.size !== 8)
    diagnostics.add(
      "CHART_SERIES_INCOMPLETE",
      "chart.categorical",
      "exactly eight unique tuples required",
    );
  const expectedSystemColors = JSON.stringify(SYSTEM_COLORS);
  if (
    JSON.stringify(source.status.systemColorAllowlist) !== expectedSystemColors
  )
    diagnostics.add(
      "SYSTEM_COLOR_ALLOWLIST_INVALID",
      "status.systemColorAllowlist",
      "closed D-087 allowlist required",
    );
  for (const mapping of source.status.forcedColors ?? []) {
    for (const value of mapping.systemColors ?? [])
      if (!SYSTEM_COLORS.includes(value))
        diagnostics.add("SYSTEM_COLOR_VALUE_INVALID", mapping.id, value);
  }
  for (const presentation of source.status.presentations ?? []) {
    for (const field of [
      "color",
      "labelKey",
      "icon",
      "marker",
      "descriptionKey",
      "pattern",
    ])
      if (!presentation[field])
        diagnostics.add(
          "STATUS_REDUNDANCY_MISSING",
          `${presentation.id}.${field}`,
          "field is required",
        );
    if (!tokensById.has(presentation.color))
      diagnostics.add(
        "UNKNOWN_STATUS_COLOR",
        presentation.id,
        presentation.color,
      );
  }
  for (const pair of source.contrast.pairs ?? []) {
    for (const id of [...pair.foregrounds, ...pair.backgrounds])
      if (!tokensById.has(id))
        diagnostics.add("UNKNOWN_CONTRAST_TOKEN", pair.id, id);
  }
  if (
    tokensById.get("semantic.color.financial.positive")?.light ===
      "{primitive.color.brand.blue}" ||
    tokensById.get("semantic.color.financial.positive")?.dark ===
      "{primitive.color.brand.blue}"
  )
    diagnostics.add(
      "SEMANTIC_MISUSE",
      "semantic.color.financial.positive",
      "brand blue cannot mean positive",
    );
}

export function validateInMemory(source) {
  const diagnostics = new Diagnostics(APPROVED_BOUNDS.maxDiagnostics);
  if (!source.meta?.bounds)
    diagnostics.add("MISSING_BOUNDS", "meta.bounds", "bounds are required");
  else {
    const state = { nodes: 0 };
    for (const [name, value] of Object.entries(source))
      countJson(value, APPROVED_BOUNDS, diagnostics, name, state);
    validateMeta(source.meta, diagnostics);
    const tokensById = validateTokenRecords(source, diagnostics);
    validateSupport(source, tokensById, diagnostics);
  }
  diagnostics.throwIfAny();
  return true;
}

export async function loadAndValidate(options = {}) {
  const diagnostics = new Diagnostics(200);
  const preliminary = await readJsonBounded(
    resolve(packageRoot, "src/token-set.meta.json"),
    1048576,
    diagnostics,
  );
  if (!preliminary.value) diagnostics.throwIfAny();
  // Security/resource limits are implementation constants. The untrusted
  // metadata copy is validated later but can never expand what is read or
  // traversed before that validation completes.
  const bounds = APPROVED_BOUNDS;
  const loaded = new Map();
  let aggregateBytes = 0;
  for (const relative of SOURCE_RELATIVE_PATHS) {
    const result = await readJsonBounded(
      resolve(packageRoot, relative),
      bounds.maxSourceFileBytes,
      diagnostics,
    );
    aggregateBytes += result.bytes.length;
    loaded.set(relative, result);
  }
  if (aggregateBytes > bounds.maxSourceAggregateBytes)
    diagnostics.add(
      "SOURCE_AGGREGATE_TOO_LARGE",
      "source-set",
      `maximum ${bounds.maxSourceAggregateBytes}`,
    );
  const source = {
    schema: loaded.get("schema/design-tokens.schema.json").value,
    chart: loaded.get("src/chart-encodings.source.json").value,
    contrast: loaded.get("src/contrast-pairs.source.json").value,
    status: loaded.get("src/status-presentations.source.json").value,
    meta: loaded.get("src/token-set.meta.json").value,
    tokens: loaded.get("src/tokens.source.json").value,
  };
  if (Object.values(source).some((value) => value == null))
    diagnostics.throwIfAny();
  const state = { nodes: 0 };
  for (const [name, value] of Object.entries(source))
    countJson(value, bounds, diagnostics, name, state);
  validateMeta(source.meta, diagnostics);
  const tokensById = validateTokenRecords(source, diagnostics);
  validateSupport(source, tokensById, diagnostics);
  if (options.requireCanonicalSourceBytes) {
    for (const [relative, loadedFile] of loaded) {
      const text = loadedFile.text;
      if (
        text.startsWith("\uFEFF") ||
        text.includes("\r") ||
        !text.endsWith("\n") ||
        text.endsWith("\n\n") ||
        text
          .slice(0, -1)
          .split("\n")
          .some(
            (line) =>
              /[\t ]$/.test(line) ||
              (/^ +/.test(line) && !/^(?:  )+\S/.test(line)),
          )
      )
        diagnostics.add(
          "NON_CANONICAL_SERIALIZATION",
          relative,
          "require UTF-8 without BOM, LF, two-space indentation, no trailing whitespace, and one final newline",
        );
    }
  }
  diagnostics.throwIfAny();
  return { source, tokensById, loaded, aggregateBytes };
}

export function tokenIdToCssName(id) {
  return `--hp-${id.replaceAll(".", "-")}`;
}

function quoteFontFamily(family) {
  return /^[a-z][a-z0-9-]*$/i.test(family)
    ? family
    : `"${family.replaceAll('"', '\\"')}"`;
}

export function toCssValue(type, value) {
  switch (type) {
    case "dimension":
      return `${value.amount}${value.unit}`;
    case "duration":
      return `${value.milliseconds}ms`;
    case "cubicBezier":
      return `cubic-bezier(${value.x1}, ${value.y1}, ${value.x2}, ${value.y2})`;
    case "fontFamily":
      return value.map(quoteFontFamily).join(", ");
    case "shadow":
      return value.length === 0
        ? "none"
        : value
            .map(
              (layer) =>
                `${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${layer.color}`,
            )
            .join(", ");
    case "number":
      return value;
    default:
      return String(value);
  }
}

export function resolveAll(source, tokensById, theme) {
  const diagnostics = new Diagnostics(source.meta.bounds.maxDiagnostics);
  const resolved = source.tokens.tokens.map((token) => ({
    ...token,
    resolved: resolveTokenValue(token.id, theme, tokensById, diagnostics),
  }));
  diagnostics.throwIfAny();
  return resolved;
}

export function parseHex(hex) {
  const raw = hex.slice(1);
  const rgba = raw.length === 8 ? raw : `${raw}FF`;
  return {
    r: Number.parseInt(rgba.slice(0, 2), 16),
    g: Number.parseInt(rgba.slice(2, 4), 16),
    b: Number.parseInt(rgba.slice(4, 6), 16),
    a: Number.parseInt(rgba.slice(6, 8), 16) / 255,
  };
}

export function composite(foreground, background) {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  const a = fg.a + bg.a * (1 - fg.a);
  const channel = (f, b) => Math.round((f * fg.a + b * bg.a * (1 - fg.a)) / a);
  return `#${[channel(fg.r, bg.r), channel(fg.g, bg.g), channel(fg.b, bg.b)].map((value) => value.toString(16).padStart(2, "0").toUpperCase()).join("")}`;
}

function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  const linear = (channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(first, second) {
  const l1 = luminance(first);
  const l2 = luminance(second);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function contrastReport(source, tokensById) {
  const rows = [];
  for (const theme of ["LIGHT", "DARK"]) {
    const resolved = new Map(
      resolveAll(source, tokensById, theme).map((token) => [
        token.id,
        token.resolved,
      ]),
    );
    for (const pair of source.contrast.pairs) {
      for (const foreground of pair.foregrounds) {
        for (const background of pair.backgrounds) {
          const ratio = contrastRatio(
            resolved.get(foreground),
            resolved.get(background),
          );
          rows.push({
            theme,
            pair: pair.id,
            foreground,
            background,
            threshold: Number(pair.threshold),
            ratio: Number(ratio.toFixed(3)),
            pass: ratio >= Number(pair.threshold),
          });
        }
      }
    }
  }
  return rows;
}

export function getCategoricalSeries(source, index) {
  if (!Number.isInteger(index) || index < 1 || index > source.chart.capacity) {
    return { ok: false, error: source.chart.overflowError };
  }
  return { ok: true, value: source.chart.categorical[index - 1] };
}

export function classifyTokenSetChange(previous, next) {
  const previousById = new Map(
    previous.tokens.map((token) => [token.id, token]),
  );
  const nextById = new Map(next.tokens.map((token) => [token.id, token]));
  let required = "none";
  const reasons = [];
  for (const [id, oldToken] of previousById) {
    const newToken = nextById.get(id);
    if (!newToken) {
      required = "major";
      reasons.push({ id, reason: "removed" });
      continue;
    }
    if (
      oldToken.type !== newToken.type ||
      oldToken.description !== newToken.description ||
      oldToken.family !== newToken.family ||
      oldToken.accessibilityRole !== newToken.accessibilityRole
    ) {
      required = "major";
      reasons.push({ id, reason: "semantic-or-type-change" });
    } else if (
      oldToken.lifecycle !== newToken.lifecycle ||
      oldToken.deprecatedIn !== newToken.deprecatedIn ||
      oldToken.replacement !== newToken.replacement
    ) {
      if (required !== "major") required = "minor";
      reasons.push({ id, reason: "deprecation-or-compatible-alias" });
    } else if (JSON.stringify(oldToken) !== JSON.stringify(newToken)) {
      if (required === "none") required = "patch";
      reasons.push({ id, reason: "compatible-value-or-lifecycle-change" });
    }
  }
  for (const id of nextById.keys()) {
    if (!previousById.has(id)) {
      if (required !== "major") required = "minor";
      reasons.push({ id, reason: "added" });
    }
  }
  return { required, reasons };
}

export function classifySchemaChange(changeKinds) {
  const kinds = new Set(changeKinds);
  if (
    [
      "required-field",
      "grammar-break",
      "type-break",
      "interpretation-break",
    ].some((kind) => kinds.has(kind))
  )
    return "major";
  if (["optional-field", "additional-enum"].some((kind) => kinds.has(kind)))
    return "minor";
  if (
    ["clarification", "reject-already-invalid"].some((kind) => kinds.has(kind))
  )
    return "patch";
  return "none";
}

export function enforceTokenSetVersion(
  previous,
  next,
  previousVersion,
  nextVersion,
) {
  const change = classifyTokenSetChange(previous, next);
  const [previousMajor, previousMinor, previousPatch] = previousVersion
    .split(".")
    .map(Number);
  const [nextMajor, nextMinor, nextPatch] = nextVersion.split(".").map(Number);
  const bump =
    nextMajor > previousMajor
      ? "major"
      : nextMajor === previousMajor && nextMinor > previousMinor
        ? "minor"
        : nextMajor === previousMajor &&
            nextMinor === previousMinor &&
            nextPatch > previousPatch
          ? "patch"
          : "none";
  const rank = { none: 0, patch: 1, minor: 2, major: 3 };
  if (rank[bump] < rank[change.required])
    throw new Error(`TOKEN_SET_VERSION_BUMP_REQUIRED ${change.required}`);
  return { required: change.required, actual: bump };
}

export function validateRollbackBundle(bundle, initial = false) {
  const required = initial
    ? [
        "legacyTokensCss",
        "packageExport",
        "globalsBridge",
        "canonicalSetRemoved",
      ]
    : [
        "metadata",
        "tokens",
        "support",
        "artifacts",
        "manifest",
        "aliases",
        "revision",
      ];
  for (const field of required)
    if (!(field in bundle))
      throw new Error(`ROLLBACK_BUNDLE_INCOMPLETE ${field}`);
  if (initial && bundle.canonicalSetRemoved !== true)
    throw new Error("ROLLBACK_BUNDLE_INCOMPLETE canonicalSetRemoved");
  return true;
}

export function validateAliasWindow(alias, releaseVersion, asOfDate) {
  const minorCount =
    Number(releaseVersion.split(".")[1]) -
    Number(alias.introducedVersion.split(".")[1]);
  const elapsed = Math.floor(
    (Date.parse(asOfDate) - Date.parse(alias.createdDate)) / 86400000,
  );
  return {
    removable: minorCount >= 2 && elapsed >= 90,
    publicationBlocked:
      elapsed >= 180 &&
      !(minorCount >= 2 && elapsed >= 90) &&
      !alias.extensionApproved,
  };
}

const RAW_GOVERNED = {
  color:
    /^(?:accent-color|background|background-color|border(?:-(?:block|inline|top|right|bottom|left))?-color|box-shadow|caret-color|color|fill|outline|outline-color|stroke|text-decoration-color)$/,
  spacing:
    /^(?:gap|column-gap|row-gap|margin(?:-(?:block|inline|top|right|bottom|left))?|padding(?:-(?:block|inline|top|right|bottom|left))?)$/,
  radius: /^border(?:-(?:top|right|bottom|left)-(?:left|right))?-radius$/,
  shadow: /^(?:box-shadow|text-shadow)$/,
  motion:
    /^(?:animation|animation-delay|animation-duration|animation-timing-function|transition|transition-delay|transition-duration|transition-timing-function)$/,
  typography:
    /^(?:font-family|font-size|font-weight|letter-spacing|line-height)$/,
  layer: /^z-index$/,
};
const RAW_COLOR =
  /(?:#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\()/i;
const RAW_DIMENSION =
  /(?:^|[\s,(])(?:-?(?:\d+\.?\d*|\.\d+))(?:px|rem|em|ms|s)\b/i;

function technicalRawExclusion(property, value) {
  const trimmed = value.trim();
  if (/^(?:0|0px|0rem|0em|0ms|0s)(?:\s+0(?:px|rem|em|ms|s)?)*$/.test(trimmed))
    return true;
  const withoutVariables = trimmed.replace(/var\([^)]*\)/g, "").trim();
  if (
    trimmed.includes("var(") &&
    !RAW_COLOR.test(trimmed) &&
    !RAW_DIMENSION.test(withoutVariables) &&
    !/(?:cubic-bezier|steps)\s*\(/i.test(withoutVariables) &&
    !/\b(?:ease|ease-in|ease-out|ease-in-out|linear)\b/i.test(withoutVariables)
  )
    return true;
  if (
    trimmed === "0.01ms !important" &&
    ["animation-duration", "transition-duration"].includes(property)
  )
    return true;
  if (property === "border-radius" && trimmed === "50%") return true;
  if (
    [
      "inherit",
      "initial",
      "none",
      "normal",
      "transparent",
      "currentColor",
      "auto",
    ].includes(trimmed)
  )
    return true;
  return false;
}

export function validateRawExceptions(exceptions, today = "2026-08-16") {
  const diagnostics = new Diagnostics(200);
  const required = [
    "id",
    "file",
    "property",
    "literal",
    "reason",
    "owner",
    "ownerRole",
    "approver",
    "approverRoles",
    "reference",
    "createdDate",
    "expiresDate",
    "cleanupCriterion",
    "tokenCandidate",
  ];
  for (const [index, exception] of exceptions.entries()) {
    const location = `exceptions[${index}]`;
    for (const field of required)
      if (!exception[field])
        diagnostics.add(
          "INVALID_EXCEPTION",
          `${location}.${field}`,
          "field is required",
        );
    if (/[*?[\]{}]/.test(exception.file ?? "") || exception.file?.endsWith("/"))
      diagnostics.add("BROAD_EXCEPTION", location, "file must be exact");
    if (!/^raw\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(exception.id ?? ""))
      diagnostics.add(
        "INVALID_EXCEPTION_ID",
        `${location}.id`,
        "stable lowercase ID required",
      );
    if (!/^[a-z-]+$/.test(exception.property ?? ""))
      diagnostics.add(
        "INVALID_EXCEPTION_PROPERTY",
        `${location}.property`,
        "exact CSS property required",
      );
    if ((exception.approverRoles ?? []).includes("Product Owner"))
      diagnostics.add(
        "INVALID_EXCEPTION_APPROVER",
        `${location}.approverRoles`,
        "Product Owner is not an ordinary escape-hatch approver",
      );
    if (Date.parse(exception.expiresDate) <= Date.parse(today))
      diagnostics.add("EXPIRED_EXCEPTION", location, "exception has expired");
    const lifetime =
      (Date.parse(exception.expiresDate) - Date.parse(exception.createdDate)) /
      86400000;
    if (lifetime > 30)
      diagnostics.add(
        "EXCEPTION_LIFETIME_EXCEEDED",
        location,
        "initial lifetime maximum is 30 days",
      );
    if ((exception.renewalCount ?? 0) > 1)
      diagnostics.add(
        "EXCEPTION_RENEWAL_EXCEEDED",
        location,
        "only one renewal is allowed",
      );
    if (exception.renewalCount === 1) {
      if (!exception.originalCreatedDate)
        diagnostics.add(
          "INVALID_EXCEPTION_RENEWAL",
          location,
          "originalCreatedDate is required",
        );
      const aggregate =
        (Date.parse(exception.expiresDate) -
          Date.parse(exception.originalCreatedDate)) /
        86400000;
      if (aggregate > 60)
        diagnostics.add(
          "EXCEPTION_AGGREGATE_LIFETIME_EXCEEDED",
          location,
          "maximum aggregate lifetime is 60 days",
        );
    }
  }
  diagnostics.throwIfAny();
  return true;
}

export function scanCssText(css, file, exceptions = []) {
  const findings = [];
  const used = new Set();
  const declaration = /(--[a-z][a-z0-9-]*|[a-z][a-z-]*)\s*:\s*([^;{}]+);/gi;
  const layoutOwnedProperties = new Set([
    "--content-max",
    "--layout-app-content-padding",
    "--layout-auth-card-padding",
    "--sidebar-collapsed",
    "--sidebar-expanded",
  ]);
  let match;
  while ((match = declaration.exec(css))) {
    const [, matchedProperty, rawValue] = match;
    const property = matchedProperty.startsWith("--")
      ? matchedProperty
      : matchedProperty.toLowerCase();
    const value = rawValue.trim();
    let violation = false;
    if (
      property.startsWith("--") &&
      (RAW_COLOR.test(value) || RAW_DIMENSION.test(value)) &&
      !layoutOwnedProperties.has(property)
    )
      violation = true;
    if (
      property.startsWith("--") &&
      layoutOwnedProperties.has(property) &&
      RAW_COLOR.test(value)
    )
      violation = true;
    if (RAW_GOVERNED.color.test(property)) {
      const safeColorValue =
        /^(?:var\(--[a-z0-9-]+\)|currentColor|transparent|inherit|initial|none)$/i.test(
          value,
        );
      if (!safeColorValue) violation = true;
    }
    if (
      (RAW_GOVERNED.spacing.test(property) ||
        RAW_GOVERNED.radius.test(property) ||
        RAW_GOVERNED.motion.test(property) ||
        RAW_GOVERNED.typography.test(property)) &&
      RAW_DIMENSION.test(value)
    )
      violation = true;
    if (
      (RAW_GOVERNED.spacing.test(property) ||
        RAW_GOVERNED.radius.test(property) ||
        RAW_GOVERNED.typography.test(property)) &&
      /%/.test(value)
    )
      violation = true;
    if (
      RAW_GOVERNED.shadow.test(property) &&
      !/^(?:var\(--[a-z0-9-]+\)|none|inherit|initial)$/i.test(value)
    )
      violation = true;
    if (property === "font-family" && !/^var\(--[a-z0-9-]+\)$/i.test(value))
      violation = true;
    if (property === "font-weight" && !/^var\(--[a-z0-9-]+\)$/i.test(value))
      violation = true;
    if (
      RAW_GOVERNED.typography.test(property) &&
      ["font-weight", "line-height", "letter-spacing"].includes(property) &&
      /^-?\d/.test(value)
    )
      violation = true;
    if (RAW_GOVERNED.layer.test(property) && /^-?\d+$/.test(value))
      violation = true;
    if (
      RAW_GOVERNED.motion.test(property) &&
      (/(?:cubic-bezier|steps)\s*\(/i.test(value) ||
        /\b(?:ease|ease-in|ease-out|ease-in-out|linear)\b/i.test(value))
    )
      violation = true;
    if (!violation || technicalRawExclusion(property, value)) continue;
    const exception = exceptions.find(
      (item) =>
        item.file === file &&
        item.property === property &&
        item.literal === value,
    );
    if (exception) used.add(exception.id);
    else
      findings.push({
        code: "RAW_VALUE_VIOLATION",
        file,
        line: css.slice(0, match.index).split("\n").length,
        property,
      });
  }
  for (const exception of exceptions.filter((item) => item.file === file)) {
    if (!used.has(exception.id))
      findings.push({
        code: "UNUSED_OR_ORPHAN_EXCEPTION",
        file,
        line: 0,
        property: exception.property,
      });
  }
  return findings;
}

export async function canonicalizeSources() {
  const diagnostics = new Diagnostics(200);
  for (const relative of SOURCE_RELATIVE_PATHS) {
    const path = resolve(packageRoot, relative);
    const result = await readJsonBounded(path, 1048576, diagnostics);
    if (result.value != null)
      await writeFile(path, canonicalJson(result.value));
  }
  diagnostics.throwIfAny();
}
