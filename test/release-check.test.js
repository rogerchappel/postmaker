import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRegistry } from "../scripts/check-registry.js";

const fixture = (name) => new URL(`./fixtures/registry/${name}.json`, import.meta.url);

test("accepts an unclaimed package name", async () => {
  await assert.doesNotReject(checkRegistry({ fixture: fixture("available") }));
});

test("rejects an already-published package version", async () => {
  await assert.rejects(
    checkRegistry({ fixture: fixture("unavailable") }),
    /@rogerchappel\/postmaker@0\.1\.0 is unavailable: that version already exists/,
  );
});

test("reports registry errors with package context", async () => {
  await assert.rejects(
    checkRegistry({ fixture: fixture("error") }),
    /Could not check npm registry for @rogerchappel\/postmaker@0\.1\.0: offline fixture failure/,
  );
});
