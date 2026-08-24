#!/usr/bin/env node

import { loadAndValidate } from "./lib.mjs";

await loadAndValidate({ requireCanonicalSourceBytes: true });
process.stdout.write("D1 source validation passed.\n");
