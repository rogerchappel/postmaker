# Demo: Evidence-Backed Social Draft Pack

This demo uses `examples/demo-source` to show postmaker's core promise: generate
draft social posts from files in a local repo and keep claim status visible.

## Run It

```bash
bash demo/run-demo-source.sh
```

The script writes a temporary `post-pack.json`, checks it against the same
fixture source, and verifies that the pack includes a LinkedIn draft plus at
least one sourced claim.

## What To Show

- `examples/demo-source/README.md` provides the source bullets.
- `examples/demo-source/package.json` provides the product description.
- `post-pack.json` includes `claims`, `evidenceFiles`, `posts`, and
  `safetyNotes`.
- The checker is a review gate, not a publisher.

## Short Video Brief

1. Open the fixture README and point at the three source bullets.
2. Run `bash demo/run-demo-source.sh`.
3. Open the generated JSON and show `status: sourced`.
4. Explain that postmaker creates reviewable drafts only; it does not post.

## Social Hooks

- "Draft launch posts without losing sight of which claims are actually sourced."
- "For agent workflows, social copy should be an artifact with evidence, not a
  leap of faith."
- "postmaker turns local repo facts into reviewable draft packs for LinkedIn, X,
  captions, and launch notes."
