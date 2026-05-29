# Frontend Guide

The frontend of xyMusicUpdater is built as a Single Page Application (SPA) using React 18, Vite, and raw CSS for maximum performance and a zero-bloat UI.

## 1. Decentralized Polling & State Management

Instead of relying on global state management libraries (like Redux) and constantly polling all endpoints, the frontend utilizes a decentralized, tab-aware loading strategy:

*   **Contextual Fetching**: Heavy payloads, such as `/api/songs/` and `/api/playlist-map/`, are strictly requested *only* when the user navigates to a tab that requires them (e.g., Library, Tagging, Editor).
*   **Callback Refreshing**: Every mutating API call (e.g., `triggerRescan`, `mergeCompilation`, `updateSong`) triggers a targeted `.then(refreshAll)` to immediately invalidate stale data and update the view.

## 2. Server-Sent Events (SSE)

The `useSSE` hook (`frontend/src/hooks/useSSE.js`) manages a persistent, real-time connection to the backend, which also serves as the primary heartbeat mechanism for system liveness.

*   **Resiliency**: If the connection drops or the server restarts, the hook implements a retry policy (up to 10 retries, every 5 seconds) before permanently failing and forcing a logout.
*   **Event Logging**: The backend broadcasts `info`, `warning`, and `error` events directly to the frontend's `LiveLog` component, providing an immediate glimpse into background tasks without needing to poll log files.

## 3. UI Aesthetics: Glassmorphism & Theming

The user interface eschews heavy component libraries like Material-UI or Tailwind CSS, relying entirely on raw, highly optimized inline styles and generic CSS classes.

*   **Dynamic Theming**: The user can set a `UI_THEME_COLOR` via the settings panel. The `App.jsx` component dynamically injects this as a CSS variable (`--accent`), instantly updating all buttons, borders, and active states.
*   **Glassmorphism**: If `UI_DASHBOARD_BG` is enabled, the UI applies `backdropFilter: blur(12px)` and semi-transparent RGBA backgrounds to the sidebar, content panels, and footer. This allows the user's custom background image to softly shine through.
*   **Animations**: The `index.html` defines several global CSS keyframes (`animate-slide`, `animate-slide-up`, `animate-fade`, `animate-bounce`). These are applied globally to ensure a modern, smooth, and tactile user experience.
*   **Infinite Marquees**: The `ScrollingText` component automatically detects overflow based on the DOM's `offsetWidth`. It clones the text and applies a dynamically calculated `animation-duration` to ensure all long titles across the app scroll seamlessly at a constant 40 pixels per second.
