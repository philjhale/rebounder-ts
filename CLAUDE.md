## Workflow

- Do new work in a new git worktree (not directly on `main`) — create a branch and `git worktree add .worktrees/<branch> -b <branch>` before editing.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `philjhale/rebounder-ts`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) used as-is. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Pull requests

Always fill out `.github/PULL_REQUEST_TEMPLATE.md` in full (Summary, Details, Test plan) when opening a PR with `gh pr create --body`. Leave every Test plan checkbox unticked — describe what to verify, don't run it yourself.

Before opening a PR, run the code-reviewer subagent (.claude/agents/code-reviewer.md) against the diff and address its findings, or note in the PR why a finding wasn't addressed.
