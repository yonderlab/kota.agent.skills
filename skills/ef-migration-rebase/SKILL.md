---
name: ef-migration-rebase
description: Detect and fix out-of-order EF Core migrations in a .NET project after merging or rebasing against main/master, then commit the fix. Designed for unattended CI/CD pipelines — never prompts, always makes a deterministic decision or fails with a non-zero exit. Use this skill whenever a pipeline job needs to verify and correct EF Core migration ordering before a PR can merge, or when the user mentions "migration conflict", "migration ordering", "rebase migration", "migration is behind main", "EF migration timestamp", or "migration out of order". Works on .NET projects using Entity Framework Core migrations.
---

# EF Core Migration Rebase (Pipeline Mode)

When two branches each add a migration, EF Core orders them by the 14-digit timestamp prefix on the filename (`yyyyMMddHHmmss_Name.cs`). If a teammate's migration was merged into `main`/`master` after this branch was created, the branch's migration is now *earlier* than the one that was merged, so EF will insert it into the middle of the history rather than at the end — which is almost always wrong.

This skill fixes that by running `dotnet ef migrations add <OriginalName>` against the current state of the target branch, then copying the `Up()` and `Down()` method bodies from the original migration into the newly scaffolded file and deleting the original. The result is a migration with a correct timestamp *and* a correct, in-sync `ModelSnapshot.cs` — without any manual timestamp arithmetic or snapshot editing.

Built for unattended execution in CI/CD: no prompts, no clarifying questions, deterministic decisions, and a non-zero exit with a clear diagnostic whenever a safe automatic fix isn't possible.

## Operating principles

1. **Never prompt.** There is no interactive user. Every decision is deterministic.
2. **Fail loudly, not silently.** When a situation is ambiguous or unsafe, exit non-zero with a clear message so the pipeline surfaces it to a human. Do not guess.
3. **Commit only what the skill itself changed.** Stage exactly the files touched. Never `git add .` or `git add -A`.
4. **Idempotent.** Running twice on an already-fixed branch is a no-op that exits 0.
5. **Never push.** Pushing is the pipeline's responsibility.

## The approach

Instead of renaming the original migration and hand-updating its Designer and the snapshot, the skill uses EF Core itself to produce a correct scaffold:

1. Capture the original migration's `Up()` and `Down()` method bodies as raw text.
2. Delete the original migration's `.cs` and `.Designer.cs` files.
3. Run `dotnet ef migrations add <OriginalName>`. EF scaffolds a new migration with a current timestamp and writes a `ModelSnapshot.cs` that's correctly rebased on the target branch.
4. Splice the captured `Up()`/`Down()` bodies into the new `.cs` file. Leave the Designer and the snapshot as EF produced them.
5. Build, verify, commit.

The key insight: EF's snapshot after step 3 already reflects the target branch's state plus whatever model changes your branch introduced (because those changes live in the C# model classes, not in the migration file). So the scaffolded Designer and snapshot are correct *by construction*. The only thing that needs to be preserved is your hand-written migration logic.

## When to use this skill

- A pipeline step on a PR branch that checks "is the migration in the right order, and if not, fix it"
- A pre-merge hook that needs the branch's migration to sort after everything on `main`
- User phrases: "my migration is out of order after rebasing", "there's a newer migration on main, fix mine", "rebase my migration", "regenerate the migration against main"

## The workflow

### Step 1: Locate the migrations folder(s)

```bash
MIGRATIONS_DIRS=$(find . -type d -name Migrations -not -path "*/bin/*" -not -path "*/obj/*")
```

Decision rules:
- **Zero directories found** → exit 0 with "No Migrations folder found; nothing to do."
- **One directory found** → proceed with it.
- **More than one** → process each independently. A failure in one must not prevent fixing the others; aggregate results and exit non-zero only at the end if any failed.

### Step 2: Determine the target branch

Try `main`, then `master`, then `origin/main`, then `origin/master`. Fixed order — no config.

```bash
for candidate in main master origin/main origin/master; do
  if git rev-parse --verify --quiet "$candidate" >/dev/null; then
    TARGET="$candidate"
    break
  fi
done

if [ -z "$TARGET" ]; then
  echo "ERROR: No main/master branch found locally or on origin. Run 'git fetch' before this step." >&2
  exit 2
fi
```

If the current branch *is* the target, exit 0 with "On target branch; nothing to rebase."

### Step 3: Find new migrations on the current branch

```bash
NEW_MIGRATIONS=$(git diff --name-only --diff-filter=A "$TARGET"...HEAD -- '*Migrations/*.cs' \
  | grep -E '/[0-9]{14}_[^/]+\.cs$' \
  | grep -v '\.Designer\.cs$')
```

If empty, exit 0 with "No new migrations on this branch; nothing to do." This is also the idempotent-exit path.

### Step 4: Find the latest migration timestamp on the target branch

```bash
TARGET_LATEST=$(git ls-tree -r "$TARGET" --name-only -- '*Migrations/' \
  | grep -oE '[0-9]{14}_[^/]+\.cs$' \
  | grep -v '\.Designer\.cs$' \
  | sort -r \
  | head -n 1 \
  | grep -oE '^[0-9]{14}')
```

If `TARGET_LATEST` is empty (target has no migrations), no rebase is needed — skip to step 10 (verify only). If all migrations on the current branch have timestamps greater than `TARGET_LATEST`, exit 0 with "Migrations already in order."

### Step 5: Detect migration-name collisions

Before touching anything, check that the migration name (the part after the timestamp) doesn't already exist on the target branch:

```bash
for mig in $NEW_MIGRATIONS; do
  NAME=$(basename "$mig" .cs | sed -E 's/^[0-9]{14}_//')
  if git ls-tree -r "$TARGET" --name-only -- "*Migrations/*_${NAME}.cs" | grep -q .; then
    echo "ERROR: A migration named '${NAME}' already exists on ${TARGET}. This looks like a squash-merge or re-applied migration — the regenerate flow would fail or produce a duplicate." >&2
    exit 3
  fi
done
```

This guards against the "this migration was already merged under a different timestamp" case, which a pipeline can't safely auto-resolve.

### Step 6: Verify EF CLI is available

```bash
if ! command -v dotnet >/dev/null || ! dotnet ef --version >/dev/null 2>&1; then
  echo "ERROR: 'dotnet ef' is not available in this pipeline. Install it with 'dotnet tool install --global dotnet-ef'." >&2
  exit 5
fi
```

The regenerate approach requires the EF Core CLI. No fallback — fail fast.

### Step 7: Capture the original migration's Up() and Down() bodies

For each migration in `NEW_MIGRATIONS`, extract the method bodies from the `.cs` file as raw text. The bodies are what's between the `{` and matching `}` of each method — capture them verbatim, whitespace included, so that comments, multi-line `migrationBuilder.Sql(...)` calls, and any hand-authored logic survive the round-trip.

Use a small Python script rather than sed/awk because C# can contain nested braces in string interpolations, verbatim strings (`@"..."`), and raw string literals (`"""..."""`) that trip up line-based tools:

```python
import re, sys, pathlib

def extract_method_body(source: str, method_name: str) -> str:
    """
    Find 'protected override void <method_name>(MigrationBuilder migrationBuilder)'
    and return the text between its opening { and matching closing }, inclusive of
    the newlines immediately inside the braces. Handles nested braces, verbatim
    strings, and raw string literals.
    """
    # Locate the method signature
    pattern = re.compile(
        rf'protected\s+override\s+void\s+{re.escape(method_name)}\s*\(\s*MigrationBuilder\s+\w+\s*\)\s*\{{',
        re.MULTILINE,
    )
    m = pattern.search(source)
    if not m:
        raise RuntimeError(f"Could not find {method_name}() in migration")
    body_start = m.end()  # position right after the opening {

    depth = 1
    i = body_start
    n = len(source)
    while i < n and depth > 0:
        c = source[i]
        if c == '"':
            # Skip string literal. Handle @"...""..." (verbatim) and """..."""(raw)
            if source[i:i+3] == '"""':
                # Raw string literal — skip to closing """
                j = i + 3
                while j < n - 2 and source[j:j+3] != '"""':
                    j += 1
                i = j + 3
                continue
            if i > 0 and source[i-1] == '@':
                # Verbatim string — "" is an escaped quote
                j = i + 1
                while j < n:
                    if source[j] == '"':
                        if j + 1 < n and source[j+1] == '"':
                            j += 2
                            continue
                        break
                    j += 1
                i = j + 1
                continue
            # Regular string — skip escapes
            j = i + 1
            while j < n and source[j] != '"':
                if source[j] == '\\':
                    j += 2
                else:
                    j += 1
            i = j + 1
            continue
        if c == "'":
            # Character literal
            j = i + 1
            while j < n and source[j] != "'":
                if source[j] == '\\':
                    j += 2
                else:
                    j += 1
            i = j + 1
            continue
        if c == '/' and i + 1 < n:
            if source[i+1] == '/':
                # Line comment
                i = source.find('\n', i)
                if i == -1:
                    break
                continue
            if source[i+1] == '*':
                # Block comment
                end = source.find('*/', i + 2)
                i = end + 2 if end != -1 else n
                continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return source[body_start:i]
        i += 1
    raise RuntimeError(f"Unbalanced braces in {method_name}()")

src = pathlib.Path(sys.argv[1]).read_text()
up_body = extract_method_body(src, 'Up')
down_body = extract_method_body(src, 'Down')
# Write to temp files for step 9 to read back.
pathlib.Path(sys.argv[2]).write_text(up_body)
pathlib.Path(sys.argv[3]).write_text(down_body)
```

Save the bodies to temp files (they'll be spliced back in step 9).

### Step 8: Delete the original migration and regenerate via EF

For each migration:

```bash
ORIGINAL_DIR=$(dirname "$MIG")
ORIGINAL_BASENAME=$(basename "$MIG" .cs)              # e.g. 20250612143022_AddUserProfile
NAME=${ORIGINAL_BASENAME#*_}                          # e.g. AddUserProfile

# Find the project that owns the DbContext (the .csproj nearest the Migrations folder).
PROJECT=$(find "$(dirname "$ORIGINAL_DIR")" -maxdepth 2 -name '*.csproj' | head -n 1)

if [ -z "$PROJECT" ]; then
  echo "ERROR: Could not locate the .csproj for migrations folder ${ORIGINAL_DIR}." >&2
  exit 6
fi

# Delete the original migration. Use git rm so the deletion is tracked.
git rm "${ORIGINAL_DIR}/${ORIGINAL_BASENAME}.cs" "${ORIGINAL_DIR}/${ORIGINAL_BASENAME}.Designer.cs"

# Scaffold a new migration with the same name. EF assigns a current timestamp and
# writes a ModelSnapshot.cs that correctly reflects the target branch's state plus
# this branch's model changes.
if ! dotnet ef migrations add "$NAME" --project "$PROJECT"; then
  echo "ERROR: 'dotnet ef migrations add ${NAME}' failed. The model likely has a semantic conflict with ${TARGET} that requires human review." >&2
  exit 7
fi

# Find the newly scaffolded file.
NEW_FILE=$(find "$ORIGINAL_DIR" -maxdepth 1 -name "[0-9]*_${NAME}.cs" -not -name '*.Designer.cs' -newer "${ORIGINAL_DIR}/.." | head -n 1)

if [ -z "$NEW_FILE" ]; then
  echo "ERROR: EF did not produce a new migration file for ${NAME}." >&2
  exit 7
fi
```

### Step 9: Splice the original Up()/Down() bodies into the new migration

EF scaffolds `Up()` and `Down()` based on what's changed in the model since the last snapshot. There are two cases:

**Case A: EF's scaffolded bodies are empty (or only contain whitespace/comments).**
This is the expected, clean case: the original migration fully captured all model changes, so after rebasing onto the target branch's snapshot, there's nothing new for EF to add. Splice the original bodies in.

**Case B: EF's scaffolded bodies are non-empty.**
This means EF thinks there are still model changes that weren't represented in the original migration — which typically means the original was hand-edited or the model changed in ways the original didn't cover. Overwriting would silently lose that delta.

Per the agreed design: **fail with a non-zero exit in Case B and let a human review**. Do not overwrite.

```python
import re, sys, pathlib

new_file = pathlib.Path(sys.argv[1])
up_body_captured = pathlib.Path(sys.argv[2]).read_text()
down_body_captured = pathlib.Path(sys.argv[3]).read_text()

source = new_file.read_text()

def find_body_span(source, method_name):
    """Return (body_start, body_end) indices of the method body (excluding braces)."""
    pattern = re.compile(
        rf'protected\s+override\s+void\s+{re.escape(method_name)}\s*\(\s*MigrationBuilder\s+\w+\s*\)\s*\{{',
        re.MULTILINE,
    )
    m = pattern.search(source)
    if not m:
        raise RuntimeError(f"Could not find {method_name}() in scaffolded migration")
    body_start = m.end()
    # Walk to the matching closing brace using the same brace-balancing logic as step 7.
    # (In production, share the function between scripts.)
    depth = 1
    i = body_start
    n = len(source)
    while i < n and depth > 0:
        c = source[i]
        # ... (same string/comment-skipping logic as step 7) ...
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return body_start, i
        i += 1
    raise RuntimeError(f"Unbalanced braces in {method_name}()")

up_start, up_end = find_body_span(source, 'Up')
down_start, down_end = find_body_span(source, 'Down')

# Case B check: is the scaffolded body non-trivial?
def is_trivial(body: str) -> bool:
    # Strip comments and whitespace; if nothing remains, it's trivial.
    no_line = re.sub(r'//[^\n]*', '', body)
    no_block = re.sub(r'/\*.*?\*/', '', no_line, flags=re.DOTALL)
    return no_block.strip() == ''

scaffolded_up = source[up_start:up_end]
scaffolded_down = source[down_start:down_end]

if not is_trivial(scaffolded_up) or not is_trivial(scaffolded_down):
    print(
        "ERROR: The scaffolded migration has a non-empty Up()/Down() after rebasing "
        "onto the target branch. This means the model has additional changes beyond "
        "what the original migration captured. Automatic overwrite refused — a human "
        "should review.",
        file=sys.stderr,
    )
    sys.exit(10)

# Splice in the original bodies. Replace Down() first so the Up() indices stay valid.
spliced = (
    source[:down_start] + down_body_captured + source[down_end:]
)
# Recompute Up() span against the modified source isn't necessary because Down() comes
# after Up() in the file — but do the replacement in reverse order to be safe.
spliced = source[:up_start] + up_body_captured + source[up_end:down_start] + down_body_captured + source[down_end:]

new_file.write_text(spliced)
```

After this step, the new migration's `Up()`/`Down()` match the original's exactly, but the timestamp, Designer, and snapshot are all correct per EF.

### Step 10: Verify

```bash
if ! dotnet build --nologo --verbosity quiet; then
  echo "ERROR: dotnet build failed after rebase." >&2
  exit 8
fi

if dotnet ef migrations has-pending-model-changes --project "$PROJECT" 2>/dev/null | grep -q "True"; then
  echo "ERROR: Pending model changes detected after rebase; the snapshot is out of sync." >&2
  exit 9
fi

# Sanity-check that the new migration now sorts after the target's latest.
NEW_LATEST=$(ls "$ORIGINAL_DIR"/[0-9]*_*.cs 2>/dev/null \
  | grep -v '\.Designer\.cs$' \
  | xargs -n1 basename \
  | grep -oE '^[0-9]{14}' \
  | sort -r \
  | head -n 1)

if [ -n "$TARGET_LATEST" ] && [ "$NEW_LATEST" -le "$TARGET_LATEST" ]; then
  echo "ERROR: New migration timestamp ${NEW_LATEST} is not greater than target's ${TARGET_LATEST}. Refusing to commit." >&2
  exit 11
fi
```

### Step 11: Commit the changes

Stage only what this skill modified: the two deleted original files, the two new EF-scaffolded migration files, and the updated `ModelSnapshot.cs`.

```bash
# Configure identity if not already set (common in fresh CI containers).
git config user.email >/dev/null 2>&1 || git config user.email "ef-migration-rebase@ci.local"
git config user.name  >/dev/null 2>&1 || git config user.name  "EF Migration Rebase Bot"

# The `git rm` in step 8 already staged the deletions. Stage the new files EF created.
git add "$NEW_FILE" "${NEW_FILE%.cs}.Designer.cs" "$SNAPSHOT"

# Idempotency: if nothing actually changed, don't make an empty commit.
if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "chore(migrations): regenerate migration after ${TARGET} update

Regenerated ${NAME} using 'dotnet ef migrations add' so its timestamp sorts
after the latest migration on ${TARGET}, and the ModelSnapshot reflects the
rebased state. Original Up()/Down() bodies preserved verbatim.

Automated by ef-migration-rebase skill.

Original: ${ORIGINAL_BASENAME}
New:      $(basename "${NEW_FILE}" .cs)"
```

Do not push.

### Step 12: Emit a machine-readable summary

Print a single JSON line to stdout so the pipeline can parse the outcome:

```json
{"status":"rebased","target":"main","migrations":[{"original":"20250612143022_AddUserProfile","new":"20260422180530_AddUserProfile"}],"snapshot_updated":true,"commit":"abc1234"}
```

Possible `status` values: `no_op`, `rebased`, `failed`. Always exit 0 for `no_op` and `rebased`, non-zero for `failed`.

## Exit code reference

| Code | Meaning |
|------|---------|
| 0    | Success — either no-op or rebased and committed |
| 2    | Target branch not found (pipeline needs to `git fetch`) |
| 3    | Migration-name collision detected (possible squash merge) |
| 5    | `dotnet ef` CLI is not available |
| 6    | Could not locate the `.csproj` for the DbContext project |
| 7    | `dotnet ef migrations add` failed (likely semantic conflict) |
| 8    | `dotnet build` failed after regeneration |
| 9    | Pending model changes after regeneration |
| 10   | Scaffolded migration has non-empty Up()/Down() — model has changes beyond the original migration; human review required |
| 11   | New migration timestamp is not greater than target's latest (should be unreachable; indicates a bug or clock anomaly) |

## What this skill will NOT do

- **No pushing.** The pipeline controls remotes and credentials.
- **No force-push or history rewriting.** Only forward commits.
- **No hand-editing of `ModelSnapshot.cs`.** EF's regeneration produces the correct snapshot; the skill trusts it.
- **No `git add .`** or broad staging. Only files the skill explicitly touched.
- **No prompts.** Every decision is encoded above. Ambiguous situations exit non-zero.
- **No overwriting a non-trivial scaffolded `Up()`/`Down()`** (exit 10). If EF thinks there are still pending changes after rebasing onto the target snapshot, a human needs to decide whether they're wanted.

## Edge cases handled automatically

- **Multiple migrations on the branch** → processed in timestamp order, each regenerated in sequence. Because EF uses current UTC for each `migrations add` call, the relative order is preserved naturally (each regeneration takes a fraction of a second, and EF includes seconds in the timestamp).
- **No migrations on the target branch** → no rebase needed (step 4).
- **Re-running on an already-fixed branch** → step 3 returns empty, exits 0 (idempotent).
- **Current branch is `main`/`master` itself** → step 2 exits 0.
- **Multiple `Migrations/` folders** → each processed independently; results aggregated.
- **Original migration has hand-authored SQL or complex logic** → preserved exactly, because only the raw text of `Up()`/`Down()` bodies is copied, not re-generated.

## Edge cases that intentionally fail

- **Name collision on target branch** (step 5 → exit 3): the migration was likely already merged.
- **`dotnet ef` unavailable** (step 6 → exit 5): the skill depends on the EF CLI.
- **`dotnet ef migrations add` fails** (step 8 → exit 7): usually a model-level conflict with the target branch.
- **Build fails or pending model changes** (step 10 → exit 8 or 9): something about the splice or the model state doesn't compile cleanly.
- **Scaffolded body is non-empty** (step 9 → exit 10): the model has changes the original migration didn't capture; overwriting would lose work.
