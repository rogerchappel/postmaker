# postmaker Skill

The npm package is not published yet. Install the packed artifact from a clean
source checkout, then use the shorter `postmaker` executable shown below:

```bash
git clone https://github.com/rogerchappel/postmaker.git
cd postmaker
npm ci
npm pack
npm install --global --prefix "$PWD/.tmp/postmaker-install" ./rogerchappel-postmaker-0.1.0.tgz
export PATH="$PWD/.tmp/postmaker-install/bin:$PATH"
postmaker --help
```

## When To Use

Use this skill when an agent needs to turn a local repo, product brief, or changelog into social draft material with explicit claim review.

## Required Inputs

- A local source directory.
- One or more requested platforms.
- A local output directory.

## Side-Effect Boundaries

The skill reads local evidence files and writes local Markdown/JSON drafts. It does not post, schedule, scrape profiles, or call social APIs.

## Approval Requirements

Ask for explicit approval before publishing, scheduling, using private profile context, or calling any external platform API.

## Workflow

```bash
postmaker from-repo ./repo --platform linkedin --platform x --out posts
postmaker from-repo ./repo --angle proof --out proof-posts
postmaker check posts/post-pack.json --source ./repo
```

Review `posts/launch.md` and the claim list in `post-pack.json`. Rewrite or remove any `needs-review` claim before publication.
Use campaign angles when an agent needs a launch sequence rather than a single
draft. Keep the generated `post-pack.json` with the launch note so reviewers can
trace each hook back to sourced, inferred, or needs-review claims.

## Validation

Run `npm test`, `npm run check`, and `npm run smoke`. The checker validates schema shape, evidence paths, claim statuses, and platform length limits.
