---
name: create-pull-request
description: Create a pull request following the team's PR template and validation rules. Use when the user asks to create a pull request, create a PR, open a pull request, draft a PR, or prepare changes for review.
version: 1.0.0
author: Engineering
tags:
  - git
  - github
  - pull-request
  - code-review
requirements:
  tools:
    - git
    - gh
---

# Create Pull Request

Create a well-structured pull request that follows the team's PR template requirements and passes automated validation.

## Preconditions

### Validate GitHub CLI

Ensure the GitHub CLI is authenticated:

```bash
gh auth status
```

If not authenticated, stop and ask the user to run:

```bash
gh auth login
```

### Validate git state

Check the current branch and status:

```bash
git rev-parse --abbrev-ref HEAD
git status
```

If on `main` or `master`:

- Stop
- Ask the user to create a feature branch first

If there are uncommitted changes:

- Stop
- Ask the user to commit changes first (consider using the `conventional-commit` skill)

### Validate upstream branch

Check if the branch has been pushed:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

If no upstream exists, push the branch:

```bash
git push -u origin HEAD
```

## PR Template Requirements

The team uses a PR template with the following required sections:

1. **About PR** - Description of what changed and why (REQUIRED, cannot be empty or just HTML comments)
2. **Preview** - Screenshot or recording (REQUIRED for: Bug fix, New feature, Refactor, Improvement)
3. **How to test** - Testing instructions for reviewers
4. **Type of change** - Must check at least one:
   - Bug fix 🐛
   - New feature ✨
   - Refactor 🧹
   - Improvement 📈
   - Documentation 📝
   - Testing 🧪

### Validation Rules

- **BLOCKING** (must pass before merge): New feature, Improvement
- **WARNING** (should pass but won't block): Bug fix, Refactor
- **INFORMATIONAL**: Documentation, Testing

Visual proof (screenshot/recording) is required for:

- Bug fix
- New feature
- Refactor
- Improvement

Acceptable visual proof formats:

- Inline images: `![alt](url)`
- Inline videos: `<video src="url"></video>`
- External links: Loom, YouTube, Vimeo, GitHub attachments

## Steps

### 1. Gather context

Review the changes on the current branch:

```bash
git diff main...HEAD --stat
git log main..HEAD --oneline
```

Understand:

- What changed (files, features, fixes)
- Why it changed (problem being solved)
- How to test it

### 2. Determine PR type

Based on the changes, identify the primary type:

- **Bug fix**: Fixes a defect or unexpected behavior
- **New feature**: Adds wholly new functionality
- **Refactor**: Restructures code without changing behavior
- **Improvement**: Enhances existing functionality
- **Documentation**: Only documentation changes
- **Testing**: Only test changes

If multiple types apply, choose the primary one.

### 3. Collect visual proof (if required)

For Bug fix, New feature, Refactor, or Improvement:

- Ask the user to provide a screenshot, recording, or link
- Verify the format is acceptable (see acceptable formats above)
- If the user cannot provide visual proof, warn them that validation will fail

### 4. Draft the PR description

Create a description following this structure:

```markdown
## About PR 📝

[2-3 sentences describing what changed and why. Must be substantive - cannot be empty or just comments]

## Preview (screenshot or recording) 🖼️

[If required: Paste screenshot, upload video, or provide link]

## How to test 🧪

1. [Step-by-step testing instructions]
2. [What reviewers should check]
3. [Edge cases or specific scenarios to verify]

## Type of change 🔧

- [x] [Selected type from above]
- [ ] [Other types, unchecked]
```

### 5. Generate a concise title

Create a title that:

- Starts with a verb (Add, Fix, Update, Refactor, etc.)
- Is concise (< 72 characters)
- Describes the change, not the implementation

Examples:

- ✅ "Add user profile settings page"
- ✅ "Fix age validation for student dependants"
- ❌ "Update UserProfile.tsx and add new component"

### 6. Create the PR

Use the GitHub CLI to create the PR:

```bash
gh pr create --title "Your title here" --body "$(cat <<'EOF'
[Your complete PR description here]
EOF
)"
```

If creating a draft PR:

```bash
gh pr create --draft --title "Your title here" --body "$(cat <<'EOF'
[Your complete PR description here]
EOF
)"
```

### 7. Verify creation

After creation:

- Display the PR URL to the user
- Note that GitHub Actions will automatically validate the PR description
- If validation fails, the user can edit the PR description on GitHub

## Validation Script Reference

The repository includes `scripts/validate-pr-description.js` which:

- Checks "About PR" is filled (not empty or just comments)
- Verifies at least one type is selected
- Ensures visual proof exists for applicable types
- Returns exit code 1 for blocking failures (New feature, Improvement)
- Returns exit code 1 for warnings (other types with missing requirements)

## Notes

- Do not create PRs with empty or placeholder descriptions
- If the user is unsure about testing steps, help them think through the verification process
- For blocking PR types (New feature, Improvement), all validations must pass
- Visual proof is non-negotiable for the specified types
- The PR can be edited after creation if validation fails

## Outcome

- A pull request is created with:
  - A clear, concise title
  - A complete description following the template
  - All required sections filled
  - Visual proof (if required by type)
  - Appropriate type selection
- The PR is ready for team review
- Automated validation will run and provide feedback
