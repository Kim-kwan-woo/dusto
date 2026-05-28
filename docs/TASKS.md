# Tasks

This document is the active execution guide for feature work.
Keep completed items compressed, and keep only current or near-term work detailed.

How to use this file:
- `Done` keeps a compressed record of completed steps
- `Current` is the active execution contract
- `Next` is the next structured handoff target
- `Later` is a lightweight backlog, not a detailed plan
- Small direct changes do not need a detailed task entry
- Keep `Current` focused; prefer one active item and avoid more than two
- For meaningful user-requested work, write a compact `Current` entry before implementation starts
- When meaningful work is completed, move it into `Done` as a single compressed step

For structured feature work:
- Architect defines or refines the relevant task entry before implementation when needed
- Feature-dev implements against `Implementation Tasks`
- QA validates against `Validation Criteria`
- The lead agent updates status after completion
- If the work changes assistant-supported actions, include Home Help Popup copy alignment in the task's implementation and validation criteria.
- If the user gives a task directly in chat, the lead agent should first decide whether it is small direct work or structured work.
- Structured work must be captured in `Current` before code changes begin, then compressed into `Done` after validation.

Use a structured task entry when:
- The work adds or changes a feature in a meaningful way
- The scope needs explicit handoff between architect, feature-dev, and QA
- The acceptance criteria would otherwise be unclear

## Done

- Step 1 — Project Setup
- Step 2 — Base App Layout
- Step 3 — Module Registration Structure
- Step 4 — Todo Module
- Step 5 — Notes Module
- Step 6 — Canvas Module
- Step 7 — HTML Editor & PDF Export Module
- Step 8 — UI Polish
- Step 9 — Character Asset Integration
- Step 10 — Assistant-First Direction Alignment
- Step 11 — Assistant Runtime and IPC Foundation
- Step 12 — Assistant Home Surface
- Step 13 — Notes and Todo Tool Actions
- Step 14 — HTML and Canvas Tool Expansion
- Step 15 — Assistant Polish and Onboarding
- Step 16 — Validation and Fit Finish
- Step 17 — Switch Assistant Default Model To `qwen3:4b`
- Step 18 — Assistant Runtime Model Selection
- Step 19 — Refactor Baseline Cleanup and Structural Simplification
- Step 20 — Assistant and persistence follow-up hardening
- Step 21 — Home Help Popup
- Step 22 — Assistant Runtime Error Handling Hardening
- Step 23 — Character Asset Refresh
- Step 24 — Non-Home Dusto Floating Chat Overlay
- Step 25 — Assistant Model Selection Setup Copy Fix
- Step 26 — Main Process IPC Structure Refactor and Assistant Flush Boundary
- Step 27A — Meetings Module and Recording Foundation: added the local-first Meetings module, typed meeting preload IPC, macOS microphone permission status/request handling, renderer microphone recording through MediaRecorder, main-process audio/metadata persistence, meeting list/detail shell, local audio playback loading, and pending transcript/summary states. Validated with `npm run typecheck` and `npm run build`.
- Step 27B — Local Meeting Transcription: added typed meeting transcription IPC, a main-process local `whisper.cpp` STT adapter with `ffmpeg` conversion checks, persisted transcript text/error/status updates, and Meetings UI for starting transcription, showing progress/fallback state, and reading saved transcripts. Validated with `npm run typecheck` and `npm run build`.
- Step 27C — Local Meeting Summary: added typed meeting summary IPC, local Ollama-backed transcript summarization, structured summary persistence on meeting records, Meetings store summary state/actions, and transcript-adjacent summary UI with runtime/missing-transcript fallbacks. Validated with `npm run typecheck` and `npm run build`.
- Step 27D — Meeting Record Delete: added typed meeting delete IPC, main-process record removal with best-effort local audio cleanup, Meetings store cache/state cleanup, and confirmed destructive delete UI in meeting detail. Validated with `npm run typecheck` and `npm run build`.

## Current
- No active structured step.

## Next
- No queued structured step.

## Later

- Broader quality work such as lightweight automated regression coverage for store and persistence logic
- Packaging and build-output cleanup so generated artifacts are easier to distinguish from source-owned files
- Future module ideas from `docs/PRD.md`
