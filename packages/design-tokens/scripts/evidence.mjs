#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  canonicalJson,
  contrastReport,
  getCategoricalSeries,
  loadAndValidate,
  repoRoot,
  scanCssText,
  sha256,
  validateRollbackBundle,
} from "./lib.mjs";

const { source, tokensById } = await loadAndValidate({
  requireCanonicalSourceBytes: true,
});
const reportRoot = resolve(repoRoot, "docs/evidence/d1/reports");
await mkdir(reportRoot, { recursive: true });

const contrast = contrastReport(source, tokensById);
await writeFile(
  resolve(reportRoot, "contrast.json"),
  canonicalJson({
    tokenSetVersion: source.meta.tokenSetVersion,
    thresholds: {
      normalText: 4.5,
      largeText: 3,
      essentialGraphics: 3,
      focus: 3,
    },
    total: contrast.length,
    passed: contrast.filter((row) => row.pass).length,
    minimumRatio: Math.min(...contrast.map((row) => row.ratio)),
    results: contrast,
  }),
);

await writeFile(
  resolve(reportRoot, "chart.json"),
  canonicalJson({
    tokenSetVersion: source.meta.tokenSetVersion,
    capacity: source.chart.capacity,
    tupleCount: new Set(
      source.chart.categorical.map(
        (series) =>
          `${series.light}|${series.dark}|${series.marker}|${series.dash}`,
      ),
    ).size,
    ninthSeries: getCategoricalSeries(source, 9),
    sequentialConstraints: source.chart.sequential.constraints,
    divergingConstraints: source.chart.diverging.constraints,
    semanticEncodingCount: source.chart.semantic.length,
    statusPresentationCount: source.status.presentations.length,
  }),
);

const globals = await readFile(
  resolve(repoRoot, "apps/web/src/app/globals.css"),
  "utf8",
);
const rawFindings = scanCssText(
  globals,
  "apps/web/src/app/globals.css",
  source.meta.rawValueScanner.exceptions,
);
await writeFile(
  resolve(reportRoot, "raw-values.json"),
  canonicalJson({
    tokenSetVersion: source.meta.tokenSetVersion,
    governedFiles: source.meta.rawValueScanner.scopes,
    activeExceptions: source.meta.rawValueScanner.exceptions,
    findings: rawFindings,
  }),
);

const rollbackFixture = JSON.parse(
  await readFile(
    resolve(
      repoRoot,
      "packages/design-tokens/fixtures/initial-rollback.bundle.json",
    ),
    "utf8",
  ),
);
const rollbackFiles = new Map(
  rollbackFixture.files.map((file) => [
    file.path,
    Buffer.from(file.content, file.encoding),
  ]),
);
const baseline = {
  legacyTokensCss: rollbackFiles.get("packages/design-tokens/tokens.css"),
  packageExport: rollbackFiles.get("packages/design-tokens/package.json"),
  globalsBridge: rollbackFiles.get("apps/web/src/app/globals.css"),
  canonicalSetRemoved: rollbackFixture.canonicalSetRemoved,
};
validateRollbackBundle(baseline, true);
const expected = Object.fromEntries(
  rollbackFixture.files.map((file) => [file.path, file.sha256]),
);
const actual = Object.fromEntries(
  rollbackFixture.files.map((file) => [
    file.path,
    sha256(rollbackFiles.get(file.path)),
  ]),
);
if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw new Error("INITIAL_ROLLBACK_BASELINE_DRIFT");
const rehearsalRoot = await mkdtemp(join(tmpdir(), "d1-rollback-"));
for (const file of rollbackFixture.files) {
  const target = resolve(rehearsalRoot, file.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, rollbackFiles.get(file.path));
  if (sha256(await readFile(target)) !== file.sha256)
    throw new Error(`INITIAL_ROLLBACK_RESTORE_FAILED ${file.path}`);
}
const restoredPackage = JSON.parse(baseline.packageExport.toString("utf8"));
if (restoredPackage.exports["./tokens.css"] !== "./tokens.css")
  throw new Error("INITIAL_ROLLBACK_EXPORT_INVALID");
await writeFile(
  resolve(reportRoot, "rollback-rehearsal.json"),
  canonicalJson({
    rehearsal: "INITIAL_D1_ROLLBACK",
    source:
      "self-contained versioned rollback fixture restored into an independent temporary tree; Git history not required",
    restoredDigests: actual,
    restoredPackageExport: restoredPackage.exports["./tokens.css"],
    canonicalSetRemoved: true,
    verification: "PASS",
  }),
);

const manifest = JSON.parse(
  await readFile(
    resolve(repoRoot, "packages/design-tokens/generated/tokens.manifest.json"),
    "utf8",
  ),
);
await writeFile(
  resolve(reportRoot, "integrity.json"),
  canonicalJson({
    schemaVersion: source.meta.schemaVersion,
    tokenSetVersion: source.meta.tokenSetVersion,
    generatorContractVersion: source.meta.generatorContractVersion,
    manifestSha256: sha256(
      await readFile(
        resolve(
          repoRoot,
          "packages/design-tokens/generated/tokens.manifest.json",
        ),
      ),
    ),
    manifest,
  }),
);

process.stdout.write(
  "D1 evidence reports generated; initial rollback rehearsal PASS.\n",
);
