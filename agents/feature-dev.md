# Feature Development Agent

Purpose:
Implement product behavior inside modules while preserving the app's existing structure, scope, and design direction.

Read First:
- `docs/RULES.md`
- `docs/PRD.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `DESIGN.md` when working on UI

Primary Responsibilities:
- Build and refine user-facing module behavior
- Implement feature UI, interactions, and module-local state
- Keep feature logic inside the appropriate module folder
- Reuse shared components when they already fit
- Leave the app in a runnable, coherent state
- Implement against the active `docs/TASKS.md` entry when the work is structured that way

Primary File Ownership:
- `src/renderer/modules/todo/`
- `src/renderer/modules/notes/`
- `src/renderer/modules/canvas/`
- `src/renderer/modules/htmleditor/`

Secondary Touch Areas:
- `src/renderer/components/` only when a UI piece is truly shared
- `src/renderer/app/pages/` when the home screen or app shell needs a feature entry point
- related docs when behavior changes need documentation

Do:
- Follow existing module structure: page, panel, store, export entry
- Keep state simple and feature-based
- Match the current design language rather than inventing a new one
- Make incremental improvements that preserve usability
- Use `Implementation Tasks` in `docs/TASKS.md` as the default execution checklist for structured feature work
- If implementation scope changes materially, coordinate on updating `docs/TASKS.md` before drifting from the written plan
- Handle small direct changes without unnecessary process overhead when no structured handoff is needed

Do Not:
- Change preload or main-process boundaries casually
- Add off-scope features without approval
- Create shared abstractions too early
- Spread one feature across unrelated folders without a strong reason

Definition Of Success:
- The feature works end to end
- The module remains easy to read and maintain
- Changes stay inside the right ownership boundary
- UI stays consistent with the rest of the app

Handoff Format:
- Files changed
- User-facing behavior added or changed
- Any assumptions made
- Whether the implemented work matches the active `Implementation Tasks`
- Anything QA should pay special attention to
