import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyTokenSetChange,
  classifySchemaChange,
  enforceTokenSetVersion,
  scanCssText,
  validateAliasWindow,
  validateInMemory,
  validateRawExceptions,
  validateRollbackBundle,
} from "../scripts/lib.mjs";
import { canonicalSource, colorToken, expectCode } from "./helpers.mjs";

function validException(overrides = {}) {
  return {
    id: "raw.d1.001",
    file: "apps/web/src/app/globals.css",
    property: "padding",
    literal: "12px",
    reason: "Temporary migration bridge.",
    owner: "frontend-architecture",
    ownerRole: "Frontend Architecture",
    approver: "design-owner",
    approverRoles: ["Design"],
    reference: "D1-001",
    createdDate: "2026-08-16",
    expiresDate: "2026-09-15",
    cleanupCriterion: "Replace with semantic spacing token.",
    tokenCandidate: "semantic.spacing.12",
    ...overrides,
  };
}

test("property-aware scanner detects raw color syntaxes", () => {
  for (const value of [
    "#fff",
    "rgb(1 2 3)",
    "hsl(0 0% 0%)",
    "oklch(50% 0.2 20)",
  ]) {
    assert.equal(
      scanCssText(`.x { color: ${value}; }`, "x.css").length,
      1,
      value,
    );
  }
});

test("scanner rejects named and case-variant raw colors", () => {
  assert.equal(scanCssText(".x { color: red; }", "x.css").length, 1);
  assert.equal(scanCssText(".x { COLOR: #fff; }", "x.css").length, 1);
});

test("scanner detects governed spacing, radius, motion, typography and layer values", () => {
  const css =
    ".x { padding: 12px; border-radius: 8px; transition: color 120ms ease; font-size: 14px; z-index: 30; }";
  assert.deepEqual(
    scanCssText(css, "x.css").map((item) => item.property),
    ["padding", "border-radius", "transition", "font-size", "z-index"],
  );
});

test("scanner closes shadow, font, easing, percentage and technical-constant bypasses", () => {
  const cases = [
    ".x { box-shadow: 0 1px 2px var(--hp-semantic-color-text-primary); }",
    ".x { font-family: Arial, sans-serif; }",
    ".x { font-weight: bold; }",
    ".x { transition: color var(--hp-semantic-motion-duration-fast) cubic-bezier(.2, 0, 0, 1); }",
    ".x { padding: 1%; }",
    ".x { padding: 0.01ms !important; }",
  ];
  for (const css of cases)
    assert.equal(scanCssText(css, "x.css").length, 1, css);
  assert.deepEqual(scanCssText(".x { border-radius: 50%; }", "x.css"), []);
});

test("scanner permits variables and narrow technical constants", () => {
  const css =
    ".x { padding: var(--hp-semantic-spacing-12); width: 73%; transition-duration: 0.01ms !important; }";
  assert.deepEqual(scanCssText(css, "x.css"), []);
});

test("consumer custom properties cannot bypass raw-value governance", () => {
  assert.equal(scanCssText(":root { --evil-color: #fff; }", "x.css").length, 1);
  assert.equal(
    scanCssText(
      ":root { --layout-app-content-padding: clamp(1.5rem, 4vw, 3.5rem); }",
      "x.css",
    ).length,
    0,
  );
});

test("an exact current exception suppresses exactly one declaration", () => {
  const exception = validException({ file: "x.css" });
  assert.equal(validateRawExceptions([exception]), true);
  assert.deepEqual(
    scanCssText(".x { padding: 12px; }", "x.css", [exception]),
    [],
  );
});

test("expired exception is rejected", () => {
  expectCode(
    () =>
      validateRawExceptions([validException({ expiresDate: "2026-08-16" })]),
    "EXPIRED_EXCEPTION",
  );
});

test("widened or broad exception is rejected", () => {
  expectCode(
    () => validateRawExceptions([validException({ file: "apps/web/**" })]),
    "BROAD_EXCEPTION",
  );
});

test("exception longer than 30 days is rejected", () => {
  expectCode(
    () =>
      validateRawExceptions([validException({ expiresDate: "2026-10-01" })]),
    "EXCEPTION_LIFETIME_EXCEEDED",
  );
});

test("one bounded renewal is allowed and a second is rejected", () => {
  const renewal = validException({
    createdDate: "2026-09-01",
    expiresDate: "2026-09-30",
    renewalCount: 1,
    originalCreatedDate: "2026-08-16",
  });
  assert.equal(validateRawExceptions([renewal]), true);
  expectCode(
    () => validateRawExceptions([{ ...renewal, renewalCount: 2 }]),
    "EXCEPTION_RENEWAL_EXCEEDED",
  );
});

test("Product Owner cannot be an ordinary exception approver", () => {
  expectCode(
    () =>
      validateRawExceptions([
        validException({ approverRoles: ["Product Owner"] }),
      ]),
    "INVALID_EXCEPTION_APPROVER",
  );
});

test("unused and orphaned exception fails", () => {
  const findings = scanCssText(
    ".x { padding: var(--hp-semantic-spacing-12); }",
    "x.css",
    [validException({ file: "x.css" })],
  );
  assert.equal(findings[0].code, "UNUSED_OR_ORPHAN_EXCEPTION");
});

test("additive token change is minor", () => {
  const previous = { tokens: [colorToken("primitive.test.a")] };
  const next = { tokens: [...previous.tokens, colorToken("primitive.test.b")] };
  assert.equal(classifyTokenSetChange(previous, next).required, "minor");
  assert.deepEqual(enforceTokenSetVersion(previous, next, "1.0.0", "1.1.0"), {
    required: "minor",
    actual: "minor",
  });
});

test("schema change classifier keeps schemaVersion independent", () => {
  assert.equal(classifySchemaChange(["clarification"]), "patch");
  assert.equal(classifySchemaChange(["optional-field"]), "minor");
  assert.equal(classifySchemaChange(["required-field"]), "major");
  assert.equal(classifySchemaChange([]), "none");
});

test("raw-value correction is patch but semantic meaning change is major", () => {
  const oldToken = colorToken("primitive.test.a", "#123456");
  const corrected = colorToken("primitive.test.a", "#123457");
  assert.equal(
    classifyTokenSetChange({ tokens: [oldToken] }, { tokens: [corrected] })
      .required,
    "patch",
  );
  const changedMeaning = {
    ...corrected,
    description: "Different semantic meaning.",
  };
  assert.equal(
    classifyTokenSetChange({ tokens: [oldToken] }, { tokens: [changedMeaning] })
      .required,
    "major",
  );
  expectCode(
    () =>
      enforceTokenSetVersion(
        { tokens: [oldToken] },
        { tokens: [changedMeaning] },
        "1.0.0",
        "1.0.1",
      ),
    "TOKEN_SET_VERSION_BUMP_REQUIRED",
  );
});

test("deprecation is minor and unchanged version is rejected", () => {
  const oldToken = colorToken("primitive.test.a");
  const deprecated = {
    ...oldToken,
    lifecycle: "deprecated",
    deprecatedIn: "1.1.0",
    replacement: "primitive.test.b",
  };
  assert.equal(
    classifyTokenSetChange(
      { tokens: [oldToken] },
      { tokens: [deprecated, colorToken("primitive.test.b")] },
    ).required,
    "minor",
  );
  expectCode(
    () =>
      enforceTokenSetVersion(
        { tokens: [oldToken] },
        { tokens: [deprecated, colorToken("primitive.test.b")] },
        "1.0.0",
        "1.0.0",
      ),
    "TOKEN_SET_VERSION_BUMP_REQUIRED",
  );
});

test("compatibility alias requires both two minor releases and 90 days", () => {
  const alias = {
    introducedVersion: "1.0.0",
    createdDate: "2026-01-01",
    extensionApproved: false,
  };
  assert.equal(
    validateAliasWindow(alias, "1.1.0", "2026-05-01").removable,
    false,
  );
  assert.equal(
    validateAliasWindow(alias, "1.2.0", "2026-02-01").removable,
    false,
  );
  assert.equal(
    validateAliasWindow(alias, "1.2.0", "2026-05-01").removable,
    true,
  );
  assert.equal(
    validateAliasWindow(alias, "1.1.0", "2026-07-01").publicationBlocked,
    true,
  );
});

test("the initial compatibility-alias cohort is versioned and time-bounded", async () => {
  const source = await canonicalSource();
  assert.deepEqual(source.meta.compatibilityPolicy.initialAliasCohort, {
    introducedIn: "1.0.0",
    deprecatedIn: "1.0.0",
    createdDate: "2026-08-17",
    removeNotBeforeVersion: "2.0.0",
    removeNotBeforeDate: "2026-11-15",
    migrationNote:
      "Replace Phase 1 legacy CSS names with canonical --hp-* semantic properties before removal.",
  });
});

test("replacement chain longer than one fails", async () => {
  const source = await canonicalSource();
  const a = source.tokens.tokens.find(
    (token) => token.id === "primitive.color.brand.blue",
  );
  const b = source.tokens.tokens.find(
    (token) => token.id === "primitive.color.brand.cyan",
  );
  a.replacement = b.id;
  b.replacement = "primitive.color.brand.navy";
  expectCode(() => validateInMemory(source), "REPLACEMENT_CHAIN_EXCEEDED");
});

test("initial rollback bundle is explicit and complete", () => {
  assert.equal(
    validateRollbackBundle(
      {
        legacyTokensCss: "digest",
        packageExport: "./tokens.css",
        globalsBridge: "digest",
        canonicalSetRemoved: true,
      },
      true,
    ),
    true,
  );
  expectCode(
    () => validateRollbackBundle({ legacyTokensCss: "digest" }, true),
    "ROLLBACK_BUNDLE_INCOMPLETE",
  );
});

test("later rollback requires the atomic canonical bundle", () => {
  const bundle = {
    metadata: true,
    tokens: true,
    support: true,
    artifacts: true,
    manifest: true,
    aliases: true,
    revision: "1.0.0",
  };
  assert.equal(validateRollbackBundle(bundle), true);
  delete bundle.manifest;
  expectCode(
    () => validateRollbackBundle(bundle),
    "ROLLBACK_BUNDLE_INCOMPLETE",
  );
});
