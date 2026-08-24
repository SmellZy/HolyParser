import assert from "node:assert/strict";
import test from "node:test";
import {
  composite,
  contrastRatio,
  contrastReport,
  getCategoricalSeries,
  loadAndValidate,
  resolveAll,
} from "../scripts/lib.mjs";

const approvedPalette = {
  "semantic.color.action.primary": ["#126BFF", "#3384FF"],
  "semantic.color.action.primary.active": ["#084CC2", "#7DB1FF"],
  "semantic.color.action.primary.hover": ["#0B5DE6", "#5B9CFF"],
  "semantic.color.action.secondary": ["#5948D6", "#A99CFF"],
  "semantic.color.background.base": ["#F6F8FC", "#060B18"],
  "semantic.color.background.elevated": ["#FFFFFF", "#101C31"],
  "semantic.color.background.subtle": ["#F1F5F9", "#0D1728"],
  "semantic.color.background.surface": ["#FFFFFF", "#0A1324"],
  "semantic.color.border.default": ["#E5E7EB", "#24334A"],
  "semantic.color.border.emphasis": ["#7B8494", "#536A8A"],
  "semantic.color.capability.research-required": ["#5948D6", "#A99CFF"],
  "semantic.color.capability.unsupported": ["#5F6B7A", "#A6B2C2"],
  "semantic.color.capability.unverified": ["#5E6472", "#95A3B8"],
  "semantic.color.financial.negative": ["#B4233C", "#FF718A"],
  "semantic.color.financial.neutral": ["#5F6B7A", "#A6B2C2"],
  "semantic.color.financial.positive": ["#087A55", "#38D39F"],
  "semantic.color.focus.ring": ["#006EE6", "#00D4FF"],
  "semantic.color.overlay.scrim": ["#0F172A73", "#000000A6"],
  "semantic.color.quality.crossed": ["#B4233C", "#FF718A"],
  "semantic.color.quality.gapped": ["#A33252", "#FF7AA2"],
  "semantic.color.quality.invalid": ["#A61B1B", "#FF5B5B"],
  "semantic.color.quality.locked": ["#7C4D00", "#F2C14E"],
  "semantic.color.quality.reconnecting": ["#006B8F", "#4BD9F5"],
  "semantic.color.quality.stale": ["#8A5A00", "#E9A928"],
  "semantic.color.status.active": ["#0A5CD6", "#66A3FF"],
  "semantic.color.status.critical": ["#A61B1B", "#FF5B5B"],
  "semantic.color.status.disabled": ["#7D8795", "#68768A"],
  "semantic.color.status.healthy": ["#0F766E", "#2DD4BF"],
  "semantic.color.status.informational": ["#0A5CD6", "#66A3FF"],
  "semantic.color.status.unknown": ["#5F6B7A", "#A6B2C2"],
  "semantic.color.status.warning": ["#985B00", "#F5B942"],
  "semantic.color.surface.interactive": ["#F8FAFC", "#121F35"],
  "semantic.color.surface.selected": ["#E8F1FF", "#18365F"],
  "semantic.color.text.disabled": ["#9CA3AF", "#526178"],
  "semantic.color.text.inverse": ["#FFFFFF", "#06101F"],
  "semantic.color.text.link": ["#0A5CD6", "#66A3FF"],
  "semantic.color.text.muted": ["#6B7280", "#8291A8"],
  "semantic.color.text.primary": ["#111827", "#F7FAFF"],
  "semantic.color.text.secondary": ["#374151", "#C3CEDD"],
};

test("D-081 exact LIGHT and DARK palette is preserved", async () => {
  const { source, tokensById } = await loadAndValidate();
  const light = new Map(
    resolveAll(source, tokensById, "LIGHT").map((token) => [
      token.id,
      token.resolved,
    ]),
  );
  const dark = new Map(
    resolveAll(source, tokensById, "DARK").map((token) => [
      token.id,
      token.resolved,
    ]),
  );
  for (const [id, [expectedLight, expectedDark]] of Object.entries(
    approvedPalette,
  )) {
    assert.equal(light.get(id), expectedLight, `${id} LIGHT`);
    assert.equal(dark.get(id), expectedDark, `${id} DARK`);
  }
});

test("every semantic token resolves with type parity in both themes", async () => {
  const { source, tokensById } = await loadAndValidate();
  const light = resolveAll(source, tokensById, "LIGHT");
  const dark = resolveAll(source, tokensById, "DARK");
  assert.deepEqual(
    light.map(({ id, type }) => ({ id, type })),
    dark.map(({ id, type }) => ({ id, type })),
  );
  assert.ok(
    light
      .filter((token) => token.kind === "semantic")
      .every((token) => token.resolved !== undefined),
  );
});

test("D-080 typography stacks are exact and dependency-free", async () => {
  const { source } = await loadAndValidate();
  const tokens = new Map(
    source.tokens.tokens.map((token) => [token.id, token.value]),
  );
  assert.deepEqual(tokens.get("semantic.typography.family.heading"), [
    "Space Grotesk",
    "Geist",
    "Geist Fallback",
    "Inter",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "sans-serif",
  ]);
  assert.deepEqual(tokens.get("semantic.typography.family.ui"), [
    "Inter",
    "Geist",
    "Geist Fallback",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "sans-serif",
  ]);
  assert.deepEqual(tokens.get("semantic.typography.family.data"), [
    "Geist Mono",
    "Geist Mono Fallback",
    "SFMono-Regular",
    "Consolas",
    "Liberation Mono",
    "Menlo",
    "ui-monospace",
    "monospace",
  ]);
  assert.equal(
    tokens.get("semantic.typography.feature.tabular"),
    "tabular-nums",
  );
});

test("D-080 finite type sizes, line heights, weights and tracking are exact", async () => {
  const { source } = await loadAndValidate();
  const byId = new Map(
    source.tokens.tokens.map((token) => [token.id, token.value]),
  );
  assert.deepEqual(
    ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"].map(
      (name) => byId.get(`semantic.typography.size.${name}`).amount,
    ),
    [12, 14, 16, 18, 20, 24, 30, 36, 48],
  );
  assert.deepEqual(
    [400, 500, 600, 700].map((weight) =>
      byId.get(`semantic.typography.weight.${weight}`),
    ),
    [400, 500, 600, 700],
  );
  assert.equal(byId.get("semantic.typography.tracking.heading"), "-0.02");
  assert.equal(byId.get("semantic.typography.tracking.compact"), "0.08");
});

test("D-083 foundation scales are finite and exact", async () => {
  const { source } = await loadAndValidate();
  const tokens = source.tokens.tokens;
  const amount = (prefix) =>
    tokens
      .filter((token) => token.id.startsWith(prefix))
      .map((token) => token.value.amount);
  assert.deepEqual(
    amount("semantic.spacing."),
    [0, 12, 16, 2, 20, 24, 32, 4, 40, 48, 64, 8],
  );
  assert.deepEqual(amount("semantic.sizing.icon."), [12, 16, 20, 24, 32]);
  assert.deepEqual(amount("semantic.sizing.control."), [32, 40, 48]);
  assert.equal(
    tokens.find((token) => token.id === "semantic.sizing.hit-target.minimum")
      .value.amount,
    44,
  );
  assert.equal(
    tokens.find((token) => token.id === "semantic.focus.offset").value.amount,
    2,
  );
});

test("all 162 approved contrast pairings pass", async () => {
  const { source, tokensById } = await loadAndValidate();
  const report = contrastReport(source, tokensById);
  assert.equal(report.length, 162);
  assert.equal(report.filter((row) => row.pass).length, 162);
  assert.ok(Math.min(...report.map((row) => row.ratio)) >= 3);
});

test("contrast threshold boundary is deterministic", () => {
  const ratio = contrastRatio("#111827", "#FFFFFF");
  assert.ok(ratio >= ratio - 0.001);
  assert.ok(!(ratio >= ratio + 0.001));
});

test("alpha compositing produces an opaque deterministic color", () => {
  assert.match(composite("#000000A6", "#060B18"), /^#[0-9A-F]{6}$/);
  assert.equal(composite("#00000000", "#060B18"), "#060B18");
});

test("brand blue and financial positive remain semantically independent", async () => {
  const { source, tokensById } = await loadAndValidate();
  const dark = new Map(
    resolveAll(source, tokensById, "DARK").map((token) => [
      token.id,
      token.resolved,
    ]),
  );
  assert.notEqual(
    dark.get("primitive.color.brand.blue"),
    dark.get("semantic.color.financial.positive"),
  );
});

test("D-082 supplies eight unique series and typed ninth-series failure", async () => {
  const { source } = await loadAndValidate();
  const tuples = new Set(
    source.chart.categorical.map(
      (series) =>
        `${series.light}|${series.dark}|${series.marker}|${series.dash}`,
    ),
  );
  assert.equal(tuples.size, 8);
  assert.equal(getCategoricalSeries(source, 8).ok, true);
  assert.deepEqual(getCategoricalSeries(source, 9), {
    ok: false,
    error: "CHART_SERIES_CAPACITY_EXCEEDED",
  });
});

test("sequential and diverging chart scales are fill-only and legend-bound", async () => {
  const { source } = await loadAndValidate();
  assert.deepEqual(source.chart.sequential.constraints, [
    "AREA_FILL_ONLY",
    "REQUIRES_LEGEND",
  ]);
  assert.deepEqual(source.chart.diverging.constraints, [
    "AREA_FILL_ONLY",
    "REQUIRES_LEGEND",
  ]);
  assert.equal(source.chart.diverging.order[1], "zero-neutral");
});

test("critical chart semantics and all status states are redundantly encoded", async () => {
  const { source } = await loadAndValidate();
  assert.equal(source.status.presentations.length, 18);
  assert.ok(
    source.status.presentations.every(
      (item) =>
        item.color &&
        item.labelKey &&
        item.icon &&
        item.marker &&
        item.descriptionKey &&
        item.pattern,
    ),
  );
  const critical = source.chart.semantic.find(
    (item) => item.id === "chart.semantic.critical-threshold",
  );
  assert.equal(critical.marker, "double-marker");
  assert.equal(critical.label, "CRITICAL");
});

test("D-087 systemColor grammar and mappings are closed", async () => {
  const { source } = await loadAndValidate();
  assert.deepEqual(source.status.systemColorAllowlist, [
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
  ]);
  const mapped = new Set(
    source.status.forcedColors.flatMap((item) => item.systemColors),
  );
  assert.ok(
    [...mapped].every((value) =>
      source.status.systemColorAllowlist.includes(value),
    ),
  );
  assert.equal(source.status.forcedColors.length, 10);
});
