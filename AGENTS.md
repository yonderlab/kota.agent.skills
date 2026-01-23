# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working in this repository.

## Repository Purpose

This repository is an open-source collection of Agent Skills used at Kota.

Each skill is a self-contained folder under `skills/` containing a `SKILL.md` file with YAML frontmatter and instructions. Agents load skills dynamically.

## Creating A New Skill

### Directory Structure

```
skills/
  <skill-name>/
    SKILL.md              # Required
    scripts/              # Optional
    references/           # Optional
    assets/               # Optional
```

### Naming Rules

Per the Agent Skills specification (https://agentskills.io/specification):

- The skill directory name MUST be `kebab-case`.
- `SKILL.md` MUST be named exactly `SKILL.md`.
- The `name:` field in `SKILL.md` frontmatter MUST match the directory name.

### SKILL.md Minimal Template

```
---
name: my-skill-name
description: One sentence describing what this skill does and when to use it. Include trigger phrases.
license: MIT
metadata:
  author: kota
  version: "0.1.0"
---

# My Skill Name

Explain what the skill does.

## When To Use

Give 3-6 concrete trigger phrases.

## How It Works

Write a short, numbered procedure.

## Examples

Provide 2-3 example prompts and what the agent should do.
```

### Content Guidelines (Open Source)

- Do NOT include secrets, internal hostnames, customer data, PHI, or any proprietary playbooks.
- Prefer generic, portable guidance (framework-agnostic, vendor-agnostic) unless the thing is public.
- Keep `SKILL.md` short and procedural; put long reference material in `references/`.

## Validation (Optional)

If you want to validate skills against the reference spec, use the `skills-ref` tooling from https://github.com/agentskills/agentskills/tree/main/skills-ref.

## Claude Integration Notes

`CLAUDE.md` is a symlink to this file so Claude-compatible agents pick up a single source of truth.
