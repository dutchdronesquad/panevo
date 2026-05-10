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

## Data Flow

```text
Operator input
  -> React component
  -> window.panevo high-level API
  -> preload IPC bridge
  -> main-process IPC handler
  -> config/service validation
  -> ViscaClient high-level method
  -> ViscaQueue
  -> VISCA command builder
  -> UDP transport or mock logger
  -> structured result back to renderer
```

This flow is intentionally longer than a direct socket call from the UI. The separation protects the app from protocol leakage and gives future integrations a stable place to plug in.

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
- Preload code must stay thin and avoid business logic.
- UI components should call high-level actions, not protocol-specific functions.
- Future integrations should call shared action services rather than duplicating protocol logic.

## Service Responsibilities

### ConfigService

Owns local JSON persistence and normalization.

Responsibilities:

- Return defaults when no config exists.
- Normalize port, protocol, IP address, and mock mode.
- Reject unsafe or incomplete hardware config.
- Remain independent from React and VISCA packet construction.

Future responsibilities:

- Camera profiles.
- Preset entries and labels.
- Import/export.
- Operator workspaces.

### ViscaClient

Owns camera connection state, transport choice, queueing entrypoints, and high-level camera actions.

Responsibilities:

- Connect or ensure connection based on config.
- Dispatch mock commands without hardware.
- Send UDP VISCA packets during MVP.
- Provide high-level methods such as `panLeft`, `zoomIn`, and `recallPreset`.
- Hide packet bytes from IPC and renderer code.

Future responsibilities:

- TCP transport.
- ACK/completion handling.
- Retry and timeout policies.
- Camera profile compatibility behavior.
- Optional third-party VISCA package adapter.

### ViscaQueue

Owns sequential command execution.

Responsibilities:

- Prevent uncontrolled overlapping sends.
- Provide a place for future command prioritization.
- Allow stop commands to flush pending movement commands.

Future responsibilities:

- Priority lanes for emergency stop.
- Rate limiting.
- Busy-state handling.
- Command coalescing.

### Command Builders

Own raw VISCA packet bytes.

Responsibilities:

- Build Buffer objects for commands.
- Clamp byte-level ranges.
- Keep vendor-sensitive values localized.

Future responsibilities:

- Camera profile mappings.
- Vendor-specific command variants.
- Preset numbering compatibility.

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

IPC channel naming should remain stable and explicit. Avoid generic channels like `camera:command` until there is a real command registry with validation. Explicit channels are easier to audit during the MVP.

## Config Storage

Configuration is stored as local JSON in Electron's `userData` directory. The MVP stores one active camera profile, but the shape should allow future expansion to multiple cameras and operator workspaces.

Config data should be treated as user-editable state, not as trusted input. Main-process services must normalize and validate values before sending hardware commands.

## Error Handling

Main process services should log detailed errors locally and return safe structured results to the renderer:

```ts
type PanevoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

Renderer behavior:

- Show concise operator-facing errors.
- Keep controls recoverable after failures.
- Avoid exposing stack traces in UI.
- Do not assume failed commands mean the camera stopped moving.

Main-process behavior:

- Log detailed errors for debugging.
- Return stable error codes.
- Avoid throwing uncaught exceptions across IPC.
- Prefer explicit failure results for expected operational problems.

## Safety Architecture

PTZ movement is safety-sensitive because commands move physical hardware.

Safety rules:

- Stop must be easy to trigger.
- Stop should be prioritized over non-stop movement commands.
- UI should send stop on release, cancel, leave, blur, and visibility loss.
- Services should validate config before sending hardware commands.
- Invalid speeds and preset values should be clamped or rejected before packet construction.
- Automation and integrations must preserve manual override.

These rules apply even before automation or multi-camera support exists.

## Future Expansion

The service layout should support future modules without restructuring the app:

- `services/obs`
- `services/onvif`
- `services/rotorhazard`
- `services/streamdeck`
- `services/automation`
- `services/cameras`
- `services/discovery`
- `services/workspaces`

Camera discovery should live in a dedicated service. It may combine VISCA probing, subnet scanning, ONVIF discovery, or vendor-specific discovery later, but it should expose normalized discovered-camera records to IPC and the renderer.

ONVIF support should be isolated from VISCA support. ONVIF may provide discovery, metadata, preset lists, and possibly PTZ control for compatible cameras, but renderer code should still work through Panevo-level camera and preset actions.
