# postmaker

`postmaker` generates grounded social draft packs from local source evidence. It is designed for agents that need to draft LinkedIn posts, X posts, captions, and launch notes without posting or inventing unsupported claims.

## Quickstart

Until the first npm release is published, build and install the exact package
artifact from a source checkout:

```bash
git clone https://github.com/rogerchappel/postmaker.git
cd postmaker
npm ci
npm pack
npm install --global --prefix "$PWD/.tmp/postmaker-install" ./rogerchappel-postmaker-0.1.0.tgz
./.tmp/postmaker-install/bin/postmaker --help
```

The scoped registry package is not published yet. These commands exercise the
same packed tarball that will be released rather than depending on an
unavailable registry artifact.

For local development:

```bash
npm install
npm run smoke
node bin/postmaker.js from-repo fixtures/source-repo --platform linkedin --platform x --out posts
node bin/postmaker.js from-repo fixtures/source-repo --angle proof --out proof-posts
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

## Campaign Angles

Post packs include campaign angles alongside platform drafts:

- `problem` explains why evidence-grounded launch copy matters.
- `proof` highlights a sourced claim from the repo.
- `ask` invites builders to try the project and report unclear claims.

Pass `--angle` one or more times to narrow the generated pack for a specific
launch moment.

Supported `--platform` values are `linkedin`, `x`, `caption`, and `launch`.
Supported `--angle` values are `problem`, `proof`, and `ask`. Repeating either
option is supported. Unsupported values, or an option followed by another flag
instead of a value, exit non-zero and print the supported values.

Both commands reject unknown flags and unexpected positional arguments with a
non-zero exit. Run `postmaker --help` to see the accepted command shapes.
The `check` command always prints a JSON report for a readable post pack. Schema
validation failures set `ok` to `false` and exit non-zero, including when
`posts`, `claims`, or `campaignAngles` has the wrong collection type or contains
a non-object entry. Entry errors identify the collection and zero-based index.

## Claim Statuses

- `sourced`: backed by a local evidence file.
- `inferred`: reasonable from local context, but not directly quoted.
- `needs-review`: should not be published until sourced or edited.

## Safety Notes

- `postmaker` never posts to external platforms.
- Drafts should be reviewed before publication.
- Tone presets are generic and should not impersonate a person.

## Limitations

- V1 reads top-level README, package metadata, and changelog files. README
  summaries use the first prose paragraph, skipping headings and common
  badge, image, link-only, list, quote, table, and code front matter. This is
  structural Markdown filtering rather than full semantic interpretation.
- It generates draft structure, not final editorial approval.
- It does not fetch external source material.

## Development

Run the same checks locally before opening a PR:

- `npm run check` - node --check src/*.js && node --check bin/postmaker.js
- `npm run build` - npm run check
- `npm test` - node --test
- `npm run smoke` - node bin/postmaker.js from-repo fixtures/source-repo --platform linkedin --platform x --out .tmp/posts && node bin/postmaker.js check .tmp/posts/post-pack.json --source fixtures/source-repo
- `npm run package:smoke` - pack, install, inspect, and execute the local tarball
- `npm run docs:install-check` - match public install instructions to npm availability
- `bash demo/run-demo-source.sh` - generate and verify the public demo fixture pack

## Release Readiness

Use the checked-in scripts before opening or publishing a release:

```sh
npm test
npm run check
npm run smoke
npm run package:smoke
npm run docs:install-check
npm run release:registry
npm run release:check
```

The package smoke installs the produced tarball, verifies its
`@rogerchappel/postmaker` name, version, and `postmaker` bin, then invokes the
installed command. The registry preflight checks that the configured version is
still publishable without publishing it. A registry/network failure stops the
release with an actionable error rather than guessing.
