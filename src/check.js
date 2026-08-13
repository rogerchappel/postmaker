import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function checkPostPack(packPath, sourceDir) {
  const pack = JSON.parse(await readFile(path.resolve(packPath), "utf8"));
  const sourceRoot = path.resolve(sourceDir);
  const errors = [];
  const warnings = [];
  const posts = Array.isArray(pack.posts) ? pack.posts : [];
  const claims = Array.isArray(pack.claims) ? pack.claims : [];
  const campaignAngles = Array.isArray(pack.campaignAngles) ? pack.campaignAngles : [];
  let validatedPosts = 0;
  let validatedClaims = 0;
  let validatedCampaignAngles = 0;

  if (pack.schemaVersion !== "postmaker.v1") errors.push("schemaVersion must be postmaker.v1");
  if (!Array.isArray(pack.posts)) errors.push("posts must be an array");
  else if (posts.length === 0) errors.push("At least one post is required");
  if (!Array.isArray(pack.claims)) errors.push("claims must be an array");
  else if (claims.length === 0) errors.push("At least one claim is required");
  if (pack.campaignAngles !== undefined && !Array.isArray(pack.campaignAngles)) {
    errors.push("campaignAngles must be an array");
  }

  for (const [index, post] of posts.entries()) {
    if (!isObject(post)) {
      errors.push(`posts[${index}] must be an object`);
      continue;
    }
    validatedPosts += 1;
    if (!post.platform) errors.push("Post is missing platform");
    if (!post.body) errors.push(`Post ${post.platform ?? "unknown"} is missing body`);
    if (post.maxLength && post.body && post.body.length > post.maxLength) {
      errors.push(`Post ${post.platform} exceeds maxLength`);
    }
  }

  for (const [index, claim] of claims.entries()) {
    if (!isObject(claim)) {
      errors.push(`claims[${index}] must be an object`);
      continue;
    }
    validatedClaims += 1;
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

  for (const [index, angle] of campaignAngles.entries()) {
    if (!isObject(angle)) {
      errors.push(`campaignAngles[${index}] must be an object`);
      continue;
    }
    validatedCampaignAngles += 1;
    if (!angle.name) errors.push("Campaign angle is missing name");
    if (!angle.hook) errors.push(`Campaign angle ${angle.name ?? "unknown"} is missing hook`);
    if (!angle.supportingClaim) warnings.push(`Campaign angle ${angle.name ?? "unknown"} has no supporting claim`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    posts: validatedPosts,
    claims: validatedClaims,
    campaignAngles: validatedCampaignAngles
  };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}
