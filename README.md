# postmaker

`postmaker` generates grounded social draft packs from local source evidence. It is designed for agents that need to draft LinkedIn posts, X posts, captions, and launch notes without posting or inventing unsupported claims.

## Quickstart

```bash
npm install
npm run smoke
node bin/postmaker.js from-repo fixtures/source-repo --platform linkedin --platform x --out posts
node bin/postmaker.js check posts/post-pack.json --source fixtures/source-repo
```

Run the checked-in demo fixture:

```bash
bash demo/run-demo-source.sh
```

## CLI

```bash
postmaker from-repo ./repo --platform linkedin --platform x --out posts/
postmaker check posts/post-pack.json --source ./repo
```

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
- `bash demo/run-demo-source.sh` - generate and verify the public demo fixture pack

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
