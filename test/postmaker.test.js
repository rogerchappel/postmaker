import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

test("supports custom campaign angle selection", async () => {
  const pack = await buildPostPack("fixtures/source-repo", { angles: ["proof"] });

  assert.deepEqual(pack.campaignAngles.map((angle) => angle.name), ["proof"]);
  assert.match(pack.campaignAngles[0].hook, /cite repo evidence/);
});
