# RC Verification

Date: 2026-06-10

## Commands

- `npm test` - passed, 8 tests.
- `npm run check` - passed.
- `npm run smoke` - passed, generated `.tmp/posts/post-pack.json` and checked `ok=true`, `posts=2`, `claims=2`.
- `bash scripts/validate.sh` - passed.

## Review Focus

- Platform-specific draft generation.
- Claim status and evidence validation.
- Agent skill side-effect boundaries.
