import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { registryResponse } from "./check-registry.js";

const registryInstall = "npm install --global @rogerchappel/postmaker";
const packedArtifact = "./rogerchappel-postmaker-0.1.0.tgz";

export async function checkInstallDocs({
  manifestPath = "package.json",
  docs = ["README.md", "SKILL.md"],
  fixture,
} = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const result = await registryResponse(manifest.name, { fixture });
  if (![200, 404].includes(result.status)) {
    throw new Error(`Could not check npm registry documentation state: HTTP ${result.status}.`);
  }

  const published = Object.hasOwn(result.body?.versions ?? {}, manifest.version);
  const contents = await Promise.all(docs.map(async (file) => [file, await readFile(file, "utf8")]));

  for (const [file, content] of contents) {
    if (published && !content.includes(registryInstall)) {
      throw new Error(`${file} must document the published registry install: ${registryInstall}`);
    }
    if (!published && content.includes(registryInstall)) {
      throw new Error(`${file} advertises an npm package version that is not published.`);
    }
    if (!published && !content.includes(packedArtifact)) {
      throw new Error(`${file} must document the pre-publication packed artifact: ${packedArtifact}`);
    }
  }

  return published
    ? `Documentation matches published ${manifest.name}@${manifest.version}.`
    : `Documentation uses the packed artifact while ${manifest.name}@${manifest.version} is unpublished.`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkInstallDocs({ fixture: process.env.POSTMAKER_REGISTRY_FIXTURE })
    .then((message) => console.log(message))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
