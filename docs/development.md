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

Until the PTZ MVP is complete, development should prioritize:

1. Reliable single-camera PTZ control.
2. Operator safety.
3. Clear configuration and error states.
4. Hardware-validated behavior.
5. Documentation that reflects reality.

Avoid implementing deferred platform features during Phase 1 unless they directly unblock the MVP.

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

The MVP stores local configuration in Electron's `userData` directory as JSON.

The config should remain simple during Phase 1. It currently represents one active camera target. Future versions can expand this into camera profiles and operator workspaces.

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

