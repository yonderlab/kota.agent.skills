# kota-agent-skills

Open-source Agent Skills used at Kota.

This repo follows the Agent Skills format (https://agentskills.io/) and is intended to be installable via [skills.sh](https://skills.sh/).

## Installation

Pick a skill and install it with:

```bash
npx skills add https://github.com/yonderlab/kota.agent.skills --skill <skill-name>
```

## Skills

All skills live in the `skills/` directory.

| Skill | Description |
|-------|-------------|
| **conventional-commit** | Teaches your agent the [Conventional Commits](https://www.conventionalcommits.org/) spec and a structured commit-and-push workflow, so it produces consistent, well-formatted commits instead of ad-hoc messages. |
| **create-pull-request** | Gives your agent a step-by-step PR creation process with template adherence and validation checks, so PRs are complete and review-ready on the first try. |
| **jsonlogic-validator** | Teaches your agent the [JSONLogic](https://jsonlogic.com/) syntax so it can correctly implement, validate, and test JSONLogic rules instead of guessing at the format. |
| **product-requirements** | Turns your agent into a PRD facilitator that asks the right questions one at a time, instead of jumping ahead and filling a document with assumptions. |
| **react-best-practices** | Gives your agent a curated, opinionated set of React rules covering state management, performance, and component structure, so it writes React code consistently rather than relying on generic knowledge. |
| **react-router-7-framework** | Gives your agent up-to-date knowledge of React Router 7 framework mode (loaders, actions, middleware, streaming, SSR), which is too recent and specific for most models to get right on their own. |
| **review-typescript-pull-request** | Equips your agent with a structured review criteria checklist for TypeScript/Node.js/React PRs, so reviews are thorough and consistent rather than surface-level. |
| **typescript-best-practices** | Gives your agent an opinionated TypeScript and Node.js ruleset covering typing patterns, testing, and error handling, so it follows your standards instead of generic defaults. |

## Adding A Skill

See `AGENTS.md` for conventions and a checklist.
