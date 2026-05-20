# cododoro

A desktop tracker that ties daily commit goals to your GitHub contribution heatmap.

## What it is

cododoro is a small cross-platform desktop app that reads your local GitHub activity through the `gh` CLI and surfaces it as a daily commit goal, a streak, and a contribution heatmap. It runs in a compact window alongside your editor, polls in the background, and nudges you with native notifications when you're behind on the day's goal.

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

- Vite
- React 18 + TypeScript
- Tailwind CSS
- Tauri 2 (Rust backend, system-native window and notifications)

## Getting started

Prerequisites: Node.js, Rust (for the Tauri build), and the [GitHub CLI](https://cli.github.com/) (`gh`) authenticated on your machine.

```bash
git clone https://github.com/harishmaddali/cododoro.git
cd cododoro
npm install
```

Run the web frontend in dev mode:

```bash
npm run dev
```

Run the full desktop app in dev mode (Vite + Tauri shell):

```bash
npm run tauri:dev
```

Build a production bundle:

```bash
npm run build         # web assets only
npm run tauri:build   # native desktop installer for the current platform
```

Platform-specific bundles are available via `npm run tauri:build:linux`, `tauri:build:macos`, `tauri:build:macos-arm64`, `tauri:build:macos-universal`, and `tauri:build:windows`.

See [BUILD_AND_PUBLISH.md](BUILD_AND_PUBLISH.md) for the release workflow, including updater signing.

## Scripts

| Script | Purpose |
| --- | --- |
| `dev` | Start the Vite dev server. |
| `build` | Type-check and produce the web build. |
| `preview` | Preview the production web build. |
| `typecheck` | Run `tsc --noEmit`. |
| `tauri` | Pass-through to the Tauri CLI. |
| `tauri:dev` | Run the desktop app in development. |
| `tauri:build` | Build a desktop bundle for the current host. |
| `tauri:build:linux` / `:macos` / `:macos-arm64` / `:macos-universal` / `:windows` | Cross-target desktop builds. |
| `version:next` | Compute the next release version. |
| `version:set` | Write a specific version into the manifests. |
| `release:local` | Run the local release script in `scripts/`. |

## Project structure

```
.
├── index.html              # Vite entry
├── src/                    # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/         # Welcome, Onboarding, AuthGate, shared chrome
│   ├── screens/            # Home, Repos, History, Goals, Nudges, Profile, RepoDetail
│   └── lib/                # API client, types, updater
├── src-tauri/              # Rust/Tauri shell, capabilities, icons, tauri.conf.json
├── scripts/                # Release and versioning helpers
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## License

[MIT](LICENSE).
