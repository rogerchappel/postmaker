import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const temp = await mkdtemp(path.join(os.tmpdir(), "postmaker-package-"));
const installDir = path.join(temp, "install");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`);
  }
  return result.stdout;
}

try {
  const packed = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", temp]));
  const tarball = path.join(temp, packed[0].filename);
  await mkdir(installDir);
  run("npm", ["init", "--yes"], { cwd: installDir });
  run("npm", ["install", "--ignore-scripts", tarball], { cwd: installDir });

  const installedPath = path.join(installDir, "node_modules", "@rogerchappel", "postmaker", "package.json");
  const installed = JSON.parse(await readFile(installedPath, "utf8"));
  if (installed.name !== "@rogerchappel/postmaker" || installed.version !== "0.1.0") {
    throw new Error(`packed identity mismatch: received ${installed.name}@${installed.version}`);
  }
  if (installed.bin?.postmaker !== "./bin/postmaker.js") {
    throw new Error("packed artifact does not expose the postmaker CLI bin");
  }

  const executable = process.platform === "win32" ? "postmaker.cmd" : "postmaker";
  const help = run(path.join(installDir, "node_modules", ".bin", executable), ["--help"], { cwd: installDir });
  if (!help.includes("postmaker from-repo")) throw new Error("installed postmaker command did not show CLI help");
  console.log(`Verified ${installed.name}@${installed.version} and the installed postmaker command.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
