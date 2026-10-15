import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("./check-development-audit.mjs", import.meta.url));
const packages = [
  "braces", "micromatch", "fast-glob",
  "@next/eslint-plugin-next", "eslint-config-next",
];

function knownAdvisory() {
  const vulnerabilities = {};
  for (let i = 0; i < packages.length; i++) {
    const name = packages[i];
    vulnerabilities[name] = {
      name,
      severity: "high",
      via: i === 0
        ? [{ name: "braces", url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm" }]
        : [packages[i - 1]],
    };
  }
  return { metadata: { vulnerabilities: { high: 5 } }, vulnerabilities };
}

function check(report) {
  const directory = mkdtempSync(join(tmpdir(), "rio-security-audit-"));
  try {
    const filename = join(directory, "audit.json");
    writeFileSync(filename, JSON.stringify(report));
    return spawnSync(process.execPath, [script, filename], { encoding: "utf8" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("allows only the documented development dependency chain", () => {
  const result = check(knownAdvisory());
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /TEMPORARY EXCEPTION/);
});

test("blocks any new high-severity package", () => {
  const report = knownAdvisory();
  report.vulnerabilities.untrusted = { name: "untrusted", severity: "critical", via: ["braces"] };
  assert.equal(check(report).status, 1);
});

test("blocks an unexpected advisory on an otherwise known package", () => {
  const report = knownAdvisory();
  report.vulnerabilities.braces.via[0].url = "https://example.com/new-advisory";
  assert.equal(check(report).status, 1);
});

test("fails closed when the audit cannot provide valid data", () => {
  assert.equal(check({ error: "Audit network unavailable" }).status, 2);
});

test("accepts genuinely clean audit reports", () => {
  assert.equal(check({ metadata: {}, vulnerabilities: {} }).status, 0);
});
