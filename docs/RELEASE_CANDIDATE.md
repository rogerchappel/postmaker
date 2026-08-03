# Release Candidate Notes

## Classification

ship

## 2026-06-17 RC Delta

- Adds campaign angle generation for problem, proof, and ask launch moments.
- Lets CLI users pass `--angle` to narrow generated packs.
- Writes campaign hooks into `launch.md` alongside platform drafts.
- Adds evidence summary metadata, including discovered package scripts.
- Treats smoke commands as sourced local verification claims when present.

## Verification

Run:

```bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
npm run package:smoke
npm run release:registry
npm run release:check
```

The npm package identity is `@rogerchappel/postmaker`; it installs the
`postmaker` command. `release:registry` verifies the package version remains
available before publication, while `package:smoke` installs and executes the
exact tarball that would be published.

## Known Limits

- No external fetching or posting.
- Top-level source file inspection only.
- Drafts need editorial review before publication.
