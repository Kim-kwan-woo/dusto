# Architecture

This document defines where code should live and which layer owns which responsibility.
Use it when adding folders, moving files, or deciding module boundaries.

## 1. Tech Stack

- Electron
- React
- TypeScript
- TailwindCSS
- Zustand

## 2. Project Structure

```text
src/
  main/         # Electron main process
  preload/      # Secure IPC bridge
  renderer/     # React application
    app/        # App shell and app-level composition
    components/ # Shared UI components
    modules/    # Feature modules
    stores/     # Shared renderer stores
    styles/     # Global styles / Tailwind entry
    types/      # Renderer-only type declarations
```

Do not add new top-level source folders for AI at this stage.
If AI-related code is needed, place it inside the existing layers such as `src/main/ai/` or `renderer/modules/assistant/`.

## 3. Layer Ownership

- `main/`
  Owns app lifecycle, native dialogs, persistence entry points, and other system-facing work
  Also owns local AI runtime connection, availability checks, conversation execution, tool routing, and timeout or error handling
  Also owns microphone permission checks, meeting audio persistence, meeting record persistence, and local transcription process execution
- `preload/`
  Owns the safe boundary between Electron and renderer
  Also owns the bridge APIs for AI status checks, chat requests, and approved tool invocations
  Also owns the minimal bridge APIs for microphone permission, meeting recording persistence, meeting record persistence, transcription requests, and summary requests
- `renderer/app/`
  Owns app shell, module registration, and top-level composition
- `renderer/components/`
  Owns shared reusable UI
- `renderer/modules/`
  Owns feature UI, feature state, and feature-specific interactions
  AI-related user surfaces should live here as a focused assistant module and any feature-local follow-up panels
  Meeting recording UI and meeting record views should live here as a focused meetings module
- `renderer/stores/`
  Owns shared renderer state only when multiple modules or the app shell need it

## 4. Current Module Map

Current modules:
- `renderer/modules/assistant`
- `renderer/modules/todo`
- `renderer/modules/notes`
- `renderer/modules/canvas`
- `renderer/modules/htmleditor`
- `renderer/modules/meetings`

App-level composition:
- `renderer/app/modules.ts` defines the registered module list
- `renderer/app/pages/` contains app-owned pages such as the assistant-first home screen

## 5. Module Structure

Recommended module shape:

```text
renderer/modules/<feature>/
  <Feature>Page.tsx
  <Feature>Panel.tsx
  <feature>.store.ts
  index.ts
```

Each module should contain:
- feature page wrapper
- feature panel or primary UI surface
- feature-specific Zustand store when needed
- export entry point

## 6. State Management

Use Zustand as the primary state management solution.

Guidelines:
- Prefer module-level stores when possible
- Use shared renderer stores only for app-wide concerns such as navigation
- Keep store names clear and feature-based
- Keep state shape simple

## 7. Persistence Direction

Persistent data should be written through the main process.

Current persistence responsibilities:
- `main/storage/` stores app data for todos, notes, canvas boards, and meeting records
- Meeting audio files are persisted through `main/` under app-owned storage and referenced by meeting records
- `preload/index.ts` exposes safe load/save APIs
- renderer modules hydrate from preload APIs and should not perform direct file access

Local browser storage may be used only as a lightweight compatibility or backup layer, not as the primary persistence boundary.

## 8. Navigation Direction

Recommended:
- Sidebar-based module navigation
- Main panel displays the active module page
- Home is the primary assistant chat surface
- Existing tools remain directly reachable from navigation and from assistant-triggered actions
- Navigation is driven by app-level module registration, not by hard-coded layout branches

## 9. Styling Direction

- TailwindCSS-based styling
- Shared design language from `DESIGN.md`
- Keep UI clean and consistent
- Keep the app calm, desktop-oriented, and character-friendly

## 10. Change Guidelines

Before adding a new file, ask:
- Is this app-shell logic?
  Put it in `renderer/app/`
- Is this shared UI?
  Put it in `renderer/components/`
- Is this feature-specific?
  Put it in `renderer/modules/<feature>/`
- Is this system or file access?
  Put it in `main/` and expose only what is needed through `preload/`

For local AI changes:
- Put model runtime and process integration in `main/`
- Put the AI bridge surface in `preload/`
- Put the conversational home UI, message state, and tool-result presentation in `renderer/modules/assistant/`
- Put user-facing feature controls and feature-local state in `renderer/modules/`
- Do not add a new top-level `src/ai/` or other parallel source root unless the architecture is intentionally expanded later

For meeting recording changes:
- Put microphone permission checks, audio file writes, meeting persistence, and STT process execution in `main/`
- Put only explicit, typed meeting APIs in `preload/`
- Put recorder controls, meeting list/detail views, and meeting module state in `renderer/modules/meetings/`
- Do not let renderer code read or write meeting audio or meeting records directly

Suggested AI structure:

```text
src/
  main/
    audio/
      recording.ts      # microphone recording file persistence helpers
    ai/
      runtime.ts        # local runtime adapter and health checks
      orchestrator.ts   # prompt execution and tool call loop
      stt.ts            # local STT adapter such as whisper.cpp
      tools/
        notes.ts
        todo.ts
        canvas.ts
        htmleditor.ts
    storage/
      meetings.ts       # meeting record persistence
  preload/
    index.ts            # assistant, meeting, storage, and tool IPC bridge
  renderer/
    modules/
      assistant/
        AssistantHomePage.tsx
        AssistantChatPanel.tsx
        assistant.store.ts
        components/
      meetings/
        MeetingsPage.tsx
        MeetingRecorderPanel.tsx
        meetings.store.ts
        index.ts
```
