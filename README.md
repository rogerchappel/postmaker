# postmaker

`postmaker` generates grounded social draft packs from local source evidence. It is designed for agents that need to draft LinkedIn posts, X posts, captions, and launch notes without posting or inventing unsupported claims.

## Quickstart

```bash
npm install
npm run smoke
node bin/postmaker.js from-repo fixtures/source-repo --platform linkedin --platform x --out posts
node bin/postmaker.js from-repo fixtures/source-repo --angle proof --out proof-posts
node bin/postmaker.js check posts/post-pack.json --source fixtures/source-repo
```

## CLI

```bash
postmaker from-repo ./repo --platform linkedin --platform x --out posts/
postmaker check posts/post-pack.json --source ./repo
```

## Campaign Angles

Post packs include campaign angles alongside platform drafts:

- `problem` explains why evidence-grounded launch copy matters.
- `proof` highlights a sourced claim from the repo.
- `ask` invites builders to try the project and report unclear claims.

Pass `--angle` one or more times to narrow the generated pack for a specific
launch moment.

## Claim Statuses

- `sourced`: backed by a local evidence file.
- `inferred`: reasonable from local context, but not directly quoted.
- `needs-review`: should not be published until sourced or edited.

## Safety Notes

- `postmaker` never posts to external platforms.
- Drafts should be reviewed before publication.
- Tone presets are generic and should not impersonate a person.

## Limitations

- V1 reads top-level README, package metadata, and changelog files.
- It generates draft structure, not final editorial approval.
- It does not fetch external source material.

## Development

Run the same checks locally before opening a PR:

- `npm run check` - node --check src/*.js && node --check bin/postmaker.js
- `npm run build` - npm run check
- `npm test` - node --test
- `npm run smoke` - node bin/postmaker.js from-repo fixtures/source-repo --platform linkedin --platform x --out .tmp/posts && node bin/postmaker.js check .tmp/posts/post-pack.json --source fixtures/source-repo

## Release Readiness

Use the checked-in scripts before opening or publishing a release:

```sh
npm test
npm run check
npm run smoke
npm run package:smoke
npm run release:check
```

The package smoke uses `npm pack --dry-run` so the published file list can be reviewed without publishing.
