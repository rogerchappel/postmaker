import { collectSourceFacts } from "./sourceFacts.js";

const PLATFORM_LIMITS = {
  linkedin: 1300,
  x: 280,
  caption: 180,
  launch: 900
};

const DEFAULT_ANGLES = ["problem", "proof", "ask"];

export async function buildPostPack(sourceDir, options = {}) {
  const facts = await collectSourceFacts(sourceDir);
  const platforms = options.platforms ?? ["linkedin", "x"];
  const tone = options.tone ?? "clear";
  const product = facts.packageName ?? facts.title;
  const summary = (facts.packageDescription ?? facts.summary) || "a local-first developer tool";
  const claims = buildClaims(facts, product, summary);
  const angles = options.angles ?? DEFAULT_ANGLES;

  return {
    schemaVersion: "postmaker.v1",
    sourceRoot: facts.root,
    tone,
    product,
    evidenceFiles: facts.evidenceFiles,
    evidenceSummary: {
      files: facts.evidenceFiles.length,
      scripts: facts.scripts,
      hasChangelog: Boolean(facts.changelog)
    },
    claims,
    campaignAngles: angles.map((angle) => buildCampaignAngle(angle, product, summary, claims)),
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

function buildCampaignAngle(angle, product, summary, claims) {
  const sourcedClaim = claims.find((claim) => claim.status === "sourced")?.text ?? summary;
  if (angle === "proof") {
    return {
      name: "proof",
      hook: `${product} launch copy should cite repo evidence before it asks for attention.`,
      supportingClaim: sourcedClaim
    };
  }
  if (angle === "ask") {
    return {
      name: "ask",
      hook: `Invite builders to try ${product} locally and report unclear claims.`,
      supportingClaim: "Drafts stay local until a human reviews every claim status."
    };
  }
  return {
    name: "problem",
    hook: `Useful launch posts for ${product} should be grounded in source files, not guesswork.`,
    supportingClaim: summary
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

  if (facts.scripts.includes("smoke")) {
    claims.push({
      text: "The source package includes a smoke command for local verification",
      status: "sourced",
      evidence: ["package.json"]
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
