import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { buildPostPack } from "../src/postPack.js";
import { checkPostPack } from "../src/check.js";

test("builds platform-specific drafts with claim statuses", async () => {
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin", "x"] });

  assert.equal(pack.schemaVersion, "postmaker.v1");
  assert.equal(pack.posts.length, 2);
  assert.ok(pack.claims.some((claim) => claim.status === "sourced"));
  assert.ok(pack.evidenceFiles.includes("README.md"));
  assert.equal(pack.campaignAngles.length, 3);
  assert.ok(pack.evidenceSummary.scripts.includes("smoke"));
});

test("keeps x drafts inside the platform limit", async () => {
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["x"] });

  assert.equal(pack.posts[0].platform, "x");
  assert.ok(pack.posts[0].body.length <= 280);
});

test("checks evidence files and post lengths", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-"));
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
  const file = path.join(tmp, "post-pack.json");
  await writeFile(file, JSON.stringify(pack));

  const report = await checkPostPack(file, "fixtures/source-repo");

  assert.equal(report.ok, true);
  assert.equal(report.claims, 3);
  assert.equal(report.campaignAngles, 3);
  await rm(tmp, { recursive: true, force: true });
});

test("fails when evidence is missing", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-"));
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
  pack.claims[0].evidence.push("MISSING.md");
  const file = path.join(tmp, "post-pack.json");
  await writeFile(file, JSON.stringify(pack));

  const report = await checkPostPack(file, "fixtures/source-repo");

  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /Missing evidence/);
  await rm(tmp, { recursive: true, force: true });
});

for (const [field, malformedValue] of [
  ["posts", {}],
  ["claims", "not-a-list"],
  ["campaignAngles", {}]
]) {
  test(`check reports malformed ${field} as structured JSON`, async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
    const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
    pack[field] = malformedValue;
    const file = path.join(tmp, "post-pack.json");
    await writeFile(file, JSON.stringify(pack));

    const checked = spawnSync(
      process.execPath,
      ["bin/postmaker.js", "check", file, "--source", "fixtures/source-repo"],
      { encoding: "utf8" }
    );

    assert.equal(checked.status, 1, checked.stderr);
    assert.equal(checked.stderr, "");
    const report = JSON.parse(checked.stdout);
    assert.equal(report.ok, false);
    assert.ok(report.errors.includes(`${field} must be an array`));
    assert.equal(report[field], 0);
    await rm(tmp, { recursive: true, force: true });
  });
}

test("supports custom campaign angle selection", async () => {
  const pack = await buildPostPack("fixtures/source-repo", { angles: ["proof"] });

  assert.deepEqual(pack.campaignAngles.map((angle) => angle.name), ["proof"]);
  assert.match(pack.campaignAngles[0].hook, /cite repo evidence/);
});

test("CLI accepts documented repeated platforms and angles", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
  const generated = spawnSync(
    process.execPath,
    [
      "bin/postmaker.js",
      "from-repo",
      "fixtures/source-repo",
      "--platform",
      "linkedin",
      "--platform",
      "x",
      "--angle",
      "problem",
      "--angle",
      "proof",
      "--out",
      tmp
    ],
    { encoding: "utf8" }
  );

  assert.equal(generated.status, 0, generated.stderr);

  const checked = spawnSync(
    process.execPath,
    ["bin/postmaker.js", "check", path.join(tmp, "post-pack.json"), "--source", "fixtures/source-repo"],
    { encoding: "utf8" }
  );

  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(JSON.parse(checked.stdout).ok, true);
  await rm(tmp, { recursive: true, force: true });
});

for (const [optionName, value, supportedValues] of [
  ["--platform", "mastodon", "linkedin, x, caption, launch"],
  ["--angle", "typo", "problem, proof, ask"]
]) {
  test(`CLI rejects unsupported ${optionName} values`, () => {
    const result = spawnSync(
      process.execPath,
      [
        "bin/postmaker.js",
        "from-repo",
        "fixtures/source-repo",
        optionName,
        value
      ],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`Unsupported ${optionName} value "${value}"`));
    assert.match(result.stderr, new RegExp(`Supported values: ${supportedValues}`));
  });
}

for (const optionName of ["--platform", "--angle"]) {
  test(`CLI rejects a missing ${optionName} value before another flag`, () => {
    const result = spawnSync(
      process.execPath,
      [
        "bin/postmaker.js",
        "from-repo",
        "fixtures/source-repo",
        optionName,
        "--out",
        "unused"
      ],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`Missing value for ${optionName}`));
  });
}

for (const [commandArgs, diagnostic] of [
  [
    ["from-repo", "fixtures/source-repo", "--platfrom", "x"],
    /Unknown option for from-repo: --platfrom/
  ],
  [
    ["check", "missing.json", "--format", "json"],
    /Unknown option for check: --format/
  ],
  [
    ["from-repo", "fixtures/source-repo", "extra"],
    /Unexpected positional argument for from-repo: extra/
  ],
  [
    ["check", "missing.json", "extra"],
    /Unexpected positional argument for check: extra/
  ]
]) {
  test(`CLI rejects invalid arguments: ${commandArgs.join(" ")}`, () => {
    const result = spawnSync(process.execPath, ["bin/postmaker.js", ...commandArgs], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, diagnostic);
  });
}
