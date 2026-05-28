# AI Tech Spec — Dusto Assistant

This document defines the initial technical specification for Dusto's assistant-first architecture.
It is optimized for:

- zero recurring cost
- fast local response on macOS
- minimal complexity in the Electron app
- safe, app-owned actions instead of uncontrolled automation

## 1. Product-Level Technical Goal

Dusto should feel like a local desktop assistant that the user can talk to naturally.
The assistant should be able to:

- understand short productivity requests
- decide whether to answer directly or use an app tool
- execute supported actions through typed app handlers
- respond quickly enough to feel conversational on a Mac

The assistant should not require any paid API, cloud inference, or Dusto-hosted backend.

## 2. Primary Constraints

- Local-only inference
- No usage-based cost
- Works well on Apple Silicon Macs first
- Safe Electron boundary with all AI runtime access in `main/`
- Renderer never talks directly to a model runtime
- Actions are limited to explicit Dusto tools
- Missing runtime must degrade gracefully

## 3. Recommended Runtime Strategy

### Recommendation

Use a provider-adapter design with:

- Primary runtime: `Ollama`
- Future optional adapters: `LM Studio`, `llama.cpp`, `MLX`

### Why Ollama first

Ollama is the best v1 default for this project because it gives us:

- zero cost
- very simple local installation for users
- stable local HTTP API
- easy model switching
- no need to bundle giant model files into the app
- good enough performance on Apple Silicon through existing local runtime support

This keeps the Dusto app small and maintainable while still delivering a local assistant experience.

### Why not bundle a model into the app for v1

Bundling a model or native inference stack directly into Electron would:

- make the app download much larger
- complicate packaging and updates
- increase startup complexity
- make model upgrades harder
- add native integration work before we validate the UX

For v1, Dusto should detect a supported local runtime and connect to it.
If the runtime is missing, the UI should remain useful and clearly explain how to enable the assistant.

## 4. Model Strategy

### Default model class

Target a small instruct model in the `3B` to `4B` range for the default assistant experience.

Current v1 default implementation:

- Runtime: `Ollama`
- Model tag: `qwen3:4b`

Why:

- much faster first token and overall latency
- lower memory pressure
- better fit for chat plus tool calling
- good enough for note and task productivity workflows

For the current Apple Silicon-first v1 target, `qwen3:4b` is the preferred default because it keeps a strong speed-to-quality balance for local chat and tool routing.

### Optional higher-quality model

Allow a `7B` to `8B` class model as an advanced option for users who prefer better reasoning over speed.

### Recommended v1 profile

- Default profile: small instruct model for chat and tool routing
- Quality profile: larger instruct model for users with stronger hardware

Example model families that fit this strategy:

- `Qwen` instruct small models
- `Llama` instruct small models
- `Mistral` small instruct models

Product behavior should not depend on one specific model family.
Implementation may still ship with a concrete default model tag, and should store that choice in a runtime profile with:

- provider
- model name
- context window target
- max output tokens
- temperature

## 5. Performance Targets

These are practical v1 targets for local desktop use:

- Runtime status check: under `150ms`
- Warm chat response start: under `1.5s`
- Cold chat response start: under `4s`
- Tool-only action completion: under `800ms` before the final response when no model rewrite is needed
- Note rewrite or summary completion: under `8s` on a typical Apple Silicon Mac
- UI remains interactive during all assistant operations

The goal is not benchmark leadership.
The goal is to make Dusto feel responsive and dependable.

## 6. System Architecture

```text
Renderer
  assistant chat UI
    ↓ IPC via preload
Preload
  typed assistant bridge
    ↓ IPC
Main
  ai/orchestrator.ts
  ai/runtime/
  ai/tools/
    ↓
Local runtime (Ollama)
    ↓
Model response / tool call decision
    ↓
App-owned tool handlers
    ↓
Storage and module state updates
```

### Layer responsibilities

#### `renderer/`

- render chat transcript
- render suggested prompts
- render runtime state
- render confirmation requests
- render tool result cards
- send user messages to preload bridge

#### `preload/`

- expose typed safe APIs only
- pass chat requests to `main`
- return structured responses to the renderer

#### `main/ai/`

- detect runtime availability
- send prompts to the local model
- parse tool intents
- execute approved tools
- handle confirmation gates
- return structured assistant events

## 7. Recommended Source Layout

```text
src/
  main/
    ai/
      orchestrator.ts
      session-store.ts
      providers/
        ollama.ts
        types.ts
      prompts/
        system.ts
      tools/
        registry.ts
        notes.ts
        todo.ts
        canvas.ts
        htmleditor.ts
      types.ts
  preload/
    index.ts
  renderer/
    modules/
      assistant/
        AssistantHomePage.tsx
        AssistantChatPanel.tsx
        AssistantComposer.tsx
        AssistantStatusBadge.tsx
        AssistantActionCard.tsx
        assistant.store.ts
        assistant.types.ts
```

## 8. Provider Adapter Contract

Each provider should implement the same minimal interface.

```ts
export interface AiProvider {
  getStatus(): Promise<AiRuntimeStatus>
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse>
}
```

### Required status fields

- `available`
- `provider`
- `model`
- `latencyMs`
- `reason` when unavailable

### Required chat capabilities

- accept system prompt
- accept recent conversation messages
- accept compact tool descriptions
- return plain assistant text
- optionally return a structured tool call intent

## 9. Tool Execution Design

The assistant should never directly mutate app state from the model output.
All changes must pass through app-owned typed tools.

### v1 tool set

#### Notes

- `createNote`
- `rewriteSelectedNote`
- `summarizeSelectedNote`

#### Todo

- `createTodo`
- `extractTodosFromSelectedNote`
- `cleanupCompletedTodos`

#### Canvas

- `createBoard`
- `renameBoard`

#### HTML Editor

- `generateHtmlDraft`
- `rewriteHtmlDraft`

### Tool behavior rule

Tools should return structured data, not prose.

Example:

```ts
type CreateTodoResult = {
  success: boolean
  createdIds: string[]
  count: number
}
```

The assistant can then turn that result into friendly UI text after the action completes.

## 10. Orchestration Flow

Recommended execution flow:

1. Renderer sends user message to `preload`
2. `main/ai/orchestrator.ts` loads runtime status
3. Orchestrator builds a compact system prompt with tool descriptions
4. Model returns either:
   - direct answer
   - tool intent
   - clarification request
5. If the model requests a destructive action, orchestrator returns a confirmation event instead of executing immediately
6. If the action is safe, orchestrator executes the tool handler
7. Tool result is appended to the conversation state
8. Model optionally turns the structured result into final natural language
9. Renderer updates transcript and any linked UI cards

## 11. Confirmation Policy

The following actions should require confirmation:

- deleting notes
- deleting canvas boards
- bulk todo cleanup
- replacing existing note body with rewritten content
- overwriting HTML editor content

The following actions may execute immediately:

- create note
- create todo
- summarize note
- generate HTML draft into a new draft slot or preview buffer

## 12. Prompt Strategy

Keep prompts small and operational.
Do not send the entire app state.

### System prompt responsibilities

- explain Dusto's role
- describe available tools
- require the model to prefer tools over invented claims
- require short, calm responses
- require clarification when the target item is ambiguous

### Context rules

- send only recent chat turns
- send only the selected note, selected board title, or current HTML when needed
- avoid long historical transcripts
- summarize older context when session history grows

This matters more for speed than raw model quality.

## 13. Session and State Design

### Conversation state

Store session state locally in renderer and mirror operational state in `main` as needed.

Recommended message shape:

```ts
type AssistantMessage =
  | { id: string; role: 'user'; text: string; createdAt: number }
  | { id: string; role: 'assistant'; text: string; createdAt: number }
  | { id: string; role: 'tool'; toolName: string; status: 'success' | 'error'; payload: unknown; createdAt: number }
  | { id: string; role: 'system'; kind: 'status' | 'confirmation'; text: string; createdAt: number }
```

### Persistence recommendation

For v1:

- keep the active assistant session in renderer store
- optionally persist only recent chat history to local app storage
- do not build multi-thread or long-memory systems yet

## 14. Runtime Detection

### Status checks

On app startup and when opening the home assistant view:

- check whether the provider process is reachable
- check whether a configured model is installed
- cache the result briefly to avoid noisy polling

### Unavailable states

Return explicit statuses:

- `missing_runtime`
- `missing_model`
- `starting`
- `ready`
- `busy`
- `error`

The renderer should map these to simple user-friendly messages.

## 15. Performance Tactics

### For speed

- use a small default model
- keep prompts short
- trim conversation history aggressively
- avoid asking the model to generate long prose unless needed
- skip the second model pass for simple tool success responses when the result is obvious
- cache runtime status for a short interval

### For UI smoothness

- show optimistic chat bubbles for the user message immediately
- stream status updates from `main` to renderer later if needed, but do not require token streaming for v1
- run heavy model interaction only in `main`
- never block renderer on synchronous AI work

### For reliability

- set hard timeouts around provider calls
- return structured errors
- fall back to manual module navigation when the assistant cannot help

## 16. Security and Safety Boundaries

- No shell execution from model output
- No arbitrary file system access through the assistant
- No dynamic tool registration from prompts
- No renderer access to provider credentials or process control
- No hidden background task loops
- All mutable actions go through typed tool handlers

## 17. Recommended v1 Decision

If we want the best tradeoff between speed, complexity, and no recurring cost:

- Runtime: `Ollama`
- Default model size: `3B` to `4B`
- Current default model tag: `qwen3:4b`
- Fallback UX: assistant home remains visible but inactive when runtime is missing
- Tool scope: notes + todo first, HTML second, canvas light support
- Response style: short and operational

This gets us to a believable Dusto assistant quickly without overcommitting to a heavyweight agent stack.

## 18. What Not To Build Yet

Avoid these in v1:

- multi-agent planning
- autonomous background loops
- full memory systems
- RAG over arbitrary local files
- browser control
- shell or OS command execution
- bundled large model binaries inside the app

These can all come later if the core assistant interaction proves valuable.
