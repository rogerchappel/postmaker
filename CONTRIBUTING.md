# Contributing

Small, focused pull requests are easiest to review.

Before opening a PR, run:

```sh
npm test
npm run check
npm run smoke
npm run package:smoke
npm run release:check
```

Update README or docs when CLI behavior, claim status rules, generated manifest fields, or release expectations change. Keep fixtures small and do not commit private source material or real account data.
