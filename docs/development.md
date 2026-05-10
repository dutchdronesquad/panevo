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
npm run typecheck
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

During the Phase 2B to Phase 2C transition, development should prioritize:

1. Hardware regression for multi-camera profiles, health checks, and focus controls.
2. Operator safety after camera switching.
3. Clear configuration and error states.
4. Documentation that reflects tested behavior.
5. Discovery and ONVIF investigation only after the current implementation is snapshotted.

Avoid implementing production integrations or preview features until Phase 2C discovery and camera capability work has a stable direction.

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

The current config model stores camera profiles, one active camera id, per-camera preset entries, and camera health-check mode. Keep this model local-first and explicit. Future versions can expand it into operator workspaces, integration credentials, or discovered camera metadata, but those additions should remain behind clear schema changes.

Do not store secrets in the config file unless a future integration requires them and the project has a secure storage strategy.

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
- Update `mvp-checklist.md` if a checklist item is completed.
- Add decision notes to `decisions.md` when a choice affects future architecture.
- Add hardware notes to `tenveo-hardware.md` after real-device tests.
