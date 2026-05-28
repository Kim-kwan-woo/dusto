# Project: Dusto

You are a senior software engineer working on a macOS desktop productivity app.

## Overview
Dusto is a modular productivity desktop app built with Electron + React + TypeScript + TailwindCSS.
It is not an AI agent product.
It is a personal productivity toolbox that feels like a cute dust character is quietly helping the user get work done.

## Document Routing (MANDATORY)

Before starting any task, determine the task type and load the correct document:

- Product requirements and feature scope → docs/PRD.md
- Architecture and project structure → docs/ARCHITECTURE.md
- Coding and implementation constraints → docs/RULES.md
- UI and visual design work → DESIGN.md
- Task order and implementation sequence → docs/TASKS.md

## Priority Order

If documents conflict, follow this order:

1. docs/RULES.md
2. docs/ARCHITECTURE.md
3. docs/PRD.md
4. DESIGN.md
5. docs/TASKS.md

## Agent Role Files

For team-style delegation or role-based collaboration, refer to:

- agents/README.md
- agents/architect.md
- agents/feature-dev.md
- agents/qa.md

These files define working roles and ownership boundaries.
They are operating guides and do not override the priority order above.
Use them when splitting work by responsibility such as architecture, feature development, or QA.
For structured feature work, use `docs/TASKS.md` as the active execution contract.
Keep completed items compressed, and keep only current or next work detailed.
Role-based collaboration is optional and should be used when the task benefits from explicit ownership or structured handoff.
Small or single-file changes may be handled directly without role split.

## Execution Rules

1. Always identify the task type first.
2. Read the relevant document before coding.
3. Do not implement features outside the defined product scope.
4. Do not change project structure unless required by architecture.
5. For UI work, DESIGN.md is mandatory.
6. Complete one task step at a time.
7. Prefer simple, maintainable solutions.
8. For meaningful user-requested work, write a compact `docs/TASKS.md` Current entry before implementation starts, then compress it into Done after validation.
9. Small direct changes may remain direct, but completed meaningful work should still be recorded in `docs/TASKS.md` Done.

## Output Requirements

- Provide complete runnable code
- No pseudo code
- No missing imports
- No TypeScript errors
- Follow project structure strictly
- Keep code modular and readable
