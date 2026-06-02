# PRD: postmaker

## Problem

Agents can draft posts quickly, but unsupported claims and platform-specific length drift make those drafts risky to publish.

## Goals

- Generate platform-specific social drafts from local evidence.
- Mark claims as sourced, inferred, or needs-review.
- Keep publishing outside the tool boundary.
- Provide a checker that blocks missing evidence and overlong posts.

## Non-Goals

- Posting through social APIs.
- Scraping private profiles.
- Mimicking a specific person's voice.
- Replacing editorial review.

## Users

- OSS maintainers preparing launch updates.
- Founder-led content workflows.
- Agents turning repo updates into draft posts.

## MVP

The MVP ships a Node CLI with `from-repo` and `check`, a fixture source repo, tests, smoke command, safety notes, and skill instructions.

## Success Criteria

- Fixture repo produces deterministic LinkedIn and X drafts.
- Missing evidence fails checks.
- X posts stay within the configured character limit.
