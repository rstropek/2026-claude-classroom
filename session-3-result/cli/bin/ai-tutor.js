#!/usr/bin/env node
// A fixed, committed entry point, so the executable bit npm sets when it links
// the bin survives every rebuild of dist/.
import { existsSync } from "node:fs";

const bundle = new URL("../dist/ai-tutor.js", import.meta.url);
if (!existsSync(bundle)) {
  console.error(
    "ai-tutor is not built yet: run `npm run build -w ai-tutor-cli`.",
  );
  process.exit(1);
}

await import(bundle.href);
