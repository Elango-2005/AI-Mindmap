# Phase 0: Existing Product Audit & Architecture Report

## 1. Current Route Structure
- **Global / Auth:** `__root.tsx`, `index.tsx`, `login.tsx`, `register.tsx`
- **Dashboard / Management:** `dashboard.tsx`, `projects.tsx`, `templates.tsx`, `history.tsx`, `settings.tsx`, `account.tsx`
- **Core Editor:** `workspace.$mindMapId.tsx` (visual canvas)
- **Presentation:** `present.$mindMapId.tsx`

## 2. Current Component Structure
- **Shell:** `AppLayout.tsx` handles mobile responsiveness and wraps `AppSidebar.tsx`.
- **Workspace:** `workspace.$mindMapId.tsx` is a monolithic file handling canvas state, history, API calls, and multiple panels.
- **Canvas Elements:** `EditableNode.tsx` and `EditableEdge.tsx` handle React Flow rendering.
- **Utilities:** `OutlinePanel.tsx`, `ShareModal.tsx`, `TemplatesModal.tsx`, `HistoryDrawer.tsx`.
- **UI Primitives:** Custom `Icon.tsx` and a `ui/` directory containing shadcn/Radix-style components (Sheets, Dropdowns).

## 3. Current Navigation Structure
- **Primary:** `AppSidebar.tsx` contains global links (Dashboard, Projects, Templates, History, Settings).
- **Secondary / Header:** Handled individually inside routes (e.g., breadcrumbs in `workspace.$mindMapId.tsx`).
- **Contextual Gaps:** 
  - The "New MindMap" button exists globally in the sidebar. Clicking it automatically creates a dummy project ("Untitled Project") and immediately routes to the workspace. This bypasses logical project organization.

## 4. Current Workspace Structure
- **Layout:** A dense 3-panel layout:
  1. Left: Collapsible Sidebar (`AppSidebar`).
  2. Center: React Flow Canvas with multiple floating toolbars (Top-center for layout/theme, Bottom-right for zoom controls).
  3. Right: AI Assistant sidebar (collapsible on mobile via `Sheet`).
- **Empty State:** A center-screen greeting and a bottom-fixed chat bar (ChatGPT-style) that generates the initial map.

## 5. Current API Integration
- **Client:** `axios` configured in `api/client.ts` with JWT interceptors.
- **Domains:** Separated into `auth.ts`, `projects.ts`, `mindmaps.ts`, `nodes.ts`, `edges.ts`, `integrations.ts`.
- **AI Contracts:** 
  - `POST /api/v1/mind-maps/{id}/generate` (Topic -> Full Graph)
  - `POST /api/v1/mind-maps/{id}/chat` (Instruction + Optional Node ID -> Modified Graph + Text)

## 6. Current State Management
- **Local State:** Heavy use of `useState` inside `workspace.$mindMapId.tsx` (nodes, edges, selection, history stack, panel toggles).
- **External State:** React Flow manages zoom/pan and drag coordinates internally before committing via callbacks.
- **Real-time:** `useMindMapSync` hook manages WebSocket multi-player cursors and node syncing.

## 7. Existing Reusable Components
- Standard UI primitives (`DropdownMenu`, `Sheet`).
- `Icon` component.

## 8. Components that Should Be Redesigned
- **`AppSidebar.tsx` & `AppLayout.tsx`:** Needs to shed the heavy, high-contrast look for a calm, spacious, Figma/Claude-style canvas aesthetic.
- **`workspace.$mindMapId.tsx`:** The right-hand AI sidebar decouples the user from direct manipulation. The AI chat should float or be integrated contextually (like Gamma/Notion AI).
- **`EditableNode.tsx`:** Needs a typography-first premium redesign.
- **`projects.tsx` / `dashboard.tsx`:** Needs a unified, minimalist card layout.

## 9. Components that Should Be Preserved
- All `api/*.ts` client integrations.
- The underlying `ReactFlow` initialization and WebSocket hook (`useMindMapSync`).
- The backend API endpoints and their expected JSON payloads.

## 10. UI/UX Problems
- **Duplicated/Misplaced Actions:** "New MindMap" should live inside a Project context or the Dashboard, not permanently stuck to the global sidebar. 
- **Disconnect between AI and Canvas:** Selecting a node and then moving the mouse to a right-hand sidebar to type a command feels disconnected. A floating contextual toolbar (hybrid approach) would be vastly superior.
- **Visual Noise:** The top-center layout/theme dropdowns hover over the canvas awkwardly. They should be tucked into a clean settings menu or properties panel.

## 11. Functional Gaps
- **Contextual Clarity:** While the backend supports `selectedNodeId` during chat, the UI doesn't strongly reinforce what the AI is targeting.
- **Hybrid Workflow:** There is no smooth transition between typing in a node manually and asking the AI to continue writing it.

## 12. Backend Limitations
- The backend expects node relationships to be managed strictly via UUIDs.
- `generateAIMindMap` replaces or generates a full graph structure. 
- The client cannot optimistically generate nodes completely on its own; it must wait for the backend to return the AI-generated UUIDs and edges. (This means loading states must be handled gracefully on the frontend).

