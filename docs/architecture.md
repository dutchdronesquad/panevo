# Architecture

Panevo is an Electron desktop application using React, Vite, and TypeScript. The architecture separates operator UI, IPC, configuration, VISCA command construction, and network transport.

## Runtime Layers

```text
Renderer process
  React UI
  Operator controls
  Typed preload API calls

Preload script
  Safe contextBridge API
  No raw Node.js exposure
  Stable renderer-facing contract

Main process
  Electron lifecycle
  IPC handlers
  Config service
  VISCA client and command queue
  Node.js networking APIs
```

## Source Layout

```text
src/
  main/
    index.ts
    ipc/
      camera-ipc.ts
    services/
      visca/
        visca-client.ts
        visca-commands.ts
        visca-types.ts
        visca-queue.ts
      config/
        config-service.ts

  preload/
    index.ts

  renderer/
    main.tsx
    App.tsx
    layouts/
    components/
    types/
```

## Boundary Rules

- Renderer code must not construct raw VISCA packets.
- Renderer code must not access Node.js networking APIs.
- Main process services must return structured results, not throw raw implementation details across IPC.
- VISCA packet construction belongs only in `visca-commands.ts`.
- Transport, queueing, and high-level camera methods belong in `ViscaClient`.
- Config persistence belongs only in `ConfigService`.

## Renderer UI Architecture

The renderer should separate generic UI primitives from Panevo-specific operator components.

```text
src/renderer/components/
  ui/          Shared primitives such as Button, Dialog, Select, Switch, Slider, Tooltip
  camera/      Camera settings, connection status, camera profile controls
  controls/    PTZ movement, zoom, speed, and future operator controls
  presets/     Preset recall/store components
```

Panevo may adopt `shadcn/ui` later for the `ui/` layer, preferably with Base UI or Radix primitives underneath. Those components should be source-owned and restyled with Panevo design tokens. Product-specific components should not be forced into generic shadcn patterns when custom operator interaction is clearer.

## IPC Design

The preload API exposes high-level camera operations through `window.panevo`. This keeps the renderer focused on user intent:

- Save camera config
- Test connection
- Start movement
- Stop movement
- Start/stop zoom
- Recall/store preset

Raw packets, sockets, file paths, and Electron internals are not exposed.

## Config Storage

Configuration is stored as local JSON in Electron's `userData` directory. The MVP stores one active camera profile, but the shape should allow future expansion to multiple cameras and operator workspaces.

## Error Handling

Main process services should log detailed errors locally and return safe structured results to the renderer:

```ts
type PanevoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

## Future Expansion

The service layout should support future modules without restructuring the app:

- `services/obs`
- `services/rotorhazard`
- `services/streamdeck`
- `services/automation`
- `services/cameras`
- `services/workspaces`
