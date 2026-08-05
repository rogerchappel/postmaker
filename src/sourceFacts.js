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
    changelog: "",
    scripts: []
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
    facts.scripts = Object.keys(packageJson.scripts ?? {}).sort();
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
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length && lines.every(isProseLine))
    .map((lines) => lines.join(" "))
    .find(Boolean) ?? "";
}

function isProseLine(line) {
  if (/^(?:#{1,6}\s|```|~~~|<!--|[-*_]{3,}$|[-*+]\s|\d+[.)]\s|>\s|\|)/.test(line)) {
    return false;
  }
  if (/^\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)$/.test(line)) return false;

  const withoutImages = line.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
  if (!withoutImages) return false;

  const withoutLinks = withoutImages.replace(/\[[^\]]+\]\([^)]*\)/g, "").trim();
  return Boolean(withoutLinks);
}
