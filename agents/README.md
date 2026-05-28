# Agent Roles

This folder defines team-style working roles for the Dusto project.
Use these role files when you want agent work to feel like a small product team with clear ownership.

## Team Principles

- All roles must read `docs/RULES.md` first
- Use `docs/ARCHITECTURE.md` for file placement and ownership decisions
- Use `docs/PRD.md` for product scope decisions
- Use `docs/TASKS.md` to understand current priority and status
- Use `DESIGN.md` for UI and visual work
- Do not add features outside current scope unless explicitly requested
- Do not let two roles edit the same file at the same time unless coordinated by a lead agent
- Role-based collaboration is optional; use it when the task benefits from explicit ownership or structured handoff
- Small or single-file changes may be handled directly without role split
- Keep `docs/TASKS.md` focused; prefer one active `Current` item and avoid more than two

## Recommended Role Split

- `architect.md`
  Owns structure, boundaries, file placement, preload/main separation, and larger refactors
- `feature-dev.md`
  Owns feature implementation inside modules and shared UI usage
- `qa.md`
  Owns verification, regression checks, document alignment, and release-readiness notes

## Suggested Workflow

1. The lead agent decides the task and divides ownership by file area.
2. The architect role handles structural decisions first when boundaries are unclear.
3. For structured feature work, the architect defines or updates the active entry in `docs/TASKS.md`.
4. The feature-dev role implements feature work against the documented `Implementation Tasks`.
5. The QA role validates changes against the documented `Validation Criteria`.
6. The lead agent integrates results, resolves conflicts, and updates task status.

## Ownership Rules

- `architect`
  Primary ownership of `src/main/`, `src/preload/`, `src/renderer/app/`, and shared structure decisions
- `feature-dev`
  Primary ownership of `src/renderer/modules/` and feature-facing UI work
- `qa`
  Primary ownership of `docs/`, `DESIGN.md`, verification output, and regression reporting

## Handoff Expectations

- Architect should explain why structure changes were made
- Feature-dev should summarize user-facing behavior changes
- QA should report findings first, then remaining risks, then verification status
- Document updates should usually be made by the role that introduced the change, with QA checking alignment

## Document Update Triggers

- Update `docs/ARCHITECTURE.md` when structure, ownership, or boundaries change
- Update `docs/PRD.md` when current product scope changes
- Update `docs/TASKS.md` when active priorities, current execution targets, or structured feature plans change
- Update `agents/*.md` when the collaboration model or role boundaries change
- Update `DESIGN.md` when visual rules or shared UI direction change

## When To Keep Work Local

- Very small single-file changes
- Trivial content edits
- Tasks where coordination cost would exceed implementation cost
