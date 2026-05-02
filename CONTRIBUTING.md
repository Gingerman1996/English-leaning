# Contributing to LengList

A minimal contributor guide. Open issues and pull requests welcome.

## Language

**Every artifact in this repository is written in English.** This includes:

- Source code, identifiers, and comments
- Commit messages and PR descriptions
- Tag annotations and GitHub release notes
- Documentation (`README.md`, `CLAUDE.md`, `SKILL.md`, this file, etc.)
- Issue / discussion content

If you have a feature request or bug report in another language, that is
welcome — but please translate it to English when filing the issue, so the
public record stays consistent and discoverable.

## Style

- React function components, hook-only — no class components.
- One component per file, default-exported.
- Tailwind utilities in templates; project utilities live in `src/index.css`.
- Comments explain *why*, not *what*. The codebase is small enough that
  good names beat long comments.

## Commits

- Imperative mood, present tense: "Fix popover overlap" not "Fixed" / "Fixes".
- First line ≤ 72 chars; explain the *why* in the body if it's not obvious.
- Reference the area: `Reader: …`, `Whisper: …`, `srs:`, `docs:`, etc.
- Group related changes; don't split a feature across many micro-commits.

## Versioning

Semantic versioning ([SemVer 2.0](https://semver.org)):

- **MAJOR** — breaking changes (e.g. localStorage schema migration without
  fallback).
- **MINOR** — new functionality, backward compatible.
- **PATCH** — bug fixes, performance, internal cleanup.

Tag releases with annotated tags (`git tag -a vX.Y.Z`) and create a matching
GitHub release with notes summarizing user-visible changes.

## Pre-flight

Before opening a PR:

```bash
npm install
npm run build   # production build must succeed without warnings
npm run dev     # smoke-test the change in the browser
```

## Project layout

See [CLAUDE.md](CLAUDE.md) for the project map. It's the same guide an AI
assistant would read before touching the codebase.
