import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

export async function registryResponse(packageName, { fixture, fetchImpl = fetch } = {}) {
  if (fixture) {
    const result = JSON.parse(await readFile(fixture, "utf8"));
    if (result.error) throw new Error(result.error);
    return { status: result.status, body: result.body };
  }

  const encodedName = packageName.replace("/", "%2f");
  const response = await fetchImpl(`https://registry.npmjs.org/${encodedName}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

export async function checkRegistry({ manifestPath = "package.json", fixture } = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const label = `${manifest.name}@${manifest.version}`;
  let result;

  try {
    result = await registryResponse(manifest.name, { fixture });
  } catch (error) {
    throw new Error(`Could not check npm registry for ${label}: ${error.message}`);
  }

  if (result.status === 404) {
    return `${label} is available: the package name is not present in the npm registry.`;
  }
  if (result.status !== 200) {
    throw new Error(`Could not check npm registry for ${label}: HTTP ${result.status}.`);
  }

  const versions = result.body?.versions ?? {};
  if (Object.hasOwn(versions, manifest.version)) {
    throw new Error(`${label} is unavailable: that version already exists in the npm registry.`);
  }
  if (result.body?.name && result.body.name !== manifest.name) {
    throw new Error(`${label} is unavailable: registry response belongs to ${result.body.name}.`);
  }
  return `${label} is available: package exists, but this version has not been published.`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkRegistry({ fixture: process.env.POSTMAKER_REGISTRY_FIXTURE })
    .then((message) => console.log(message))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
