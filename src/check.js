import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function checkPostPack(packPath, sourceDir) {
  const parsedPack = JSON.parse(await readFile(path.resolve(packPath), "utf8"));
  const pack = isObject(parsedPack) ? parsedPack : {};
  const sourceRoot = path.resolve(sourceDir);
  const errors = [];
  const warnings = [];
  const posts = Array.isArray(pack.posts) ? pack.posts : [];
  const claims = Array.isArray(pack.claims) ? pack.claims : [];
  const campaignAngles = Array.isArray(pack.campaignAngles) ? pack.campaignAngles : [];
  let validatedPosts = 0;
  let validatedClaims = 0;
  let validatedCampaignAngles = 0;

  if (!isObject(parsedPack)) errors.push("post pack must be an object");
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
    if (typeof post.platform !== "string" || post.platform.length === 0) {
      errors.push(`posts[${index}].platform must be a non-empty string`);
    }
    if (typeof post.body !== "string" || post.body.length === 0) {
      errors.push(`posts[${index}].body must be a non-empty string`);
    }
    if (post.maxLength !== undefined &&
        (!Number.isInteger(post.maxLength) || post.maxLength < 0)) {
      errors.push(`posts[${index}].maxLength must be a non-negative integer`);
    }
    if (typeof post.body === "string" && Number.isInteger(post.maxLength) &&
        post.maxLength >= 0 && post.body.length > post.maxLength) {
      errors.push(`Post ${post.platform} exceeds maxLength`);
    }
  }

  for (const [index, claim] of claims.entries()) {
    if (!isObject(claim)) {
      errors.push(`claims[${index}] must be an object`);
      continue;
    }
    validatedClaims += 1;
    if (typeof claim.text !== "string" || claim.text.length === 0) {
      errors.push(`claims[${index}].text must be a non-empty string`);
    }
    if (typeof claim.status !== "string" ||
        !["sourced", "inferred", "needs-review"].includes(claim.status)) {
      errors.push(`claims[${index}].status must be sourced, inferred, or needs-review`);
    }
    if (claim.status === "needs-review" && typeof claim.text === "string") {
      warnings.push(`Claim needs review: ${claim.text}`);
    }
    if (!Array.isArray(claim.evidence)) {
      errors.push(`claims[${index}].evidence must be an array`);
      continue;
    }
    if (claim.status === "sourced" && claim.evidence.length === 0) {
      errors.push(`claims[${index}].evidence must contain at least one entry`);
    }
    for (const [evidenceIndex, evidence] of claim.evidence.entries()) {
      if (typeof evidence !== "string" || evidence.length === 0) {
        errors.push(`claims[${index}].evidence[${evidenceIndex}] must be a non-empty string`);
        continue;
      }
      const evidencePath = path.resolve(sourceRoot, evidence);
      if (!evidencePath.startsWith(sourceRoot)) {
        errors.push(`Evidence escapes source root: ${evidence}`);
      } else {
        const evidenceStat = await statOrNull(evidencePath);
        if (evidenceStat === null) {
          errors.push(`Missing evidence: ${evidence}`);
        } else if (!evidenceStat.isFile()) {
          errors.push(
            `claims[${index}].evidence[${evidenceIndex}] must reference a regular file: ${evidence}`
          );
        }
      }
    }
  }

  for (const [index, angle] of campaignAngles.entries()) {
    if (!isObject(angle)) {
      errors.push(`campaignAngles[${index}] must be an object`);
      continue;
    }
    validatedCampaignAngles += 1;
    if (typeof angle.name !== "string" || angle.name.length === 0) {
      errors.push(`campaignAngles[${index}].name must be a non-empty string`);
    }
    if (typeof angle.hook !== "string" || angle.hook.length === 0) {
      errors.push(`campaignAngles[${index}].hook must be a non-empty string`);
    }
    if (angle.supportingClaim !== undefined && typeof angle.supportingClaim !== "string") {
      errors.push(`campaignAngles[${index}].supportingClaim must be a string`);
    } else if (!angle.supportingClaim) {
      warnings.push(`Campaign angle ${angle.name ?? "unknown"} has no supporting claim`);
    }
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

async function statOrNull(target) {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}
