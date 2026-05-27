# Harness adoption

OpenShop scaffolded an **engineering harness** based on [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) (OpenAI, Feb 2026).

## What we adopted

- Short `AGENTS.md` as agent map
- Structured `docs/` knowledge base with design docs, plans, and quality tracking
- Mechanical validation (`npm run harness:validate`) and CI workflow
- Architecture import rules aligned to Workers + React split

## What we did not copy verbatim

- Million-line monorepo tooling (custom PromQL stacks, per-worktree observability) — out of scope for this OSS repo size
- Zero human-written code policy — humans and agents both contribute here

## Maintenance

See [HARNESS.md](../HARNESS.md). Update [QUALITY_SCORE.md](../QUALITY_SCORE.md) when domains improve.
