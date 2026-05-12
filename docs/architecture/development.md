# Development Guide

Panevo is an Electron Forge desktop application using React, Vite, TypeScript, IPC, Node.js networking APIs, and local JSON config storage.

## Local Setup

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
npm run type
```

Run linting:

```bash
npm run lint
```

Package the app:

```bash
npm run package
```

Packaging may require network access because Electron Forge can download Electron packaging artifacts. A packaging failure caused by DNS or GitHub access is not automatically a code failure.

## Development Priorities

During Phase 2E, development should prioritize:

1. VISCA compatibility decisions.
2. Camera-profile compatibility flags only when they are backed by tested behavior.
3. Keeping VISCA live control stable while ONVIF remains the sync/discovery route.
4. Preview architecture planning without coupling preview to PTZ control.
5. Documentation that reflects tested behavior.

Avoid implementing production integrations until Phase 2E decisions are stable. Preview work may start as a focused Phase 3 foundation only after the first preview transport is selected.

## Process Boundaries

Renderer:

- Owns React UI and operator interactions.
- Calls `window.panevo`.
- Does not access Node.js networking APIs.
- Does not construct VISCA packets.
- Does not read or write local config files directly.

Preload:

- Exposes a safe, typed API through `contextBridge`.
- Maps renderer calls to IPC channels.
- Does not contain business logic.

Main process:

- Owns Electron lifecycle.
- Registers IPC handlers.
- Owns config persistence.
- Owns VISCA transport, queueing, and command construction.
- Logs detailed operational failures.

## Coding Conventions

- Prefer small modules with clear boundaries.
- Keep renderer-facing APIs high-level and stable.
- Return structured results across IPC.
- Keep hardware-specific behavior behind services or future camera profiles.
- Avoid introducing abstractions unless they remove real complexity or support an established extension point.
- Add comments only where they clarify protocol behavior, hardware assumptions, or safety-sensitive code.

## Config Storage

Panevo stores local configuration in Electron's `userData` directory as JSON.

The current config model stores camera profiles, one active camera id, per-camera preset entries, internal camera health-check state, ONVIF endpoint settings, and ONVIF credentials. Keep this model local-first and explicit. Future versions can expand it into operator workspaces, integration credentials, or discovered camera metadata, but those additions should remain behind clear schema changes.

ONVIF passwords are currently stored in local JSON only to keep Phase 2C probing, preset sync, and ONVIF control usable after restart. This is not the final production model. Move camera credentials to OS keychain storage, encrypted local storage, or a documented opt-in plain-config mode before treating ONVIF support as release-quality.

## Dependency Strategy

Dependencies should be added conservatively.

Good candidates:

- UI primitives that reduce accessibility or interaction complexity.
- Mature protocol clients with clear maintenance and packaging behavior.
- Libraries that avoid native dependencies unless the value is clear.

Avoid:

- Large application frameworks that impose a generic admin UI style.
- Native video/preview packages during the PTZ MVP.
- Protocol dependencies that leak into renderer code.

## Documentation Workflow

When changing behavior:

- Update the relevant doc file.
- Update `docs/product/mvp-checklist.md` if a checklist item is completed.
- Add decision notes to `docs/product/decisions.md` when a choice affects future architecture.
- Add hardware notes to `docs/hardware/tenveo-hardware.md` after real-device tests.
