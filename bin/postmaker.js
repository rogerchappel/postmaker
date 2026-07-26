#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildPostPack,
  SUPPORTED_ANGLES,
  SUPPORTED_PLATFORMS
} from "../src/postPack.js";
import { checkPostPack } from "../src/check.js";

const args = process.argv.slice(2);

function optionValues(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${name}.`);
    }
    values.push(value);
  }
  return values;
}

function validateOptionValues(name, values, supportedValues) {
  const unsupported = values.find((value) => !supportedValues.includes(value));
  if (unsupported) {
    throw new Error(
      `Unsupported ${name} value "${unsupported}". Supported values: ${supportedValues.join(", ")}.`
    );
  }
}

function option(name, fallback) {
  const values = optionValues(name);
  return values.at(-1) ?? fallback;
}

function usage() {
  return `Usage:
  postmaker from-repo <repo> --platform linkedin --platform x --out <dir>
  postmaker from-repo <repo> --angle problem --angle proof --out <dir>
  postmaker check <post-pack.json> --source <repo>

Supported platforms: ${SUPPORTED_PLATFORMS.join(", ")}
Supported angles: ${SUPPORTED_ANGLES.join(", ")}
`;
}

async function main() {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "from-repo") {
    const repo = args[1];
    if (!repo) throw new Error("Missing repo path.");
    const platforms = optionValues("--platform");
    const angles = optionValues("--angle");
    validateOptionValues("--platform", platforms, SUPPORTED_PLATFORMS);
    validateOptionValues("--angle", angles, SUPPORTED_ANGLES);
    const outDir = option("--out", "posts");
    const tone = option("--tone", "clear");
    const pack = await buildPostPack(repo, {
      platforms: platforms.length ? platforms : ["linkedin", "x"],
      angles: angles.length ? angles : undefined,
      tone
    });
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "post-pack.json"), `${JSON.stringify(pack, null, 2)}\n`);
    await writeFile(path.join(outDir, "launch.md"), renderLaunchNote(pack));
    process.stdout.write(`Wrote ${path.join(outDir, "post-pack.json")}\n`);
    return;
  }

  if (command === "check") {
    const file = args[1];
    const source = option("--source", ".");
    if (!file) throw new Error("Missing post pack path.");
    const report = await checkPostPack(file, source);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
    return;
  }

  throw new Error(`Unknown command: ${command}\n${usage()}`);
}

function renderLaunchNote(pack) {
  return `# Launch Drafts

## Campaign angles

${(pack.campaignAngles ?? []).map((angle) => `- ${angle.name}: ${angle.hook}`).join("\n")}

${pack.posts.map((post) => `## ${post.platform}\n\n${post.body}\n`).join("\n")}
## Claims

${pack.claims.map((claim) => `- [${claim.status}] ${claim.text}`).join("\n")}
`;
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
