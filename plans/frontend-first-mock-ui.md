# Frontend-First Mock UI Plan

## Goal

Build a frontend-only product simulation in `apps/web` that feels realistic enough to validate the student and admin experience before backend APIs exist. The mock should prioritize UX clarity, information architecture, navigation, and product gaps over implementation realism.

This phase is intentionally local-first:

- no real auth
- no backend APIs
- no file upload processing service
- no SSE or websocket streaming
- no voice transcription or image understanding
- no persistence beyond browser `localStorage`

## Success Criteria

The phase is complete when:

- every planned route renders inside a coherent app shell
- light and dark themes work across all routes
- the mock app persists key state in `localStorage`
- student and admin roles are both explorable without real auth
- onboarding appears for first-time users and can be completed once
- project, document, note, AI chat, and developer chat flows feel believable
- admin screens reflect both AI chat and developer chat activity
- the UI is mobile-first and remains usable on desktop
- `bun lint` and `bun run build` pass in `apps/web`

## Product Scope

### Public Routes

- `/`
  - marketing plus mock sign-in entry
  - default entry for signed-out users
- `/onboarding`
  - first-run education flow
  - explains projects, uploads, notes, AI chat, and developer chat
- `/dashboard`
  - student home with project summaries and usage overview
- `/projects/[id]`
  - project workspace with documents, notes, and AI chat entry point
- `/chat/[id]`
  - regular AI study chat
- `/developer-chat`
  - global product-feedback and support channel
- `/admin`
  - admin overview metrics
- `/admin/users`
  - preview list of users and status
- `/admin/conversations`
  - preview list of AI and developer conversations
- `/admin/errors`
  - preview error feed

### Shared Signed-In Shell

The signed-in experience should use a shared shell across app routes with:

- mobile-first navigation
- desktop sidebar layout
- bottom navigation on small screens
- role switcher for `student` and `admin`
- theme toggle
- reset-demo action
- sign-out action
- quick access to existing AI chats for student mode

## UX Principles

### Visual Direction

Use Apple-inspired glassmorphism without copying Apple UI directly:

- frosted translucent surfaces
- layered highlight borders
- soft shadow depth
- restrained gradients
- solid inner surfaces for dense content
- subtle motion instead of constant animation

### Responsive Direction

Design narrow screens first:

- stacked layout by default
- touch-friendly targets
- fixed bottom navigation for mobile
- denser multi-column layout only at larger breakpoints
- tables should degrade into cards or horizontally scrollable regions

### Experience Goals

The mock should help answer product questions such as:

- Is onboarding clear enough for a first-time student?
- Does the project model make sense before chat starts?
- Is AI chat distinct from developer chat?
- Is the admin preview enough to reason about future operations tooling?
- Which backend contracts are implied by the UI?

## Architecture

### Frontend State Strategy

The app should use a typed local mock store persisted in `localStorage`.

State should include:

- theme preference
- onboarding state
- session state
- current user
- users
- projects
- documents
- AI chats
- global developer chat
- system errors

The state layer should remain repository-shaped so backend adapters can replace local mock logic later with minimal UI churn.

### Current File Ownership

The existing implementation already maps well to the planned architecture:

- `apps/web/src/lib/mock-types.ts`
  - shared domain types
- `apps/web/src/lib/mock-seed.ts`
  - seeded demo data
- `apps/web/src/lib/mock-repository.ts`
  - repository-style pure state helpers
- `apps/web/src/components/providers/app-store-provider.tsx`
  - client store, hydration, persistence, timed mock behaviors
- `apps/web/src/components/app-shell.tsx`
  - signed-in shell, role switcher, mobile and desktop navigation
- `apps/web/src/components/screens/*`
  - route-level screen composition
- `apps/web/src/app/globals.css`
  - glass design tokens and theme variables

### Repository Contract

The mock repository should cover:

- onboarding read and write
- theme read and write
- sign-in and sign-out
- role switching
- project create, update, delete
- document add, update status, delete
- note create and update
- AI chat create, list, read, send text
- developer chat read, send text, send attachment preview
- admin dashboard aggregation

### Persistence Rules

Persist the entire app state to `localStorage` under a single app key for simplicity in this phase.

Reset behavior should:

- clear local state
- restore seeded defaults
- restore signed-out mode
- restore onboarding to incomplete

## Domain Model

### Core Types

The mock should expose at least these frontend types:

- `ThemeMode`
- `UserRole`
- `OnboardingState`
- `MockUser`
- `SessionState`
- `ProjectSummary`
- `DocumentRecord`
- `CitationRef`
- `AiMessage`
- `AiChatThread`
- `DeveloperAttachment`
- `DeveloperMessage`
- `DeveloperChatThread`
- `SystemError`
- `AdminDashboardData`
- `AppState`

### Type Notes

- `ProjectDetail` can be represented by `ProjectSummary` plus related `DocumentRecord[]` and chat references in the current UI model.
- `DeveloperChatThread` is global for this phase and not tied to a project.
- `DeveloperAttachment` is preview-only and may include image or voice metadata without real upload.
- `AiMessage` supports citations, while `DeveloperMessage` supports attachments.

## Route Requirements

### `/`

Purpose:

- introduce the product
- explain the mock nature of the app
- allow users to enter the signed-in experience

Requirements:

- clear hero and positioning
- mock sign-in CTA
- route signed-in first-time users to `/onboarding`
- route returning users to `/dashboard`

### `/onboarding`

Purpose:

- teach the product model before the user explores

Requirements:

- explain projects as the container for work
- explain document uploads and notes
- explain regular AI chat versus developer chat
- guide the user toward creating a first project
- allow skipping only if we decide that shortcut is acceptable for demos
- mark onboarding complete in persisted state

### `/dashboard`

Purpose:

- give the student a strong first signed-in overview

Requirements:

- project cards or list
- create project action
- empty state for no projects
- high-level usage or activity summary
- visible path to open developer chat

### `/projects/[id]`

Purpose:

- represent the main workspace for a single study project

Requirements:

- editable project title and metadata
- fake upload affordance
- document cards with status handling
- note creation and note editing
- status handling for `pending`, `processing`, `ready`, and `error`
- action to start or continue an AI chat

### `/chat/[id]`

Purpose:

- simulate the core text-only AI study experience

Requirements:

- seeded threads
- project context visibility
- text-only composer
- fake assistant response delay
- citation cards on assistant messages where relevant
- empty, loading, and error-adjacent states

Explicit non-goals:

- no image upload
- no voice input
- no multimodal controls

### `/developer-chat`

Purpose:

- provide a clearly separate product-feedback and support space

Requirements:

- global entry from signed-in UI
- visually distinct accent treatment from AI chat
- support text messages
- support image attachment preview
- support voice attachment preview
- persist attachment previews locally
- show mock developer replies

Explicit non-goals:

- no actual upload pipeline
- no audio recording backend
- no media transcription
- no attachment processing

### `/admin`

Purpose:

- summarize mock operations health

Requirements:

- total projects
- total documents
- total AI chats
- total developer messages
- total logged errors
- active user count

### `/admin/users`

Purpose:

- preview user management information

Requirements:

- user list
- role and status indicators
- mobile-usable presentation

### `/admin/conversations`

Purpose:

- preview operational visibility into conversation activity

Requirements:

- include both AI chats and developer chat
- distinguish conversation type visually
- include recent activity timestamps
- remain legible on mobile

### `/admin/errors`

Purpose:

- preview product and ingestion issues

Requirements:

- severity labels
- route references
- open versus resolved states
- clear enough layout for dense information

## Mock Behaviors

### Session Behavior

- mock sign-in toggles `signedIn`
- role switching is available at any time inside the shell
- sign-out returns the user to the public entry

### Onboarding Behavior

- new users see onboarding first
- completed onboarding is stored
- returning users skip onboarding by default

### Project Behavior

- create project adds a new project immediately
- editing project metadata updates timestamps
- deleting a project also removes related documents and AI chats

### Document Behavior

- fake uploads create a new document immediately
- document status transitions from `pending` to `processing` to `ready` or `error`
- note documents are stored as `kind: "note"`
- deleting a document updates the parent project activity

### AI Chat Behavior

- each project can create or reuse a study chat
- user messages append immediately
- assistant replies are delayed to simulate generation
- citations can be attached to seeded or generated responses

### Developer Chat Behavior

- developer chat is a single global thread
- user can send text plus preview attachments
- a delayed mock developer reply appears after sending
- previews persist across refresh

## Design System Requirements

### Global Tokens

Define and maintain tokens in `apps/web/src/app/globals.css` for:

- background
- foreground
- card and popover surfaces
- primary, secondary, muted, accent
- destructive
- border, input, ring
- radius scale
- glass surface variants
- app background gradients
- theme-specific shadow values

### Surface Hierarchy

Use a small set of reusable surface modes:

- default glass panel
- soft glass panel
- strong glass panel
- developer-accent glass panel
- solid glass panel for dense content

### Accessibility Baseline

Even for a mock, maintain:

- readable contrast in light and dark themes
- visible focus treatment
- clear icon plus text pairing where needed
- keyboard-usable inputs and controls

## Implementation Plan

### Phase 1: Foundation

- finalize domain types
- finalize seed data
- stabilize repository helpers
- wire `localStorage` persistence and hydration

Exit criteria:

- app boots from seed state
- state survives refresh
- reset restores defaults

### Phase 2: Theme And Shell

- implement glass tokens and theme modes
- finish app shell
- support mobile bottom nav and desktop sidebar
- add role switcher, theme toggle, reset, sign-out

Exit criteria:

- shell is consistent across signed-in routes
- light and dark mode feel complete

### Phase 3: Student Flow

- complete landing
- complete onboarding
- complete dashboard
- complete project detail
- complete AI chat

Exit criteria:

- a student can sign in, finish onboarding, create a project, add content, and open a chat

### Phase 4: Developer Feedback Flow

- complete global developer chat
- support preview-only attachments
- add distinct visual treatment

Exit criteria:

- developer chat feels meaningfully different from AI chat

### Phase 5: Admin Preview

- complete admin overview
- complete users screen
- complete conversations screen
- complete errors screen

Exit criteria:

- admin role is explorable end to end on mobile and desktop

### Phase 6: Polish And Validation

- improve empty states
- tune transitions and spacing
- verify responsive edge cases
- run lint and production build

Exit criteria:

- demo feels stable and intentional
- toolchain checks pass

## Testing Plan

### Functional Checks

- verify all routes render
- verify navigation between student and admin routes
- verify sign-in and sign-out behavior
- verify onboarding gating behavior
- verify project create, edit, and delete
- verify note create and update
- verify fake upload status progression
- verify AI chat send and delayed response
- verify developer attachment preview flow
- verify admin metrics update from current state

### Persistence Checks

- refresh after changing theme
- refresh after completing onboarding
- refresh after creating projects
- refresh after adding notes
- refresh after sending AI messages
- refresh after sending developer attachments

### Responsive Checks

- test narrow mobile viewport first
- confirm bottom nav remains usable
- confirm dashboard and project screens stack cleanly
- confirm admin dense areas remain readable
- confirm desktop layout enhances but does not fundamentally change flow

### Visual Checks

- verify light theme across every route
- verify dark theme across every route
- verify dense surfaces use more solid backgrounds where needed
- verify developer chat accent does not conflict with AI chat styling

### Tooling Checks

Run in `apps/web`:

```bash
bun lint
bun run build
```

## Risks And Mitigations

### Risk: Mock Feels Too Static

Mitigation:

- use seeded realistic data
- add timed status changes and delayed responses
- preserve user actions in local state

### Risk: Glass UI Hurts Readability

Mitigation:

- reserve strongest transparency for framing surfaces
- use solid or semi-solid inner containers for chat logs, lists, and admin content

### Risk: Mobile Layout Regressions

Mitigation:

- design stacked layouts first
- treat desktop as enhancement only
- validate bottom padding and fixed nav overlap carefully

### Risk: Future Backend Integration Becomes Painful

Mitigation:

- keep repository-style contracts
- avoid direct `localStorage` access inside screen components
- keep mock types close to expected backend DTO shape

## Definition Of Done

This plan is done when:

- the mock app supports the full student journey
- the mock app supports the full admin preview journey
- all planned routes are present and polished
- local persistence works for the key product entities
- the design system is coherent in light and dark mode
- the mock clearly separates AI chat from developer chat
- the code structure is ready for later backend adapter replacement
- lint and production build succeed

## Assumptions

- Apple-glass means Apple-inspired glassmorphism, not copying Apple UI verbatim.
- Mobile-first layout is mandatory and should drive all component decisions.
- Developer chat is global in this phase.
- Regular AI chat is text-only in this phase.
- Voice and image support are preview-only and restricted to developer chat.
- `localStorage` persistence is sufficient for product validation.
- Real auth, uploads, streaming, transcription, image analysis, and backend APIs are deferred.

## Current Status Snapshot

Based on the current `apps/web` codebase, much of the foundation already exists:

- route files are present for all planned pages
- typed mock domain models already exist
- seeded demo data already exists
- repository helpers already exist
- the app store already persists state and simulates delays
- the shared app shell already supports mobile and desktop navigation
- global theme tokens and glass surfaces already exist

Remaining work should focus on refinement, completeness checks, responsive polish, and validation against this plan rather than rethinking the architecture.
