import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  Diagnostics,
  readJsonBounded,
  validateInMemory,
} from "../scripts/lib.mjs";
import { canonicalSource, colorToken, expectCode } from "./helpers.mjs";

test("complete canonical source validates", async () => {
  assert.equal(validateInMemory(await canonicalSource()), true);
});

test("malformed JSON fails closed without payload echo", async () => {
  const directory = await mkdtemp(join(tmpdir(), "d1-json-"));
  const path = join(directory, "malformed.json");
  await writeFile(path, '{"secret":"do-not-echo"');
  const diagnostics = new Diagnostics();
  await readJsonBounded(path, 1024, diagnostics);
  assert.throws(() => diagnostics.throwIfAny(), /MALFORMED_JSON/);
  assert.doesNotMatch(diagnostics.items[0].message, /do-not-echo/);
});

test("invalid UTF-8 fails closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "d1-utf8-"));
  const path = join(directory, "invalid.json");
  await writeFile(path, Buffer.from([0xc3, 0x28]));
  const diagnostics = new Diagnostics();
  await readJsonBounded(path, 1024, diagnostics);
  assert.throws(() => diagnostics.throwIfAny(), /INVALID_UTF8/);
});

test("unknown token field is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens[0].rogue = true;
  expectCode(() => validateInMemory(source), "UNKNOWN_FIELD");
});

test("unknown tokens-source top-level field is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.rogue = true;
  expectCode(() => validateInMemory(source), "UNKNOWN_FIELD");
});

test("duplicate token ID is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens.splice(1, 0, structuredClone(source.tokens.tokens[0]));
  expectCode(() => validateInMemory(source), "DUPLICATE_ID");
});

test("unsorted token ID is rejected", async () => {
  const source = await canonicalSource();
  [source.tokens.tokens[0], source.tokens.tokens[1]] = [
    source.tokens.tokens[1],
    source.tokens.tokens[0],
  ];
  expectCode(() => validateInMemory(source), "UNSORTED_ID");
});

test("missing DARK resolution is rejected", async () => {
  const source = await canonicalSource();
  const token = source.tokens.tokens.find(
    (item) => item.id === "semantic.color.background.base",
  );
  delete token.dark;
  expectCode(() => validateInMemory(source), "THEME_PARITY_MISSING");
});

test("missing LIGHT resolution is rejected", async () => {
  const source = await canonicalSource();
  const token = source.tokens.tokens.find(
    (item) => item.id === "semantic.color.background.base",
  );
  delete token.light;
  expectCode(() => validateInMemory(source), "THEME_PARITY_MISSING");
});

test("circular alias is rejected", async () => {
  const source = await canonicalSource();
  const token = source.tokens.tokens.find(
    (item) => item.id === "semantic.color.action.primary",
  );
  token.dark = "{semantic.color.action.primary}";
  expectCode(() => validateInMemory(source), "ALIAS_CYCLE");
});

test("unknown alias is rejected", async () => {
  const source = await canonicalSource();
  const token = source.tokens.tokens.find(
    (item) => item.id === "semantic.color.action.primary",
  );
  token.dark = "{primitive.color.missing}";
  expectCode(() => validateInMemory(source), "UNKNOWN_ALIAS");
});

test("alias depth greater than eight is rejected", async () => {
  const source = await canonicalSource();
  const chain = Array.from({ length: 10 }, (_, index) =>
    colorToken(
      `primitive.color.chain.t${String(index).padStart(2, "0")}`,
      index === 9
        ? "#123456"
        : `{primitive.color.chain.t${String(index + 1).padStart(2, "0")}}`,
    ),
  );
  source.tokens.tokens.push(...chain);
  source.tokens.tokens.sort((a, b) => (a.id < b.id ? -1 : 1));
  expectCode(() => validateInMemory(source), "ALIAS_DEPTH_EXCEEDED");
});

test("cross-type alias is rejected", async () => {
  const source = await canonicalSource();
  const token = source.tokens.tokens.find(
    (item) => item.id === "semantic.spacing.0",
  );
  token.value = "{primitive.color.brand.blue}";
  expectCode(() => validateInMemory(source), "CROSS_TYPE_ALIAS");
});

test("duplicate generated CSS names are rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens.push(
    colorToken("primitive.collision.a-b.c"),
    colorToken("primitive.collision.a.b-c"),
  );
  source.tokens.tokens.sort((a, b) => (a.id < b.id ? -1 : 1));
  expectCode(() => validateInMemory(source), "DUPLICATE_CSS_NAME");
});

test("invalid color is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens[0].value = "rgb(1 2 3)";
  expectCode(() => validateInMemory(source), "INVALID_COLOR");
});

test("invalid dimension is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens.find((item) => item.id === "semantic.spacing.2").value =
    { amount: 0.5, unit: "rem" };
  expectCode(() => validateInMemory(source), "INVALID_DIMENSION");
});

test("scientific numeric notation is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens.find((item) => item.id === "semantic.opacity.08").value =
    "8e-2";
  expectCode(() => validateInMemory(source), "INVALID_NUMBER");
});

test("invalid easing is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens.find(
    (item) => item.id === "semantic.motion.easing.enter",
  ).value.x1 = "-0.1";
  expectCode(() => validateInMemory(source), "INVALID_EASING");
});

test("excessive shadow layers are rejected", async () => {
  const source = await canonicalSource();
  const token = source.tokens.tokens.find(
    (item) => item.id === "semantic.elevation.raised",
  );
  token.dark = Array.from({ length: 5 }, () => ({
    x: 0,
    y: 1,
    blur: 2,
    spread: 0,
    color: "#00000066",
  }));
  expectCode(() => validateInMemory(source), "INVALID_SHADOW");
});

test("excessive font stack is rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens.find(
    (item) => item.id === "semantic.typography.family.ui",
  ).value = Array.from({ length: 13 }, (_, index) => `Font ${index}`);
  expectCode(() => validateInMemory(source), "INVALID_FONT_STACK");
});

test("hostile CSS URL/import values are rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens.find(
    (item) => item.id === "semantic.typography.feature.tabular",
  ).value = "url(https://invalid.example/font)";
  expectCode(() => validateInMemory(source), "ARBITRARY_CSS_PROHIBITED");
});

test("control characters are rejected", async () => {
  const source = await canonicalSource();
  source.tokens.tokens[0].description = "hidden\u0000content";
  expectCode(() => validateInMemory(source), "CONTROL_CHARACTER");
});

test("canonical-token upper bound fails closed", async () => {
  const source = await canonicalSource();
  source.tokens.tokens = Array.from({ length: 2049 }, (_, index) =>
    colorToken(`primitive.test.t${String(index).padStart(4, "0")}`),
  );
  expectCode(() => validateInMemory(source), "TOKEN_LIMIT_EXCEEDED");
});

test("support-record upper bound fails closed", async () => {
  const source = await canonicalSource();
  source.contrast.prohibitions = Array.from({ length: 4097 }, (_, index) => ({
    id: `prohibition.test.t${String(index).padStart(4, "0")}`,
    rule: "Synthetic.",
  }));
  expectCode(() => validateInMemory(source), "SUPPORT_RECORD_LIMIT_EXCEEDED");
});

test("D-083 bounds cannot be weakened", async () => {
  const source = await canonicalSource();
  source.meta.bounds.maxAliasDepth = 9;
  expectCode(() => validateInMemory(source), "RESOURCE_BOUNDS_INVALID");
});

test("hostile metadata cannot expand the diagnostic resource bound", async () => {
  const source = await canonicalSource();
  source.meta.bounds.maxDiagnostics = 1_000_000_000;
  source.tokens.tokens = Array.from({ length: 300 }, (_, index) =>
    colorToken(`INVALID_${index}`, "red"),
  );
  assert.throws(
    () => validateInMemory(source),
    (error) => {
      assert.ok(error.message.split("\n").length <= 201);
      assert.match(error.message, /DIAGNOSTIC_LIMIT/);
      return true;
    },
  );
});

test("deprecated tokens require complete bounded migration metadata", async () => {
  const source = await canonicalSource();
  const token = source.tokens.tokens[0];
  token.lifecycle = "deprecated";
  expectCode(() => validateInMemory(source), "DEPRECATED_METADATA_MISSING");
});

test("diagnostics are capped at 200", async () => {
  const source = await canonicalSource();
  source.tokens.tokens = Array.from({ length: 300 }, (_, index) =>
    colorToken(`INVALID_${index}`, "red"),
  );
  assert.throws(
    () => validateInMemory(source),
    (error) => {
      assert.ok(error.message.split("\n").length <= 201);
      assert.match(error.message, /DIAGNOSTIC_LIMIT/);
      return true;
    },
  );
});
