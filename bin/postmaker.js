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

function parseOptions(command, commandArgs, allowedOptions) {
  const parsed = new Map();
  for (let index = 0; index < commandArgs.length; index += 2) {
    const name = commandArgs[index];
    if (!name.startsWith("--")) {
      throw new Error(`Unexpected positional argument for ${command}: ${name}.`);
    }
    if (!allowedOptions.includes(name)) {
      throw new Error(`Unknown option for ${command}: ${name}.`);
    }
    const value = commandArgs[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${name}.`);
    }
    parsed.set(name, [...(parsed.get(name) ?? []), value]);
  }
  return parsed;
}

function validateOptionValues(name, values, supportedValues) {
  const unsupported = values.find((value) => !supportedValues.includes(value));
  if (unsupported) {
    throw new Error(
      `Unsupported ${name} value "${unsupported}". Supported values: ${supportedValues.join(", ")}.`
    );
  }
}

function option(parsed, name, fallback) {
  const values = parsed.get(name) ?? [];
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
    const options = parseOptions(command, args.slice(2), ["--platform", "--angle", "--out", "--tone"]);
    const platforms = options.get("--platform") ?? [];
    const angles = options.get("--angle") ?? [];
    validateOptionValues("--platform", platforms, SUPPORTED_PLATFORMS);
    validateOptionValues("--angle", angles, SUPPORTED_ANGLES);
    const outDir = option(options, "--out", "posts");
    const tone = option(options, "--tone", "clear");
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
    if (!file) throw new Error("Missing post pack path.");
    const options = parseOptions(command, args.slice(2), ["--source"]);
    const source = option(options, "--source", ".");
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
