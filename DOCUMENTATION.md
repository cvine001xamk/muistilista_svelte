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

| Finnish Term | English | Description |
|---|---|---|
| **Tehtävä** | Task | A recurring or one-time household chore |
| **Suoritus** | Completion | A recorded instance of completing a task |
| **Suoritusväli** | Interval | Number of days between expected completions |
| **Kertasuoritus** | One-time task | A task that is auto-deleted after completion |
| **Ostoslista** | Shopping list | Shared grocery/shopping list |
| **Sesongissa** | In season | Seasonal produce calendar for Finland |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | SvelteKit | 2.x |
| **UI Library** | Svelte | 5.x (Runes mode) |
| **Styling** | TailwindCSS | 3.4 |
| **Component Library** | Melt UI | 0.86 |
| **Backend / Database** | Supabase (PostgreSQL) | — |
| **Real-time** | Supabase Realtime (WebSockets) | — |
| **Date Formatting** | date-fns | 4.x |
| **Icons** | Custom SVG components + Lucide | — |
| **Deployment** | Vercel (Node.js 26.x) | — |
| **Language** | TypeScript | 5.x |
| **Fonts** | Gabarito (body), Pacifico (headings) | Custom |

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

| Remaining Time | Color | Meaning |
|---|---|---|
| ≤ 2 days | 🔴 Red | Overdue / Critical |
| ≤ 3 days | 🟠 Orange | Due soon |
| ≤ 5 days | 🟡 Yellow | Approaching |
| ≤ 14 days | 🟢 Green | On track |
| > 14 days | 🟩 Emerald | Plenty of time |

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
- Quick add input for item names
- Check/uncheck items with smooth visual states
- Single-tap removal with instant "Kumoa" (Undo) toast
- Filters (All, Unchecked, Checked) and "Poista ostetut" action
- Real-time synchronization across all household devices via Supabase and local IndexedDB cache

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

| Function | Description |
|---|---|
| `get_tehtavat_with_latest_suoritus` | Returns all tasks joined with their most recent completion date |

### Realtime Subscriptions

| Channel | Tables | Events | Notes |
|---|---|---|---|
| `global-tehtavat-changes` | `tehtavat`, `suoritukset` | INSERT, UPDATE, DELETE | Active |
| `suoritukset-changes` | `suoritukset` | INSERT, UPDATE, DELETE | Active |
| `ostokset-changes` | `ostokset` | INSERT, UPDATE, DELETE | Code is ready; requires `ALTER PUBLICATION supabase_realtime ADD TABLE ostokset;` in Supabase to activate |

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
│   │   ├── Navigaatio.svelte      # Responsive nav (desktop top bar + mobile bottom tabs)
│   │   ├── Tehtavat.svelte        # Task list with search/filter
│   │   ├── Tehtavarivi.svelte     # Individual task card (color-coded)
│   │   ├── TehtavaDialog.svelte   # Task detail/edit/complete/delete dialog
│   │   └── SuoritusDialog.svelte  # Completion edit/delete dialog
│   ├── lib/
│   │   ├── index.ts               # Utility functions (haeTehtavat, haeSuoritukset, laskeJaljellaOlevaAika)
│   │   ├── state.svelte.ts        # GlobalState singleton (Svelte 5 runes, Realtime subscriptions)
│   │   ├── supabase.ts            # Supabase client initialization
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
│       ├── +layout.svelte         # Root layout (gradient bg, nav, state init)
│       ├── +page.svelte           # Home — task list
│       ├── +page.ts               # Home — data loader (RPC)
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

### Phase 2: Authentication — Supabase Auth

> **Goal**: Secure the app with user accounts so each household can have its own private task list.

| Feature | Description | Priority |
|---|---|---|
| **Email/password auth** | Basic sign-up and sign-in with Supabase Auth | 🔴 Critical |
| **Magic link auth** | Passwordless login via email magic links | 🟡 Important |
| **OAuth providers** | Google and/or Apple sign-in for frictionless onboarding | 🟡 Important |
| **Household groups** | Allow users to create/join a household and share tasks within the group | 🔴 Critical |
| **Row Level Security (RLS)** | Enforce per-household data isolation at the database level | 🔴 Critical |
| **User profiles** | Replace hardcoded "Tuntematon" (unknown) completion performer with actual user names | 🟡 Important |
| **Auth-gated routes** | Protect all routes with authentication middleware (`hooks.server.ts`) | 🔴 Critical |
| **Session management** | Handle token refresh, session expiry, and secure cookie storage | 🟡 Important |

---

### Phase 3: Mobile Native — Capacitor Integration

> **Goal**: Package the web app as a native Android (and optionally iOS) app for better mobile experience and access to native APIs.

| Feature | Description | Priority |
|---|---|---|
| **Capacitor setup** | Initialize Capacitor project with Android platform | 🔴 Critical |
| **Adapter swap** | Switch from `adapter-vercel` to `adapter-static` for Capacitor builds (with separate build config) | 🔴 Critical |
| **Native splash screen** | Custom splash screen with Muistilista branding | 🟡 Important |
| **Status bar theming** | Match the gradient purple theme in the native status bar | 🟡 Important |
| **Haptic feedback** | Add vibration feedback on task completion and destructive actions | 🟢 Nice to have |
| **Native push notifications** | Use Firebase Cloud Messaging (FCM) for reliable push notifications on Android | 🟡 Important |
| **Deep links** | Support deep linking to specific tasks or views | 🟢 Nice to have |

---

### Phase 4: Android Home-Screen Widgets

> **Goal**: Provide at-a-glance task status and quick-complete actions directly from the Android home screen.

| Feature | Description | Priority |
|---|---|---|
| **Overdue tasks widget** | A compact widget showing the count and list of overdue/due-soon tasks | 🔴 Critical |
| **Quick-complete action** | Tap a task in the widget to mark it as completed without opening the app | 🟡 Important |
| **Shopping list widget** | A checklist widget for the shopping list with toggle support | 🟢 Nice to have |
| **Widget refresh** | Periodic background refresh + on-data-change push updates | 🟡 Important |
| **Capacitor plugin** | Use `@nicepkg/capacitor-android-widget` or a custom Capacitor plugin | 🔴 Critical |

---

### Phase 5: UX Enhancements

> **Goal**: Polish the user experience with features that make daily use delightful and efficient.

| Feature | Description | Priority |
|---|---|---|
| **Pull-to-refresh** | Native-feeling pull-to-refresh gesture on mobile | 🟡 Important |
| **Task categories / tags** | Group tasks by room, type, or custom tags (e.g., "Kitchen", "Bathroom", "Garden") | 🟡 Important |
| **Scheduled reminders** | Set specific time-of-day reminders for tasks that are due, via push notification | 🔴 High impact |
| **Task history chart** | Visual chart showing completion frequency over time | 🟢 Nice to have |
| **Dark / light theme toggle** | Currently hardcoded to a purple gradient; add theme switching | 🟢 Nice to have |
| **Drag-to-reorder** | Allow manual reordering of tasks (pin important ones to the top) | 🟢 Nice to have |
| **Onboarding flow** | First-launch tutorial explaining the app concept for new users | 🟡 Important |
| **Multi-language support (i18n)** | Add English language support alongside Finnish | 🟢 Nice to have |
| **Accessibility audit** | ARIA labels, keyboard navigation, screen reader support, focus management | 🟡 Important |
| **Smart task suggestions** | Use AI (Gemini API key already present) to suggest common household tasks during onboarding | 🟢 Nice to have |
| **Performer name (pre-auth)** | Store a user-chosen display name in `localStorage` and use it as `suorittaja` instead of hardcoded "Tuntematon" — zero-auth quick win | 🔴 High impact |
| **Shopping list real-time sync** | Run `ALTER PUBLICATION supabase_realtime ADD TABLE ostokset;` in Supabase — app subscription code is ready, only a DB config step needed | 🔴 High impact |
| **Task "Snooze" / lykkää** | Postpone a task's due date by N days without marking it complete — add a "Lykkää X päivää" button in the task dialog | 🟡 Important |
| **Shopping list reordering** | Drag-to-reorder or pin items on the shopping list; currently sorted only by `created_at` | 🟢 Nice to have |
| **Completion streak counter** | Show per-task streak count (consecutive on-time completions) on the task card — motivates consistent upkeep | 🟢 Nice to have |

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

| Item | Description |
|---|---|
| ⚠️ **Exposed secrets in `.env`** | Supabase anon key and Gemini API key are committed to git. Move to environment-only variables and rotate keys. |
| 🔧 **Hardcoded performer** | Completions are always attributed to "Tuntematon". Should use authenticated user name (or a `localStorage` display name as a pre-auth quick win). |
| 🔧 **`vite-plugin-pwa` unused** | Listed as a dependency but not configured in `vite.config.ts`. Either integrate or remove. |
| 🔧 **CSR-only but doc says SSR** | `+layout.ts` exports `ssr = false` making this a pure CSR/PWA; the architecture section still mentions "SSR layout". Update or clarify. |

---

*Last updated: November 18, 2026*
