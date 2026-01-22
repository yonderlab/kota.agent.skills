---
name: conventional-commit
description: Create one or more Conventional Commits using Commitizen and push the current branch.
version: 1.1.0
author: Engineering
tags:
  - git
  - conventional-commits
  - commitizen
  - release-hygiene
requirements:
  tools:
    - git
    - node
---

# Conventional Commit

Create one or more well-structured Conventional Commits using Commitizen, enforcing branch naming rules and safe commit practices, then push the branch to the remote.

## Preconditions

### Validate current branch

Run:

git rev-parse --abbrev-ref HEAD

If the branch is `main` or `master`:

- Stop
- Ask the user to create a feature branch tied to a work item (Linear, Jira, etc.)

### Validate branch naming

Branch names must follow this pattern:

```
<TICKET_PREFIX>-<number>-<kebab-case-description>
```

Examples:

ENG-1333-migrate-review-and-confirm-flow
PLAT-42-add-rate-limit-middleware
CORE-901-refactor-auth-session-handling

Rules:

- TICKET_PREFIX must be uppercase letters only (A-Z)
- Number must be numeric
- Description must be lowercase kebab-case

If the branch name does not match:

- Stop
- Ask the user to rename the branch before continuing

This rule is intentionally team-agnostic while enforcing traceability.

## Bootstrap Commitizen

Ensure Commitizen is available locally for the repository.

Check for Commitizen:

node_modules/.bin/cz

If missing, install locally:

npm install --no-save commitizen cz-conventional-changelog

This avoids global installs and keeps the skill self-contained.

## Steps

1. Review the current state

   git status
   git diff
   git log -1 --oneline

2. Group changes logically

   - Identify distinct concerns that should become separate commits
   - Prefer multiple small commits over a single large commit

3. Create commits

   For each logical group:

   - Stage only the relevant files or hunks
   - Run:

     npx cz

   - Follow the prompts to produce a valid Conventional Commit:
     - type (feat, fix, chore, etc.)
     - optional scope
     - clear, concise description
     - breaking change or footer metadata if applicable

4. Push the branch

   If no upstream is set:

   git push -u origin HEAD

   Otherwise:

   git push

## Notes

- Do not commit secrets, credentials, or environment files
- Commit messages should describe intent and impact, not implementation detail
- When in doubt, split commits
- This skill does not perform rebases, squashes, or force pushes

## Outcome

- Commits conform to the Conventional Commits specification
- History is suitable for automated changelogs and semantic versioning
- The branch is pushed and ready for review
