import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function collectSourceFacts(sourceDir) {
  const root = path.resolve(sourceDir);
  const files = await readdir(root);
  const findMarkdown = (basename) => files.find(
    (file) => file.toLowerCase() === basename.toLowerCase()
  );
  const readmeFile = findMarkdown("README.md");
  const changelogFile = findMarkdown("CHANGELOG.md");
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

  if (readmeFile) {
    const readme = await readFile(path.join(root, readmeFile), "utf8");
    facts.title = extractTitle(readme) ?? facts.title;
    facts.summary = extractSummary(readme);
    facts.evidenceFiles.push(readmeFile);
  }

  if (files.includes("package.json")) {
    const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    facts.packageName = packageJson.name ?? null;
    facts.packageDescription = packageJson.description ?? null;
    facts.scripts = Object.keys(packageJson.scripts ?? {}).sort();
    facts.evidenceFiles.push("package.json");
  }

  if (changelogFile) {
    facts.changelog = await readFile(path.join(root, changelogFile), "utf8");
    facts.evidenceFiles.push(changelogFile);
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
