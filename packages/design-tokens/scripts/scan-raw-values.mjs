#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  Diagnostics,
  loadAndValidate,
  repoRoot,
  scanCssText,
  validateRawExceptions,
} from "./lib.mjs";

const { source } = await loadAndValidate({ requireCanonicalSourceBytes: true });
const diagnostics = new Diagnostics(source.meta.bounds.maxDiagnostics);
validateRawExceptions(source.meta.rawValueScanner.exceptions);

for (const relative of source.meta.rawValueScanner.scopes) {
  const css = await readFile(resolve(repoRoot, relative), "utf8");
  for (const finding of scanCssText(
    css,
    relative,
    source.meta.rawValueScanner.exceptions,
  ))
    diagnostics.add(
      finding.code,
      `${finding.file}:${finding.line}`,
      `${finding.property} uses a governed raw value or stale exception`,
    );
}

diagnostics.throwIfAny();
process.stdout.write("D1 raw-value policy passed with 0 active exceptions.\n");
