import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectSourceFacts } from "../src/sourceFacts.js";

async function withReadme(markdown, assertion) {
  const sourceDir = await mkdtemp(path.join(os.tmpdir(), "postmaker-source-facts-"));
  await writeFile(path.join(sourceDir, "README.md"), markdown);

  try {
    await assertion(await collectSourceFacts(sourceDir));
  } finally {
    await rm(sourceDir, { recursive: true, force: true });
  }
}

test("extracts a normal README prose summary", async () => {
  await withReadme("# Widget\n\nA focused tool for local workflows.\n", (facts) => {
    assert.equal(facts.title, "Widget");
    assert.equal(facts.summary, "A focused tool for local workflows.");
  });
});

test("skips badge, image, and link-only README front matter", async () => {
  await withReadme(
    [
      "# Widget",
      "",
      "[![CI](https://img.shields.io/badge/ci-passing.svg)](https://example.test/ci)",
      "[Documentation](https://example.test/docs)",
      "![Product screenshot](screenshot.png)",
      "",
      "Actual user-facing summary with an [inline documentation link](https://example.test/docs)."
    ].join("\n"),
    (facts) => {
      assert.equal(
        facts.summary,
        "Actual user-facing summary with an [inline documentation link](https://example.test/docs)."
      );
    }
  );
});
