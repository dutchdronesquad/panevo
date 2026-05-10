# Panevo

Panevo is a modern live production and PTZ control tool designed for race broadcasts, livestream operators, and camera automation workflows.

The first milestone is a desktop PTZ control MVP for VISCA over IP, targeting a Tenveo PTZ camera. The application is built as a future live production platform, not just a single-purpose camera controller.

## Status

MVP foundation in progress:

- Electron Forge desktop app
- React + Vite + TypeScript renderer
- IPC boundary between renderer and main process
- VISCA over IP service architecture
- Local JSON config storage
- Mock mode for development without hardware
- PTZ movement, zoom, and preset controls

Current status: Phase 1 PTZ MVP complete.

Progress is tracked in:

- `docs/roadmap.md`
- `docs/mvp-checklist.md`
- `docs/tenveo-hardware.md`

## Screenshots

Screenshots should be stored in `docs/screenshots/` after the first visual QA pass.

Planned MVP screenshots:

- Main operator surface.
- Camera settings in mock mode.
- Preset label editing.

Current repository status: screenshot location is prepared, but image capture still needs a local app run outside the Codex sandbox.

## Tested Hardware

Initial MVP hardware validation has been done against a Tenveo PTZ camera using VISCA over IP.

Observed Tenveo behavior:

- Protocol: UDP VISCA over IP.
- Default port: `52381`.
- Pan speed range: `1-24`.
- Tilt speed range: `1-24`.
- Zoom speed range: `1-8`.
- Pan, tilt, diagonal movement, stop, zoom, preset recall, and preset store have been validated.
- Panevo manages a dynamic local preset list that maps labels to camera preset numbers.
- New configurations start with an empty preset list.
- Preset entries can be added, renamed, removed from Panevo, recalled, and overwritten.
- Preset labels are stored locally in Panevo config and are not camera-native preset names.

Preview is still handled outside Panevo during the MVP.

## Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Run TypeScript checks:

```bash
npm run typecheck
```

Package the app:

```bash
npm run package
```

## Architecture

```text
src/
  main/
    ipc/
    services/
      config/
      visca/
  renderer/
    components/
    layouts/
    types/
  shared/
```

The renderer never constructs VISCA packets or accesses Node.js networking APIs. The preload script exposes a typed `window.panevo` API, and the main process owns config persistence, IPC handlers, VISCA command building, queueing, and UDP transport.

## Documentation

Start with `docs/index.md`.

Key documents:

- `docs/overview.md`: product vision, scope, principles, MVP discipline, and glossary.
- `docs/architecture.md`: process boundaries, data flow, services, IPC, safety architecture, and future extension points.
- `docs/roadmap.md`: phased roadmap and MVP completion criteria.
- `docs/mvp-checklist.md`: operational checklist for tracking implementation progress.
- `docs/visca.md`: VISCA client architecture, command strategy, vendor variance, package strategy, and discovery notes.
- `docs/ui-ux.md`: operator-focused design direction and UI framework strategy.
- `docs/integrations.md`: deferred OBS, RotorHazard, operator-surface, preview, and automation integration plans.
- `docs/development.md`: local development workflow and coding conventions.
- `docs/testing.md`: static, mock, hardware, safety, and packaging validation strategy.
- `docs/tenveo-hardware.md`: Tenveo hardware test notes and open questions.
- `docs/decisions.md`: architectural decisions and deferred choices.

## Roadmap Ideas

- Multi-camera support
- Dynamic camera preset entries
- OBS integration
- RotorHazard integration
- Stream Deck and Companion support
- RTSP or NDI preview
- Automation workflows
- Race-aware production controls

See the `docs/` folder before making architectural changes.
