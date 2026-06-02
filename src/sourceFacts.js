import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function collectSourceFacts(sourceDir) {
  const root = path.resolve(sourceDir);
  const files = await readdir(root);
  const facts = {
    root,
    name: path.basename(root),
    title: path.basename(root),
    summary: "",
    packageName: null,
    packageDescription: null,
    evidenceFiles: [],
    changelog: ""
  };

  if (files.includes("README.md")) {
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    facts.title = extractTitle(readme) ?? facts.title;
    facts.summary = extractSummary(readme);
    facts.evidenceFiles.push("README.md");
  }

  if (files.includes("package.json")) {
    const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    facts.packageName = packageJson.name ?? null;
    facts.packageDescription = packageJson.description ?? null;
    facts.evidenceFiles.push("package.json");
  }

  if (files.includes("CHANGELOG.md")) {
    facts.changelog = await readFile(path.join(root, "CHANGELOG.md"), "utf8");
    facts.evidenceFiles.push("CHANGELOG.md");
  }

  return facts;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function extractSummary(markdown) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#")) ?? "";
}
