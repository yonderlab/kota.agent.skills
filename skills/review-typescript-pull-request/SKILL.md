---
name: review-typescript-pull-request
description: Expert PR review for TypeScript, Node.js, and React. Use when the user asks to review a pull request, review a PR, give PR feedback, or provide comprehensive context-aware feedback on changes. Triggers: "review this PR", "review pull request", "PR review", "feedback on this PR".
license: MIT
metadata:
  author: kota
  version: "0.1.0"
---

# Review TypeScript Pull Request

Conduct a comprehensive, context-aware code review as an expert engineer in TypeScript, Node.js, and React. Apply the criteria in [references/review-criteria.md](references/review-criteria.md); only comment on actual issues, not on code that follows established patterns.

## Before commenting

1. Read the PR description and understand the purpose of the changes
2. Examine all modified files to understand scope and impact
3. Understand how the changes fit into the broader codebase
4. Only comment on actual issues, not on code that follows established patterns

## Data gathering

- Fetch PR info using **only** `get_pull_request` and `get_pull_request_files`. Do not use Bash, WebFetch, or `get_pull_request_diff`.
- Do not call identity or notifications APIs; if a username is needed, use the `GITHUB_ACTOR` env var.

## Review workflow

1. Fetch the PR (title, body, base/head, state) and the list of modified files with `get_pull_request` and `get_pull_request_files`
2. Read the PR description and each modified file (or relevant portions) to understand context and scope
3. Apply the criteria in [references/review-criteria.md](references/review-criteria.md): TypeScript type safety, testing, flow/integration, code quality
4. Compose the review using the structured output format below
5. Post the review: add a single summary comment with `add_issue_comment`, and add inline comments for specific line-level issues with `add_pull_request_review_comment`. If you have already commented on the PR, update the existing summary comment instead of creating a new one; do not repeat previous comments

## Structured review output

Use this exact structure in the summary comment:

- **Summary** – Brief overview of the PR and overall assessment
- **TypeScript type safety** – Findings on types, casting, guards, Zod, enums, null safety
- **Testing coverage** – Whether new/changed logic is tested; edge cases and failure paths; gaps
- **Flow and integration analysis** – Routes, loaders, actions, forms, API contracts, provider patterns, data flow
- **Code quality and architecture** – SOLID/DRY, performance, error handling, security
- **Strengths** – What is done well
- **Issues** – List with specific file/line references
- **Recommendations** – Actionable next steps

Provide constructive feedback with specific suggestions. Use inline comments only for contextually appropriate, line-specific concerns.

## Required actions

1. After analyzing the PR, post review feedback as a comment on the PR
2. Use `add_issue_comment` to post the full structured summary
3. Use `add_pull_request_review_comment` for inline comments on specific code issues
4. Always post the comment; do not only analyze without commenting
5. If you have already commented, update the existing summary rather than creating a new one, and do not repeat earlier comments
