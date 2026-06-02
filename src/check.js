import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function checkPostPack(packPath, sourceDir) {
  const pack = JSON.parse(await readFile(path.resolve(packPath), "utf8"));
  const sourceRoot = path.resolve(sourceDir);
  const errors = [];
  const warnings = [];

  if (pack.schemaVersion !== "postmaker.v1") errors.push("schemaVersion must be postmaker.v1");
  if (!Array.isArray(pack.posts) || pack.posts.length === 0) errors.push("At least one post is required");
  if (!Array.isArray(pack.claims) || pack.claims.length === 0) errors.push("At least one claim is required");

  for (const post of pack.posts ?? []) {
    if (!post.platform) errors.push("Post is missing platform");
    if (!post.body) errors.push(`Post ${post.platform ?? "unknown"} is missing body`);
    if (post.maxLength && post.body && post.body.length > post.maxLength) {
      errors.push(`Post ${post.platform} exceeds maxLength`);
    }
  }

  for (const claim of pack.claims ?? []) {
    if (!["sourced", "inferred", "needs-review"].includes(claim.status)) {
      errors.push(`Invalid claim status: ${claim.status}`);
    }
    if (claim.status === "needs-review") warnings.push(`Claim needs review: ${claim.text}`);
    for (const evidence of claim.evidence ?? []) {
      const evidencePath = path.resolve(sourceRoot, evidence);
      if (!evidencePath.startsWith(sourceRoot)) {
        errors.push(`Evidence escapes source root: ${evidence}`);
      } else if (!(await exists(evidencePath))) {
        errors.push(`Missing evidence: ${evidence}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    posts: (pack.posts ?? []).length,
    claims: (pack.claims ?? []).length
  };
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}
