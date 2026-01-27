# PR Template

Use this exact template structure when creating pull requests. The CI validation script (`validate-pr-description.js`) checks for these sections.

## Template

```markdown
## About PR 📝

<!-- Describe what changes you introduced and why. -->

## Preview (screenshot or recording) 🖼️

<!-- Place a screenshot or recording here (if applicable). -->

## How to test 🧪

<!-- Describe how to test these changes or what reviewers should check. -->

## Type of change 🔧

- [ ] Bug fix 🐛
- [ ] New feature ✨
- [ ] Refactor 🧹
- [ ] Improvement 📈
- [ ] Documentation 📝
- [ ] Testing 🧪
```

## Validation Rules

The CI script validates three things:

### 1. About PR Section (Required)

- **Cannot be empty** - Must contain actual content
- **HTML comments don't count** - The script strips all `<!-- ... -->` comments before checking
- If only comments remain after stripping, it's considered empty

### 2. Type of Change (Required)

- **Must check at least one** checkbox using `[x]` or `[X]`
- The script looks for patterns like `- [x] Bug fix` (case-insensitive)

### 3. Visual Proof (Conditionally Required)

Required when you select any of these types:
- Bug fix
- New feature
- Refactor
- Improvement

**Not required** for:
- Documentation
- Testing

The script detects visual proof by looking for:
- Inline images: `![alt](url)`
- Inline videos: `<video>` tags
- External links containing: `loom.com`, `youtube.com`, `youtu.be`, `vimeo.com`, `github.com/user-attachments/assets`, or `githubusercontent.com` URLs ending in `.png`, `.jpg`, `.jpeg`, `.gif`, `.mp4`, `.webm`

## Severity Levels

The script determines severity based on selected change types:

| Selected Type | Severity | Behavior |
|---------------|----------|----------|
| New feature | **BLOCKING** | PR cannot merge if validation fails |
| Improvement | **BLOCKING** | PR cannot merge if validation fails |
| Bug fix | WARNING | Check fails but doesn't block merge |
| Refactor | WARNING | Check fails but doesn't block merge |
| Documentation | NONE | No validation failure |
| Testing | NONE | No validation failure |

If multiple types are selected, the highest severity applies (blocking > warning > none).

## Example: Valid PR Description

```markdown
## About PR 📝

Add OAuth2 authentication support for the user login flow. This enables users to sign in with Google and GitHub accounts, reducing friction in the onboarding process and improving security by delegating password management to trusted identity providers.

## Preview (screenshot or recording) 🖼️

![OAuth login buttons](https://github.com/user-attachments/assets/abc123.png)

## How to test 🧪

1. Navigate to the login page
2. Click "Sign in with Google" or "Sign in with GitHub"
3. Complete the OAuth flow in the popup
4. Verify you're redirected back and logged in
5. Check that user profile shows the correct email and avatar

## Type of change 🔧

- [ ] Bug fix 🐛
- [x] New feature ✨
- [ ] Refactor 🧹
- [ ] Improvement 📈
- [ ] Documentation 📝
- [ ] Testing 🧪
```

## Common Validation Failures

### "About PR section is empty"

**Cause**: The About PR section contains only HTML comments or whitespace.

```markdown
## About PR 📝

<!-- Describe what changes you introduced and why. -->
```

**Fix**: Add actual content describing the change:

```markdown
## About PR 📝

Add user profile settings page allowing users to update their display name and avatar.
```

### "No type of change selected"

**Cause**: No checkbox is marked with `[x]`.

**Fix**: Check at least one type:

```markdown
- [x] New feature ✨
```

### "Screenshot or recording required for: New feature"

**Cause**: A visual-required type is selected but no visual proof detected.

**Fix**: Add one of:
- Drag/drop an image directly into the PR description (GitHub creates a link)
- Inline image: `![description](https://...)`
- Video tag: `<video src="https://..."></video>`
- Link to Loom, YouTube, etc.
