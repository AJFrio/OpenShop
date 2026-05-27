# Planning workflow

Execution plans are **first-class, versioned artifacts** so agents (and humans) can resume work without external context.

## Where plans live

| Location | Use |
|----------|-----|
| `docs/exec-plans/active/` | Work in progress |
| `docs/exec-plans/completed/` | Finished plans (archive) |
| `docs/exec-plans/tech-debt-tracker.md` | Ongoing debt register |

## Lightweight change

For small fixes: a PR description with **goal**, **approach**, and **test plan** is enough. No separate plan file required.

## Complex change

Create `docs/exec-plans/active/<short-name>.md` with:

```markdown
# Title

## Goal
One paragraph.

## Context
Links to specs, issues, ARCHITECTURE sections.

## Tasks
- [ ] Task 1
- [ ] Task 2

## Decisions
| Date | Decision | Rationale |

## Verification
How to confirm done (commands, manual steps).
```

On completion: move the file to `docs/exec-plans/completed/` and link from the PR.

## Tech debt

Add rows to [tech-debt-tracker.md](./exec-plans/tech-debt-tracker.md) instead of hiding debt in comments only.
