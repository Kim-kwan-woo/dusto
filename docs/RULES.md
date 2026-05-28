# Rules (Highest Priority)

This document is the final implementation constraint document.
If another document conflicts with this one, follow this file.

## 1. How To Use This Document

- Treat `Required` rules as mandatory
- Treat `Preferred` rules as default guidance unless there is a strong reason not to
- Check `docs/ARCHITECTURE.md` before changing folders or file placement
- Check `docs/PRD.md` before adding user-facing scope
- Check `DESIGN.md` before changing UI or visual behavior

## 2. Code Rules

Required:
- Use strict TypeScript
- Avoid `any` unless there is no practical alternative
- Use functional React components only
- Keep files readable and maintainable

Preferred:
- Prefer clear names over short clever names
- Keep components focused on one UI responsibility
- Split large files before they become difficult to scan

## 3. Styling Rules

Required:
- Use TailwindCSS only
- Do not use inline style unless absolutely necessary
- Follow `DESIGN.md` for visual work

Preferred:
- Reuse existing layout and typography patterns before creating new ones
- Keep visual language calm, clean, and consistent across modules

## 4. State Rules

Required:
- Use Zustand only
- Keep state shape simple

Preferred:
- Prefer module-level stores over unnecessary global stores
- Use shared stores only for app-wide concerns such as navigation

## 5. Electron Rules

Required:
- No direct Node access in renderer
- All Electron or system communication must go through preload
- Keep preload API minimal and safe
- Handle local AI runtime access in `main/` only
- Do not allow renderer code to talk directly to system processes or model runtimes
- Route all AI features through explicit preload IPC APIs
- Keep tool execution explicit, typed, and constrained by app-owned handlers

Preferred:
- Keep IPC payloads explicit and feature-based
- Put persistence and native file logic in `main/`

## 6. Project Structure Rules

Required:
- Follow `docs/ARCHITECTURE.md`
- New user-facing features must be created under `renderer/modules/`
- Shared UI belongs in `renderer/components/`

Preferred:
- Keep app-shell concerns in `renderer/app/`
- Keep feature-specific state next to the module that owns it

## 7. Product Scope Rules

Required:
- Do not add features outside `docs/PRD.md` unless explicitly requested
- AI behavior must remain local-only unless explicitly re-scoped in product documents
- Any assistant behavior must operate through app-defined tools and safety boundaries from `docs/PRD.md`
- Do not add autonomous background actions, hidden side effects, or remote orchestration unless explicitly approved in `docs/PRD.md`
- When adding, removing, or changing assistant-supported actions, update the Home Help Popup copy in the same task so it accurately reflects current in-scope Dusto capabilities and does not promise unsupported behavior.

Preferred:
- Prioritize current scope completion over speculative expansion
- Finish and polish existing modules before adding adjacent ideas

## 8. General Rules

Required:
- Do not overengineer
- Maintain consistency across modules

Preferred:
- Prefer simple structure first
- Keep naming straightforward
- Choose maintainability over abstraction
- Prefer explicit tool-based actions over opaque free-form automation
