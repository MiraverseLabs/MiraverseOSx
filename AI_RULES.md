# MiraverseOSx AI Rules

## Tech stack

- **Frontend:** React, TypeScript, and Vite in `frontend/`. `frontend/src/App.tsx` mounts the desktop shell; in-world apps and VerseNet routes live under `frontend/src/apps/`.
- **UI and styling:** Tailwind CSS and feature CSS; shared shell components in `frontend/src/components/ui/`, Base UI/shadcn-style components in `frontend/src/dgaos/components/ui/`, and Bootstrap/React Bootstrap in existing screens.
- **State and offline storage:** React hooks and context, Zustand stores, IndexedDB via `idb-keyval`, and a browser service worker built from `frontend/offline-worker.js`.
- **Interactive UI:** Lucide icons, Framer Motion, dnd-kit, Tiptap, React Flow (`@xyflow/react`), Phaser, MiniSearch, and Recharts.
- **Desktop and HTTP host:** C# on .NET 8, with Photino.NET for the desktop webview and `HttpListener` for the HTTP surface in `Program.cs`. Vite emits the web build to `wwwroot/`.
- **Server persistence and AI:** SQLite via `Microsoft.Data.Sqlite` and Dapper; server-side provider adapters, routing, and cost controls live in `Ai/`.
- **Simulation:** Python and Mesa under `simulation/`, connected to the app through the existing Living World bridge.
- **Verification:** TypeScript checking, Node's built-in test runner, Playwright for browser flows, Storybook for UI examples, and existing .NET and Python test suites.

## Library and architecture rules

- **Shell and routing:** Register desktop apps through the existing shell and app directory. Extend the relevant VerseNet router or site registry for in-world navigation. Do not add React Router or a parallel `src/pages/` structure.
- **UI:** Reuse the nearest shared primitive first: shell components for desktop UI and DGAOS Base UI wrappers for DGAOS. Use Tailwind for routine layout and spacing, and existing CSS themes for feature-specific styling. Keep Bootstrap/React Bootstrap within screens already using it; do not add another component system. Use existing branded assets for in-world identity and `lucide-react` for generic icons.
- **State and requests:** Keep component-local state in React, use existing context for feature-scoped state, and extend the relevant Zustand store for cross-app state. Use the existing typed request/service code and `fetch` for HTTP, and `idb-keyval` through the existing storage adapters for IndexedDB-backed data. Do not introduce a second global state or request cache layer.
- **Specialized interactions:** Use CSS for simple transitions and Framer Motion for shell/window motion; use dnd-kit for sortable lists and preserve keyboard controls. Reuse the shared Tiptap editor for rich text. Use React Flow for node-and-edge boards, Phaser for game scenes, MiniSearch for client-side full-text search, and the DGAOS Recharts wrapper for charts.
- **Backend and data:** Extend the relevant C# API module. Use `System.Text.Json` for new JSON contracts and retain Newtonsoft.Json where existing code relies on it. Use parameterized Dapper queries over `Microsoft.Data.Sqlite`; do not introduce another ORM. Resolve DB paths through `DatabasePaths.cs` and follow `docs/data/SQLITE-CONTENT-GUIDE.md` for canonical content. Preserve the distinction between canonical content, player saves, and browser mirrors.
- **AI and simulation:** Send model requests through the existing server-side AI router and provider adapters; keep provider keys out of the frontend and preserve cost controls. Extend simulation behavior in Python/Mesa through the existing bridge instead of reimplementing it in React.
- **Tests and dependencies:** Use Node tests for frontend logic, Playwright for end-to-end behavior, and Storybook for isolated component states. Use the existing test suite for the backend or simulation layer you change. Reuse installed dependencies and standard APIs before adding a library; put any necessary new dependency in the manifest for the layer that imports it.
