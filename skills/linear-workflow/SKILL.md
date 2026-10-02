---
name: linear-workflow
description: Workflow for picking up and working on Linear issues — syncing with the latest default branch, branch naming, checkpoint commits, and keeping the issue updated. Use when the user asks to pick up, start, work on, or continue a Linear ticket or issue.
license: MIT
metadata:
  author: kota
  version: "0.1.0"
---

# Linear Workflow

Keeps work on a Linear issue consistent: every ticket starts from an up-to-date default branch, lives on its own branch, is committed in logical steps, and leaves a visible trail on the issue.

## When To Use

- "Pick up ABC-123"
- "Start work on this Linear ticket"
- "Work on the issue linked below"
- "Continue with ABC-123"
- Any task whose source is a Linear issue

## How It Works

1. **Read the issue.** Fetch the issue (title, description, checklist, comments) before writing any code.
2. **Start from the latest default branch.** Never branch from a stale local `main` or from another feature branch. If there are uncommitted changes, stash or commit them first, then:
   ```bash
   git fetch origin main
   git checkout -b <issue-id>-<issue-title-kebab-case> origin/main
   ```
   Use the repo's default branch if it isn't `main`. If the issue branch already exists, check it out and bring it up to date with `git fetch origin main && git merge origin/main`.
3. **Name the branch** in kebab-case from the issue ID and title, e.g. `abc-123-add-login-form`. Follow any branch convention in the repo's `AGENTS.md`/`CLAUDE.md` if it differs.
4. **Checkpoint with commits** at each logical stage, using Conventional Commits (see the `conventional-commit` skill).
5. **Keep the issue current.**
   - Tick off checklist items in the issue as you complete them.
   - Comment on the issue with progress at meaningful milestones.
6. **Handle discovered work.**
   - Related to the current issue → add it as a new checklist item on the issue.
   - Unrelated → leave a `TODO` comment in the code, create a new Linear issue for it, and put the new issue ID in the `TODO`.
   - Create new issues in the team named in the repo's `AGENTS.md`/`CLAUDE.md`; if none is named, use the current issue's team, unless the user says otherwise.
7. **Don't mark the issue as done.** Leave status transitions to the team's automation (e.g. Linear's GitHub integration moving the issue on PR merge) unless the user explicitly asks.

## Examples

- **"Pick up ABC-123"** → read ABC-123, `git fetch origin main`, create `abc-123-<title>` from `origin/main`, implement in conventional-commit checkpoints, tick off the issue's checklist, and post a progress comment.
- **"Carry on with ABC-123"** (branch already exists) → check out the existing branch, merge in the latest `origin/main`, then continue.
- **Spotting an unrelated bug mid-task** → add `// TODO(ABC-140): …`, create ABC-140 in the configured team, and keep going with the original issue.
