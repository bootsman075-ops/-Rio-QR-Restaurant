/** 
 * Allow exactly one documented, unpatched advisory in the development-only
 * Next.js ESLint dependency chain. This is NOT a blanket npm audit bypass.
 * The production dependency audit still blocks deployment independently.
 *
 * GHSA-vfj7-8cjw-p6xm: braces <= 3.0.3 stack exhaustion, no patched release
 * as of 2026-10-15. Revisit this temporary exception by 2026-11-15.
 */
import { readFileSync } from "node:fs";

const ADVISORY_URL = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const EXCEPTION_EXPIRES = "2026-11-15";
const EXPECTED_VIA = new Map([
  ["braces", []],
  ["micromatch", ["braces"]],
  ["fast-glob", ["micromatch"]],
  ["@next/eslint-plugin-next", ["fast-glob"]],
  ["eslint-config-next", ["@next/eslint-plugin-next"]],
]);

const file = process.argv[2];
if (!file) {
  console.error("Missing path to npm audit JSON report.");
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(file, "utf8"));
} catch {
  console.error("Could not parse npm audit output. Audit must not be skipped.");
  process.exit(2);
}

if (!report || !report.metadata || !report.vulnerabilities || report.error) {
  console.error("Incomplete npm audit report. Cannot approve dependencies.");
  process.exit(2);
}

const high = Object.entries(report.vulnerabilities).filter(([, info]) =>
  info && (info.severity === "high" || info.severity === "critical"),
);

if (high.length === 0) {
  console.log("No high or critical npm vulnerabilities (including development dependencies).");
  process.exit(0);
}

const problems = [];
function reviewPackage(name, chain = new Set()) {
  const expected = EXPECTED_VIA.get(name);
  const entry = report.vulnerabilities[name];
  if (!expected || !entry || chain.has(name) || !Array.isArray(entry.via) || entry.via.length === 0) {
    problems.push("Unapproved or malformed vulnerability path: " + name);
    return;
  }

  const nextChain = new Set([...chain, name]);
  for (const item of entry.via) {
    if (typeof item === "string") {
      if (!expected.includes(item)) {
        problems.push("Unexpected affected dependency: " + name + " -> " + item);
      } else {
        reviewPackage(item, nextChain);
      }
    } else if (item && typeof item === "object") {
      if (name !== "braces" || item.url !== ADVISORY_URL || item.name !== "braces") {
        problems.push("Unexpected advisory: " + name + " -> " + (item.url || "unknown"));
      }
    } else {
      problems.push("Malformed advisory for " + name);
    }
  }
}

for (const [name] of high) reviewPackage(name);

if (new Date().toISOString().slice(0, 10) > EXCEPTION_EXPIRES) {
  problems.push("The temporary development-only exception expired on " + EXCEPTION_EXPIRES);
}

if (problems.length) {
  for (const problem of [...new Set(problems)]) console.error(problem);
  console.error("Dependency audit failed. All new high/critical advisories remain blocking.");
  process.exit(1);
}

console.warn(
  "TEMPORARY EXCEPTION: " + high.length + " high/critical dependency entries trace solely to " +
  ADVISORY_URL + ". This advisory has no patched braces version and occurs in the " +
  "development-only ESLint chain. The separate production dependency audit must pass. " +
  "Exception expires " + EXCEPTION_EXPIRES + ".",
);
