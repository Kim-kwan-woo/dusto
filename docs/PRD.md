# PRD — Dusto

This document defines product scope.
Use it to decide what belongs in the product now, what should wait, and what should not be added by default.

## 1. Product Summary

Dusto is a macOS desktop productivity toolbox app.
It gathers small, practical tools into one calm desktop workspace so the user can move quickly without juggling multiple apps.
The product is now positioned as a local-first desktop assistant experience centered on conversation.
Its personality comes from a cute dust character theme that makes the experience feel warm, light, and quietly helpful.

## 2. Product Goal

The goal of Dusto is to give the user a single desktop app where they can ask for help in natural language, have Dusto carry out supported productivity tasks inside the app, and still access focused tools directly when needed.

## 3. Target User

Primary user:
- Individual user
- macOS desktop user
- Wants a personal productivity toolbox
- Prefers simple and fast tools over complicated enterprise software

## 4. Core Product Concept

- Local-first desktop assistant
- Modular tool-backed feature structure
- Cute dust character inspired UI/UX
- Clean and friendly macOS feeling
- Chat-first home experience with direct tool access

## 5. Current In-Scope Modules

The current app scope includes the following modules and surfaces.
This section is the source of truth for what should exist now.

### 5.1 Home / Dashboard
Purpose:
- Serve as the primary conversational home for the user
- Provide quick access to modules and recent work
- Represent Dusto's identity

Requirements:
- Sidebar navigation
- Main content area
- Chat-based primary home view
- Message history for the current local session
- Suggested actions or prompts for common tasks
- Clear status for local AI availability
- Character-driven atmosphere

### 5.2 Todo Module
Purpose:
- Let the user manage small daily tasks

Requirements:
- Add task
- Mark task as completed
- Delete task
- Show task list

### 5.3 Notes Module
Purpose:
- Capture short notes quickly

Requirements:
- Create note
- Edit note
- Delete note
- Show note list

### 5.4 Canvas Module
Purpose:
- Give the user a lightweight whiteboard for sketching ideas visually

Requirements:
- Create board
- Open board
- Rename board
- Delete board
- Persist board content

### 5.5 HTML Editor & PDF Export Module
Purpose:
- Let the user write or paste HTML, preview it live, and export it as a PDF

Requirements:
- Raw HTML editing
- Live preview
- Safe export flow through preload and main process
- Save PDF through native dialog

### 5.6 Local AI Assistant
Purpose:
- Provide a local-first conversational assistant that can help the user operate supported Dusto tools
- Make Dusto feel like a small character that listens, responds, and helps get work done inside the app

Requirements:
- Local runtime only with no Dusto-hosted inference service
- Conversational home screen where the user can type requests in natural language
- App-defined tool execution for supported actions such as note creation, note rewriting, todo extraction, todo creation or cleanup, canvas board setup, and HTML draft generation
- Clear status and fallback state when no local AI runtime is installed
- User-visible confirmation for destructive or high-impact actions
- Action results should appear in context so the user can understand what changed

Non-requirements:
- Team collaboration workflows
- Cloud-backed inference or remote orchestration
- Background automation without explicit user approval

### 5.7 Meeting Recording Summary Module
Purpose:
- Let the user record microphone audio for a meeting and turn it into a dedicated meeting record
- Preserve both the raw transcript and the AI-generated summary so the user can review what was said and what mattered
- Keep meeting capture local-first, explicit, and separate from Notes and Todos in the MVP

Requirements:
- Microphone permission status and request flow
- User-initiated recording start and stop
- Local audio file persistence through the main process
- Meeting record list and detail view
- Meeting metadata such as title, created time, duration, processing status, and audio reference
- Local transcription of saved recordings when a supported local STT runtime is available
- Local AI summary generation from transcript text when a supported local AI runtime is available
- Meeting detail view that can show transcript, concise summary, decisions, action items, risks/blockers, and follow-ups
- Clear fallback states when microphone access, local STT, or local AI runtime is unavailable

Non-requirements:
- System audio capture from Zoom, Google Meet, browsers, or other apps
- Live subtitles or real-time meeting assistant behavior
- Speaker diarization
- Cloud STT or cloud LLM calls
- Team sharing, accounts, sync, or collaboration
- Note or Todo integration for the MVP
- Background or automatic recording without explicit user action

## 6. Explicitly Out Of Scope

The following should not be introduced unless explicitly requested:

- Team collaboration
- Cloud sync
- User accounts / authentication
- External integrations
- Complex analytics
- Multi-device sync
- Remote agent orchestration
- System audio capture from other apps
- Live subtitles
- Speaker diarization
- Cloud transcription or cloud meeting summarization
- Background or automatic meeting recording

## 7. UX Direction

- Simple and calm
- Friendly and cute
- Minimal friction
- Fast navigation
- Feels like a small helper lives inside the app
- Conversation is the default way into the product, not an afterthought

## 8. Success Criteria

The product is successful at the current stage if:

- The app launches reliably on macOS
- The user can start from the home chat surface and complete supported tasks
- The user can navigate between the main modules
- Todo interactions work correctly
- Notes interactions work correctly
- Canvas boards can be created and reopened
- HTML preview and PDF export work correctly
- Meeting recordings can be saved locally and reopened as dedicated meeting records
- Meeting transcript and summary states are clear when local runtimes are available or unavailable
- UI is visually consistent and pleasant

## 9. Product Principles

- Utility first
- Keep interactions lightweight
- Avoid feature bloat
- Favor clarity over complexity
- Preserve the Dusto identity in UI
- Conversation should simplify access to utilities without hiding the underlying tools
- Assistant actions should remain local, inspectable, and grounded in app-owned capabilities
