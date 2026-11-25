# 📋 Muistilista — Household Task & Reminder App

> A real-time, Finnish-language household management PWA built with **SvelteKit 5**, **Supabase**, and **TailwindCSS**. Designed for shared households to track recurring chores, shopping lists, and seasonal produce.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Planned Improvements](#-planned-improvements)

---

## Overview

**Muistilista** ("reminder list" in Finnish) is a Progressive Web App designed for households to collaboratively manage recurring tasks and chores. Each task has a configurable interval (in days), and the app visually communicates urgency through a color-coded system — from green (plenty of time) to red (overdue). The app syncs in real-time across all connected devices via Supabase Realtime, meaning any household member completing a task instantly updates every other user's view.

### Key Concepts

| Finnish Term      | English       | Description                                  |
| ----------------- | ------------- | -------------------------------------------- |
| **Tehtävä**       | Task          | A recurring or one-time household chore      |
| **Suoritus**      | Completion    | A recorded instance of completing a task     |
| **Suoritusväli**  | Interval      | Number of days between expected completions  |
| **Kertasuoritus** | One-time task | A task that is auto-deleted after completion |
| **Ostoslista**    | Shopping list | Shared grocery/shopping list                 |
| **Sesongissa**    | In season     | Seasonal produce calendar for Finland        |

---

## Tech Stack

| Layer                  | Technology                           | Version          |
| ---------------------- | ------------------------------------ | ---------------- |
| **Framework**          | SvelteKit                            | 2.x              |
| **UI Library**         | Svelte                               | 5.x (Runes mode) |
| **Styling**            | TailwindCSS                          | 3.4              |
| **Component Library**  | Melt UI                              | 0.86             |
| **Backend / Database** | Supabase (PostgreSQL)                | —                |
| **Real-time**          | Supabase Realtime (WebSockets)       | —                |
| **Date Formatting**    | date-fns                             | 4.x              |
| **Icons**              | Custom SVG components + Lucide       | —                |
| **Deployment**         | Vercel (Node.js 26.x)                | —                |
| **Language**           | TypeScript                           | 5.x              |
| **Fonts**              | Gabarito (body), Pacifico (headings) | Custom           |

---

## Architecture

### High-Level Overview

```mermaid
graph TB
    subgraph Client["Browser / PWA"]
        SW["Service Worker<br/>(Cache-first for assets)"]
        SK["SvelteKit App"]
        GS["GlobalState<br/>(Svelte 5 Runes)"]
        SK --> GS
    end

    subgraph Supabase["Supabase Cloud"]
        DB["PostgreSQL"]
        RT["Realtime<br/>(WebSockets)"]
        RPC["RPC Functions"]
        DB --> RT
        DB --> RPC
    end

    subgraph Vercel["Vercel Edge"]
        SSR["SSR / Adapter"]
    end

    GS <-->|"CRUD + Subscriptions"| RT
    GS <-->|"RPC Calls"| RPC
    SK -->|"Initial Load"| SSR
    SSR -->|"Data Fetch"| DB
    SW -->|"Cache Assets"| SK
```

### State Management

The app uses a **singleton `GlobalState` class** powered by Svelte 5 runes (`$state`, `$derived`). This class:

1. **Initializes** by fetching tasks via a Supabase RPC function (`get_tehtavat_with_latest_suoritus`)
2. **Subscribes** to Supabase Realtime channels for `tehtavat` (tasks) and `suoritukset` (completions) tables
3. **Enriches** each task with computed `remainingTime` (days until due) and `edellinenSuoritus` (last completion date)
4. **Sorts** tasks by urgency (least remaining time first)
5. **Updates app badges** via the Badging API when tasks are overdue

### Service Worker

A custom service worker implements a **network-first strategy with cache fallback**:

- Build artifacts and static files are pre-cached on install
- Dynamic requests try the network first; on failure, serve from cache
- Old caches are purged on activation

### Rendering Strategy

- **Client-side data loading** (`+page.ts`) — data is fetched on the client via the Supabase JS client
- **SSR layout** — the root layout initializes `GlobalState` and renders the navigation shell
- Deployed on **Vercel** with the `@sveltejs/adapter-vercel` (Node.js 26.x runtime)

---

## Features

### 1. 📝 Task Management (`/`)

The home page displays all recurring household tasks as **color-coded cards** sorted by urgency:

| Remaining Time | Color      | Meaning            |
| -------------- | ---------- | ------------------ |
| ≤ 2 days       | 🔴 Red     | Overdue / Critical |
| ≤ 3 days       | 🟠 Orange  | Due soon           |
| ≤ 5 days       | 🟡 Yellow  | Approaching        |
| ≤ 14 days      | 🟢 Green   | On track           |
| > 14 days      | 🟩 Emerald | Plenty of time     |

Each task card shows:

- Task name
- Last completion date
- Time remaining (human-readable, Finnish locale)
- Interval badge (e.g., "7pv" = 7 days)
- One-time task indicator (🔲 icon)

**Clicking a task** opens a dialog with options to:

- ✅ **Complete** (mark as done — requires confirmation tap)
- ✏️ **Edit** (name, interval, one-time toggle)
- 🗑️ **Delete** (requires confirmation tap)
- **Search/filter** tasks via a search bar

### 2. ➕ Add Task (`/lisaa`)

A form to create new tasks with:

- Task name (required)
- Interval in days (required)
- One-time task checkbox

### 3. 📊 Completion History (`/suoritukset`)

A sortable table of the latest 100 completions showing:

- Task name (clickable to filter)
- Completion date (clickable to edit)
- Who completed it

Features Supabase Realtime subscription for live updates. Includes a dialog for editing or deleting individual completions.

### 4. 🛒 Shopping List (`/ostoslista`)

A modern, offline-first shared shopping list with:

- Quick add input for item names and optional amounts (`määrä`)
- **Inline editing** — tap an uncompleted item's name or amount to edit in-place (`Enter` / OK to save, `Escape` / ✕ to cancel)
- **Quick-add chips (`Viimeisimmät`)** — remembers up to 12 recently used items in `localStorage` and surfaces up to 8 not currently on the active list as 1-tap `+ <tuote>` chips
- **Duplicate detection** — adding an item that is already in *Ostetut* automatically unchecks and restores it; adding an item already in *Ostamatta* shows a toast instead of duplicating
- Check/uncheck items with smooth visual states
- Single-tap removal with instant "Kumoa" (Undo) toast
- Filters (All, Unchecked, Checked) with auto-reset to "Kaikki" when completed items are cleared, plus "Poista ostetut" action
- **Drag-to-reorder** for uncompleted items (supports desktop mouse drag and mobile touch gestures with `localStorage` order persistence)
- Real-time synchronization across devices via Supabase Realtime channel and local IndexedDB cache (requires `ostokset` table in `supabase_realtime` publication)

### 5. 🍎 Seasonal Produce Calendar (`/sesongissa`)

A Finnish seasonal produce calendar showing what fruits, vegetables, root vegetables, mushrooms, and wild plants are in season for each month. Features:

- Month-to-month navigation (with wrap-around)
- Categorized cards with distinct color schemes
- Finnish alphabetical sorting
- Data sourced from a local JSON file (12 months, ~100+ items)

### 6. 🔔 Notifications & Badges

- **App Badge API** — shows the count of overdue tasks on the app icon
- **Notification permission** — prompts users with a pulsing bell icon
- **Notification support** — commented-out code for Android notification dots (ready to enable)

### 7. 📱 Responsive Navigation

- **Desktop**: Top navigation bar with gradient background and icon+text links
- **Mobile**: Bottom tab bar with floating action button (FAB) for adding tasks
- **Neon-style** animated logo with flicker and glow effects
- iOS safe area support (`env(safe-area-inset-bottom)`)
- Local device user name input (`UserNameInput`) and sign-out button in the upper right corner

### 8. 🔐 Authentication (`/kirjaudu`)

- **Passwordless 6-digit Email OTP** (`signInWithOtp` + `verifyOtp`) — users enter their email and type the 6-digit code directly inside the PWA without leaving to an external browser
- **Client-side route guard** in `+layout.svelte` — redirects unauthenticated users to `/kirjaudu` and displays a loading splash while resolving the session
- **Persistent session** (`persistSession`, `autoRefreshToken`) stored in `localStorage` via Supabase Auth

---

## Data Model

### Supabase Tables

```mermaid
erDiagram
    tehtavat {
        int id PK
        string nimi
        int suoritusvali
        boolean kertasuoritus
        timestamp created_at
    }

    suoritukset {
        int id PK
        timestamp suoritettu
        int tehtava_id FK
        string suorittaja
        string tehtava_nimi
    }

    ostokset {
        int id PK
        string nimi
        string maara "Optional quantity or note (e.g. 2 kpl, 1 l)"
        boolean completed "Checked/bought state"
        timestamp created_at "Creation timestamp"
    }

    tehtavat ||--o{ suoritukset : "has many"
```

### RPC Functions

| Function                            | Description                                                     |
| ----------------------------------- | --------------------------------------------------------------- |
| `get_tehtavat_with_latest_suoritus` | Returns all tasks joined with their most recent completion date |

### Realtime Subscriptions

| Channel                   | Tables                    | Events                 | Notes                                                                                                     |
| ------------------------- | ------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `global-tehtavat-changes` | `tehtavat`, `suoritukset` | INSERT, UPDATE, DELETE | Active                                                                                                    |
| `suoritukset-changes`     | `suoritukset`             | INSERT, UPDATE, DELETE | Active                                                                                                    |
| `ostokset-changes`        | `ostokset`                | INSERT, UPDATE, DELETE | Code is ready; requires `ALTER PUBLICATION supabase_realtime ADD TABLE ostokset;` in Supabase to activate |

---

## Project Structure

```
muistilista_svelte/
├── src/
│   ├── app.css                    # Global styles, font imports, Tailwind directives
│   ├── app.d.ts                   # Global TypeScript interfaces (Tehtava, Suoritus, Ostos, EnrichedTehtava)
│   ├── app.html                   # HTML shell with PWA manifest link
│   ├── service-worker.ts          # Custom service worker (cache-first assets, network-first API)
│   ├── components/
│   │   ├── Navigaatio.svelte      # Responsive nav (desktop top bar + mobile bottom tabs + sign-out)
│   │   ├── Tehtavat.svelte        # Task list with search/filter
│   │   ├── Tehtavarivi.svelte     # Individual task card (color-coded)
│   │   ├── TehtavaDialog.svelte   # Task detail/edit/complete/delete dialog
│   │   ├── SuoritusDialog.svelte  # Completion edit/delete dialog
│   │   └── UserNameInput.svelte   # Local device performer name input
│   ├── lib/
│   │   ├── auth.svelte.ts         # AuthState singleton (Supabase 6-digit email OTP)
│   │   ├── index.ts               # Utility functions (haeTehtavat, haeSuoritukset, laskeJaljellaOlevaAika)
│   │   ├── ostoslista.svelte.ts   # OstoslistaState singleton (offline-first IDB + Realtime)
│   │   ├── state.svelte.ts        # GlobalState singleton (Svelte 5 runes, Realtime subscriptions)
│   │   ├── supabase.ts            # Supabase client initialization (with auth session persistence)
│   │   ├── user.svelte.ts         # Local user profile state (localStorage)
│   │   ├── data/
│   │   │   └── seasonalProduceData.json  # Finnish seasonal produce (12 months)
│   │   ├── fonts/
│   │   │   ├── Gabarito-VariableFont_wght.ttf
│   │   │   └── Pacifico-Regular.ttf
│   │   └── icons/                 # Custom SVG icon components (9 icons)
│   │       ├── BellIcon.svelte
│   │       ├── DeleteIcon.svelte
│   │       ├── FruitIcon.svelte
│   │       ├── MUIOneIcon.svelte
│   │       ├── PlusIcon.svelte
│   │       ├── SearchIcon.svelte
│   │       ├── SheetIcon.svelte
│   │       ├── ShoppingIcon.svelte
│   │       └── SquarePenIcon.svelte
│   └── routes/
│       ├── +layout.svelte         # Root layout (gradient bg, auth guard, nav, state init)
│       ├── +page.svelte           # Home — task list
│       ├── +page.ts               # Home — data loader (RPC)
│       ├── kirjaudu/
│       │   └── +page.svelte       # Passwordless 6-digit email OTP login page
│       ├── lisaa/
│       │   └── +page.svelte       # Add new task form
│       ├── ostoslista/
│       │   ├── +page.svelte       # Shopping list (offline-first, real-time)
│       │   └── +page.ts           # Shopping list data loader
│       ├── sesongissa/
│       │   └── +page.svelte       # Seasonal produce calendar
│       └── suoritukset/
│           ├── +page.svelte       # Completion history table
│           └── +page.ts           # Completions data loader
├── static/
│   ├── favicon.png                # App favicon (512x512)
│   ├── logo512.png                # PWA icon (512x512)
│   ├── logo512maskable.png        # Maskable PWA icon
│   ├── logo1024.png               # High-res icon (1024x1024)
│   ├── badge-icon.png             # Notification badge icon
│   ├── notification-icon.png      # Notification icon
│   └── manifest.json              # PWA web app manifest
├── package.json
├── svelte.config.js               # SvelteKit config (Vercel adapter, Melt UI preprocessor)
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── vercel.json                    # Vercel build config (Node 26)
└── .env                           # Supabase URL, Anon Key, Gemini API Key
```

---

## 🚀 Planned Improvements

### Phase 1: Foundation — Offline-First Architecture (✅ Valmis / Completed)

> All Phase 1 items are complete. IndexedDB (Dexie.js), optimistic UI, sync queue, conflict resolution, connectivity banner, and Background Sync API are all fully implemented.

---

### Phase 2: Authentication — Supabase Auth (🚧 Osittain valmis / Partially Completed)

> **Goal**: Secure the app with user accounts so each household can have its own private task list. Minimal passwordless 6-digit email OTP authentication, client-side route guarding, and session persistence are implemented; household groups and per-household RLS remain planned.

| Feature                      | Description                                                                                    | Status / Priority |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| **Email OTP auth (6-digit)** | Passwordless login via 6-digit email OTP code (`/kirjaudu`, works inside installed PWA)        | ✅ Implemented     |
| **Auth-gated routes**        | Client-side route guard in `+layout.svelte` redirecting unauthenticated users to `/kirjaudu`   | ✅ Implemented     |
| **Session management**       | Automatic token refresh and `localStorage` session persistence (`supabase.ts`) + sign-out UI   | ✅ Implemented     |
| **OAuth providers**          | Google and/or Apple sign-in for frictionless onboarding                                        | 🟡 Important      |
| **Household groups**         | Allow users to create/join a household and share tasks within the group                        | 🔴 Critical       |
| **Row Level Security (RLS)** | Shared `authenticated` RLS policies documented; per-household isolation planned                | 🔴 Critical       |
| **User profiles**            | Link completion performer (`suorittaja`) to authenticated user profile instead of local-only   | 🟡 Important      |

---

### Phase 3: Mobile Native — Capacitor Integration

> **Goal**: Package the web app as a native Android (and optionally iOS) app for better mobile experience and access to native APIs.

| Feature                       | Description                                                                                        | Priority        |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | --------------- |
| **Capacitor setup**           | Initialize Capacitor project with Android platform                                                 | 🔴 Critical     |
| **Adapter swap**              | Switch from `adapter-vercel` to `adapter-static` for Capacitor builds (with separate build config) | 🔴 Critical     |
| **Native splash screen**      | Custom splash screen with Muistilista branding                                                     | 🟡 Important    |
| **Status bar theming**        | Match the gradient purple theme in the native status bar                                           | 🟡 Important    |
| **Haptic feedback**           | Add vibration feedback on task completion and destructive actions                                  | 🟢 Nice to have |
| **Native push notifications** | Use Firebase Cloud Messaging (FCM) for reliable push notifications on Android                      | 🟡 Important    |
| **Deep links**                | Support deep linking to specific tasks or views                                                    | 🟢 Nice to have |

---

### Phase 4: Android Home-Screen Widgets

> **Goal**: Provide at-a-glance task status and quick-complete actions directly from the Android home screen.

| Feature                   | Description                                                              | Priority        |
| ------------------------- | ------------------------------------------------------------------------ | --------------- |
| **Overdue tasks widget**  | A compact widget showing the count and list of overdue/due-soon tasks    | 🔴 Critical     |
| **Quick-complete action** | Tap a task in the widget to mark it as completed without opening the app | 🟡 Important    |
| **Shopping list widget**  | A checklist widget for the shopping list with toggle support             | 🟢 Nice to have |
| **Widget refresh**        | Periodic background refresh + on-data-change push updates                | 🟡 Important    |
| **Capacitor plugin**      | Use `@nicepkg/capacitor-android-widget` or a custom Capacitor plugin     | 🔴 Critical     |

---

### Phase 5: UX Enhancements

> **Goal**: Polish the user experience with features that make daily use delightful and efficient.

| Feature                       | Description                                                                                                          | Priority        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Pull-to-refresh**           | Native-feeling pull-to-refresh gesture on mobile                                                                     | 🟡 Important    |
| **Task categories / tags**    | Group tasks by room, type, or custom tags (e.g., "Kitchen", "Bathroom", "Garden")                                    | 🟡 Important    |
| **Scheduled reminders**       | Set specific time-of-day reminders for tasks that are due, via push notification                                     | 🔴 High impact  |
| **Dark / light theme toggle** | Currently hardcoded to a purple gradient; add theme switching                                                        | 🟢 Nice to have |
| **Drag-to-reorder**           | Allow manual reordering of tasks (pin important ones to the top)                                                     | 🟢 Nice to have |
| **Onboarding flow**           | First-launch tutorial explaining the app concept for new users                                                       | 🟡 Important    |
| **Accessibility audit**       | ARIA labels, keyboard navigation, screen reader support, focus management                                            | 🟡 Important    |
| **Task "Snooze" / lykkää**    | Postpone a task's due date by N days without marking it complete — add a "Lykkää X päivää" button in the task dialog | 🟡 Important    |

---

### Implementation Priority Roadmap

```mermaid
gantt
    title Muistilista Improvement Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y

    section Phase 2: Authentication
    Supabase Auth + RLS            :p2a, 2026-11-20, 5d
    Household groups               :p2b, after p2a, 4d
    User profiles                  :p2c, after p2b, 2d

    section Phase 3: Capacitor
    Capacitor setup + build        :p3a, after p2c, 3d
    Native features                :p3b, after p3a, 4d
    Push notifications             :p3c, after p3b, 3d

    section Phase 4: Widgets
    Overdue tasks widget           :p4a, after p3c, 5d
    Quick-complete + refresh       :p4b, after p4a, 3d

    section Phase 5: UX Polish
    Performer name + realtime sync :p5a, after p4b, 1d
    Task categories + reminders    :p5b, after p5a, 4d
    Remaining polish               :p5c, after p5b, 5d
```

---

### Technical Debt & Quick Wins

These items should be addressed alongside the main phases:

| Item                             | Description                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚠️ **Exposed secrets in `.env`** | Supabase anon key and Gemini API key are committed to git. Move to environment-only variables and rotate keys.                                                    |
| ✅ **Performer name (pre-auth)** | Added local device user name input in the upper right corner with continuous flashing cursor; used as `suorittaja` on completions instead of static "Tuntematon". |
| 🔧 **`vite-plugin-pwa` unused**  | Listed as a dependency but not configured in `vite.config.ts`. Either integrate or remove.                                                                        |
| 🔧 **CSR-only but doc says SSR** | `+layout.ts` exports `ssr = false` making this a pure CSR/PWA; the architecture section still mentions "SSR layout". Update or clarify.                           |

---

_Last updated: November 25, 2026_
