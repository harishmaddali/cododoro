# cododoro

A desktop tracker that ties daily commit goals to your GitHub contribution heatmap, plus a marketing landing page — managed as a single pnpm monorepo.

## What's in this repo

```
cododoro/
├── apps/
│   ├── desktop-app/          # Vite + React 18 + Tailwind + Tauri 2 (the product)
│   └── landing/              # Astro 5 + Tailwind marketing landing page
├── .github/workflows/        # Release + publish-release (pnpm-aware)
├── package.json              # @cododoro/root — orchestration scripts
├── pnpm-workspace.yaml
├── pnpm-lock.yaml            # single workspace lockfile
└── BUILD_AND_PUBLISH.md      # release & signing playbook
```

## What it is

**cododoro** is a small cross-platform desktop app that reads your local GitHub activity through the `gh` CLI and surfaces it as a daily commit goal, a streak, and a contribution heatmap. It runs in a compact window alongside your editor, polls in the background, and nudges you with native notifications when you're behind on the day's goal.

## Features

- Onboarding flow that captures a daily commit goal, repo filters, and accent color.
- Home screen with the current day's progress, streak, and a refresh button.
- Contribution heatmap with per-day tooltips, driven by a configurable streak window.
- Per-repo drill-down view with its own activity slice.
- Goals and nudges screens for adjusting the daily target and notification cadence.
- Background refresh on an interval plus refresh on window focus.
- Built-in updater that pulls signed releases from GitHub.
- Authentication gate that defers to the local `gh` CLI; no tokens are stored by the app.

## Tech stack

- **Desktop app**: Vite · React 18 · TypeScript · Tailwind CSS · Tauri 2 (Rust backend, system-native window and notifications)
- **Landing**: Astro 5 · Tailwind CSS · static output
- **Monorepo**: pnpm workspaces (pinned via `packageManager`)

## Getting started

Prerequisites:

- **Node.js** 20+ and **pnpm** 10+ (a `packageManager` field is pinned; `corepack enable` will pick it up automatically)
- **Rust** (only required to build/run the Tauri shell)
- The [GitHub CLI](https://cli.github.com/) (`gh`) authenticated on your machine (the desktop app uses it at runtime)

Clone and install once at the repo root:

```bash
git clone https://github.com/harishmaddali/cododoro.git
cd cododoro
pnpm install
```

### Day-to-day commands (from the repo root)

| Command | What it does |
| --- | --- |
| `pnpm dev:desktop` | Vite dev server for the desktop app frontend (no Tauri shell). |
| `pnpm dev:landing` | Astro dev server for the landing page. |
| `pnpm build:desktop` | Type-check and produce the web build (the assets Tauri bundles). |
| `pnpm build:landing` | Static Astro build → `apps/landing/dist/`. |
| `pnpm tauri dev` | Run the full desktop app (Vite + Tauri shell). |
| `pnpm tauri build` | Build a native desktop installer for the current host. |
| `pnpm typecheck` | Run `typecheck` in every workspace. |
| `pnpm format` / `pnpm format:check` | Prettier across the monorepo. |

### Working inside a single app

You can also call into a specific workspace directly:

```bash
pnpm -F @cododoro/desktop-app dev
pnpm -F @cododoro/landing build
pnpm -F @cododoro/desktop-app tauri:build:macos-universal
```

Platform-specific bundle scripts (`tauri:build:macos`, `tauri:build:macos-arm64`, `tauri:build:macos-universal`, `tauri:build:windows`, `tauri:build:linux`) all live on `@cododoro/desktop-app` and are reachable via `pnpm -F`.

See [BUILD_AND_PUBLISH.md](BUILD_AND_PUBLISH.md) for the release workflow, including updater signing.

## Project structure

```
.
├── apps/
│   ├── desktop-app/
│   │   ├── index.html              # Vite entry
│   │   ├── src/                    # React frontend
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── components/         # Welcome, Onboarding, AuthGate, shared chrome
│   │   │   ├── screens/            # Home, Repos, History, Goals, Nudges, Profile, RepoDetail
│   │   │   └── lib/                # API client, types, updater
│   │   ├── src-tauri/              # Rust/Tauri shell, capabilities, icons, tauri.conf.json
│   │   ├── scripts/                # Release and versioning helpers
│   │   ├── tailwind.config.js
│   │   ├── vite.config.ts
│   │   └── package.json            # @cododoro/desktop-app
│   └── landing/
│       ├── src/
│       │   ├── pages/index.astro
│       │   ├── components/         # Logo, FeatureCard, DownloadButton
│       │   ├── layouts/Base.astro
│       │   └── styles/global.css
│       ├── astro.config.mjs
│       ├── tailwind.config.cjs
│       └── package.json            # @cododoro/landing
├── .github/workflows/              # pnpm-aware CI
├── package.json                    # @cododoro/root
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## License

[MIT](LICENSE).
