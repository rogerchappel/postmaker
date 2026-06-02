# postmaker

`postmaker` generates grounded social draft packs from local source evidence. It is designed for agents that need to draft LinkedIn posts, X posts, captions, and launch notes without posting or inventing unsupported claims.

## Quickstart

```bash
npm install
npm run smoke
node bin/postmaker.js from-repo fixtures/source-repo --platform linkedin --platform x --out posts
node bin/postmaker.js check posts/post-pack.json --source fixtures/source-repo
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
