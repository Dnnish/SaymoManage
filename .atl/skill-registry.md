# Skill Registry — MiniDrive

Generated: 2026-04-05

## User Skills

| Skill | Trigger | Path |
|-------|---------|------|
| `branch-pr` | Creating a PR, preparing changes for review | `~/.claude/skills/branch-pr/SKILL.md` |
| `issue-creation` | Creating a GitHub issue, reporting a bug, requesting a feature | `~/.claude/skills/issue-creation/SKILL.md` |
| `go-testing` | Writing Go tests, using teatest, Bubbletea TUI testing | `~/.claude/skills/go-testing/SKILL.md` |
| `judgment-day` | Adversarial code review, quality audit, "judgment day" | `~/.claude/skills/judgment-day/SKILL.md` |
| `skill-creator` | Creating a new AI agent skill | `~/.claude/skills/skill-creator/SKILL.md` |
| `skill-registry` | "update skills", "skill registry" | `~/.claude/skills/skill-registry/SKILL.md` |
| `sdd-onboard` | Guided SDD walkthrough, "sdd onboard" | `~/.claude/skills/sdd-onboard/SKILL.md` |

## Compact Rules

### branch-pr
- Issue-first enforcement: every PR must link to an existing issue
- Branch naming: `{type}/{issue-number}-{short-description}`
- Conventional commits required
- Type labels auto-applied from branch prefix

### issue-creation
- Bug/feature templates with structured fields
- Auto-label `status:needs-review`
- Maintainer approval gate before work begins

### judgment-day
- Two blind judge sub-agents run in parallel
- Each produces independent verdict
- Synthesize findings, apply fixes, re-judge up to 2 iterations
- Distinguish theoretical vs real warnings

### go-testing
- Table-driven tests with descriptive subtests
- Bubbletea TUI: use teatest for screen transitions
- Golden file testing for complex outputs
- NOT APPLICABLE to this project (TypeScript stack)

### skill-creator
- Follow SKILL.md template with frontmatter
- Organize assets and references in skill directory
- Name conventions: kebab-case directories

## Project Conventions

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions, domain model, code conventions, skills protocol |

### Key Conventions (from CLAUDE.md)
- TypeScript strict mode, no `any`
- Files: kebab-case. Components: PascalCase
- Backend: routes → handlers → services → repositories
- Frontend: React Hook Form + Zod, TanStack Query (no global state)
- DB: snake_case tables/columns, UUID v7, no CASCADE DELETE
- Testing: Vitest + real DB (no mocks), Testing Library for components
