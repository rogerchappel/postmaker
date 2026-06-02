# Orchestration

## Agent Routine

1. Run `postmaker from-repo <repo> --platform <platform> --out <dir>`.
2. Read `<dir>/post-pack.json` and review claim statuses.
3. Run `postmaker check <dir>/post-pack.json --source <repo>`.
4. Hand the drafts to a human or approved publishing workflow.

## Boundaries

- Local reads: README, package metadata, changelog.
- Local writes: generated post pack and launch note.
- External actions: none in this package.

## Failure Handling

- Missing evidence blocks publishing.
- `needs-review` claims require editing or sourcing.
- Overlong platform posts must be shortened before use.
