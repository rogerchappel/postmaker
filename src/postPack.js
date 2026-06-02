import { collectSourceFacts } from "./sourceFacts.js";

const PLATFORM_LIMITS = {
  linkedin: 1300,
  x: 280,
  caption: 180,
  launch: 900
};

export async function buildPostPack(sourceDir, options = {}) {
  const facts = await collectSourceFacts(sourceDir);
  const platforms = options.platforms ?? ["linkedin", "x"];
  const tone = options.tone ?? "clear";
  const product = facts.packageName ?? facts.title;
  const summary = (facts.packageDescription ?? facts.summary) || "a local-first developer tool";
  const claims = buildClaims(facts, product, summary);

  return {
    schemaVersion: "postmaker.v1",
    sourceRoot: facts.root,
    tone,
    product,
    evidenceFiles: facts.evidenceFiles,
    claims,
    posts: platforms.map((platform) => ({
      platform,
      body: fitToLimit(renderPost(platform, product, summary, claims), PLATFORM_LIMITS[platform] ?? 1000),
      maxLength: PLATFORM_LIMITS[platform] ?? 1000
    })),
    safetyNotes: [
      "Drafts are local files only and are not posted automatically.",
      "Claims marked needs-review must be edited or sourced before publishing.",
      "Tone presets should not impersonate a specific person."
    ]
  };
}

function buildClaims(facts, product, summary) {
  const claims = [
    {
      text: `${product} is described as ${summary}`,
      status: facts.evidenceFiles.length ? "sourced" : "needs-review",
      evidence: facts.evidenceFiles
    }
  ];

  if (facts.changelog) {
    claims.push({
      text: "Recent changes are available in the changelog",
      status: "sourced",
      evidence: ["CHANGELOG.md"]
    });
  } else {
    claims.push({
      text: "A launch note can summarize the current repo state",
      status: "inferred",
      evidence: []
    });
  }

  return claims;
}

function renderPost(platform, product, summary, claims) {
  const sourcedClaim = claims.find((claim) => claim.status === "sourced")?.text ?? summary;
  if (platform === "x") {
    return `${product}: ${summary}\n\nGrounded claim: ${sourcedClaim}\n\nReview claims before posting.`;
  }
  if (platform === "caption") {
    return `${product} helps turn local source evidence into publishable drafts.`;
  }
  return `I am drafting launch material for ${product}.\n\n${summary}\n\nWhy it matters: useful promotion should stay tied to evidence, not vibes.\n\nGrounded claim: ${sourcedClaim}\n\nBefore publishing, review every claim status in the generated pack.`;
}

function fitToLimit(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
