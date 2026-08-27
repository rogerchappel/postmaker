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

test("builds and checks packs against lowercase Markdown evidence files", async () => {
  const sourceDir = "fixtures/lowercase-source-repo";
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-lowercase-evidence-"));
  const file = path.join(tmp, "post-pack.json");

  try {
    const pack = await buildPostPack(sourceDir, { platforms: ["linkedin"] });
    await writeFile(file, JSON.stringify(pack));
    const report = await checkPostPack(file, sourceDir);

    assert.equal(pack.product, "Lowercase Project");
    assert.match(pack.posts[0].body, /concrete lowercase README summary/);
    assert.deepEqual(pack.evidenceFiles, ["readme.md", "changelog.md"]);
    assert.equal(report.ok, true);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("keeps x drafts inside the platform limit", async () => {
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["x"] });

  assert.equal(pack.posts[0].platform, "x");
  assert.ok(pack.posts[0].body.length <= 280);
});

test("uses prose after leading README badges throughout a post pack", async () => {
  const sourceDir = await mkdtemp(path.join(os.tmpdir(), "postmaker-badge-readme-"));
  const summary = "Actual user-facing summary with **useful detail**.";
  await writeFile(
    path.join(sourceDir, "README.md"),
    `# Widget\n\n[![CI](badge.svg)](https://example.test/ci)\n\n${summary}\n`
  );

  try {
    const pack = await buildPostPack(sourceDir, { platforms: ["linkedin"] });

    assert.equal(pack.product, "Widget");
    assert.match(pack.posts[0].body, new RegExp(summary.replaceAll("*", "\\*")));
    assert.equal(pack.claims[0].text, `Widget is described as ${summary}`);
    assert.equal(pack.claims[0].status, "sourced");
    assert.deepEqual(pack.claims[0].evidence, ["README.md"]);
    assert.equal(pack.campaignAngles[0].supportingClaim, summary);
  } finally {
    await rm(sourceDir, { recursive: true, force: true });
  }
});

test("checks evidence files and post lengths", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-"));
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
  const file = path.join(tmp, "post-pack.json");
  await writeFile(file, JSON.stringify(pack));

  const report = await checkPostPack(file, "fixtures/source-repo");

  assert.equal(report.ok, true);
  assert.ok(pack.claims.some((claim) =>
    claim.status === "sourced" && claim.evidence.includes("README.md")
  ));
  assert.equal(report.claims, 3);
  assert.equal(report.campaignAngles, 3);
  await rm(tmp, { recursive: true, force: true });
});

test("rejects sourced claims without evidence using an indexed error", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-"));
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
  pack.claims[0].status = "sourced";
  pack.claims[0].evidence = [];
  const file = path.join(tmp, "post-pack.json");
  await writeFile(file, JSON.stringify(pack));

  const report = await checkPostPack(file, "fixtures/source-repo");

  assert.equal(report.ok, false);
  assert.ok(report.errors.includes("claims[0].evidence must contain at least one entry"));
  await rm(tmp, { recursive: true, force: true });
});

test("CLI rejects sourced claims without evidence as structured JSON", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
  pack.claims[0].status = "sourced";
  pack.claims[0].evidence = [];
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
  assert.ok(report.errors.includes("claims[0].evidence must contain at least one entry"));
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
  assert.ok(report.errors.includes("Missing evidence: MISSING.md"));
  await rm(tmp, { recursive: true, force: true });
});

test("rejects directory evidence with an indexed validation error", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-"));
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
  pack.claims[0].evidence = ["."];
  const file = path.join(tmp, "post-pack.json");
  await writeFile(file, JSON.stringify(pack));

  const report = await checkPostPack(file, "fixtures/source-repo");

  assert.equal(report.ok, false);
  assert.ok(report.errors.includes(
    "claims[0].evidence[0] must reference a regular file: ."
  ));
  await rm(tmp, { recursive: true, force: true });
});

test("CLI rejects directory evidence as structured JSON", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
  const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
  pack.claims[0].evidence = ["."];
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
  assert.ok(report.errors.includes(
    "claims[0].evidence[0] must reference a regular file: ."
  ));
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

for (const field of ["posts", "claims", "campaignAngles"]) {
  test(`check reports malformed entries in ${field} as structured JSON`, async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
    const pack = await buildPostPack("fixtures/source-repo", { platforms: ["linkedin"] });
    const validEntries = pack[field];
    pack[field] = [null, ...validEntries, "invalid", []];
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
    assert.deepEqual(
      report.errors.filter((error) => error.startsWith(`${field}[`)),
      [0, validEntries.length + 1, validEntries.length + 2].map(
        (index) => `${field}[${index}] must be an object`
      )
    );
    assert.equal(report[field], validEntries.length);
    await rm(tmp, { recursive: true, force: true });
  });
}

test("check continues across malformed entries in every collection", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
  const file = path.join(tmp, "post-pack.json");
  await writeFile(file, JSON.stringify({
    schemaVersion: "postmaker.v1",
    posts: [null],
    claims: [null],
    campaignAngles: [null]
  }));

  const checked = spawnSync(
    process.execPath,
    ["bin/postmaker.js", "check", file, "--source", "fixtures/source-repo"],
    { encoding: "utf8" }
  );

  assert.equal(checked.status, 1, checked.stderr);
  assert.equal(checked.stderr, "");
  assert.deepEqual(JSON.parse(checked.stdout), {
    ok: false,
    errors: [
      "posts[0] must be an object",
      "claims[0] must be an object",
      "campaignAngles[0] must be an object"
    ],
    warnings: [],
    posts: 0,
    claims: 0,
    campaignAngles: 0
  });
  await rm(tmp, { recursive: true, force: true });
});

for (const malformedRoot of [null, [], "not-a-pack", 42]) {
  test(`check reports malformed root ${JSON.stringify(malformedRoot)} as structured JSON`, async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
    const file = path.join(tmp, "post-pack.json");
    await writeFile(file, JSON.stringify(malformedRoot));

    const checked = spawnSync(
      process.execPath,
      ["bin/postmaker.js", "check", file, "--source", "fixtures/source-repo"],
      { encoding: "utf8" }
    );

    assert.equal(checked.status, 1, checked.stderr);
    assert.equal(checked.stderr, "");
    const report = JSON.parse(checked.stdout);
    assert.equal(report.ok, false);
    assert.ok(report.errors.includes("post pack must be an object"));
    assert.deepEqual([report.posts, report.claims, report.campaignAngles], [0, 0, 0]);
    await rm(tmp, { recursive: true, force: true });
  });
}

test("check reports indexed nested field errors and continues validation", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "postmaker-cli-"));
  const file = path.join(tmp, "post-pack.json");
  await writeFile(file, JSON.stringify({
    schemaVersion: "postmaker.v1",
    posts: [{ platform: 7, body: 42, maxLength: "bad" }],
    claims: [{ text: false, status: 9, evidence: 42 }, {
      text: "claim", status: "sourced", evidence: [false, "MISSING.md"]
    }],
    campaignAngles: [{ name: 1, hook: [], supportingClaim: false }]
  }));

  const checked = spawnSync(
    process.execPath,
    ["bin/postmaker.js", "check", file, "--source", "fixtures/source-repo"],
    { encoding: "utf8" }
  );

  assert.equal(checked.status, 1, checked.stderr);
  assert.equal(checked.stderr, "");
  const report = JSON.parse(checked.stdout);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    "posts[0].platform must be a non-empty string",
    "posts[0].body must be a non-empty string",
    "posts[0].maxLength must be a non-negative integer",
    "claims[0].text must be a non-empty string",
    "claims[0].status must be sourced, inferred, or needs-review",
    "claims[0].evidence must be an array",
    "claims[1].evidence[0] must be a non-empty string",
    "Missing evidence: MISSING.md",
    "campaignAngles[0].name must be a non-empty string",
    "campaignAngles[0].hook must be a non-empty string",
    "campaignAngles[0].supportingClaim must be a string"
  ]);
  assert.deepEqual([report.posts, report.claims, report.campaignAngles], [1, 2, 1]);
  await rm(tmp, { recursive: true, force: true });
});

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
