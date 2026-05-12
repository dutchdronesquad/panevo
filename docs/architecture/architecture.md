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
  Desktop app shell
  IPC handlers
  Config service
  Camera control service
  VISCA client and command queue
  ONVIF probing and PTZ services
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
  -> CameraControlService high-level method
  -> selected control adapter for the active camera
  -> VISCA or ONVIF adapter
  -> future vendor adapter
  -> structured result back to renderer
```

This flow is intentionally longer than a direct socket call from the UI. The separation protects the app from protocol leakage and gives future integrations a stable place to plug in.

## Source Layout

```text
src/
  main.ts

  main/
    app/
      asset-paths.ts
      lifecycle.ts
      main-window.ts
      platform.ts
      tray.ts
    ipc/
      camera-ipc.ts
      onvif-ipc.ts
    services/
      camera-control/
        camera-control-service.ts
        command-queue.ts
      visca/
        visca-client.ts
        visca-commands.ts
        visca-types.ts
        visca-queue.ts
      onvif/
        onvif-service.ts
        onvif-ptz-client.ts
      config/
        config-service.ts

  preload.ts

  renderer/
    main.tsx
    App.tsx
    layouts/
    components/
    types/
```

## Boundary Rules

- `src/main.ts` should stay a bootstrap file. App identity, platform behavior, window creation, and tray behavior belong in `src/main/app`.
- Renderer code must not construct raw VISCA packets.
- Renderer code must not choose protocol-specific control clients directly.
- Renderer code must not access Node.js networking APIs.
- Main process services must return structured results, not throw raw implementation details across IPC.
- VISCA packet construction belongs only in `visca-commands.ts`.
- Live camera actions route through `CameraControlService`.
- VISCA transport, queueing, and protocol-specific camera methods belong in `ViscaClient`.
- Config persistence belongs only in `ConfigService`.
- Preload code must stay thin and avoid business logic.
- UI components should call high-level actions, not protocol-specific functions.
- Future integrations should call shared action services rather than duplicating protocol logic.

## Service Responsibilities

### App Shell

Owns Electron desktop lifecycle and platform-specific runtime behavior.

Responsibilities:

- Configure the Panevo application name and platform identity.
- Create the main `BrowserWindow` with the correct runtime icon.
- Keep close-to-tray behavior out of renderer code.
- Create the system tray on platforms where Panevo should keep running in the background.
- Centralize platform differences in `platform.ts` instead of scattering `process.platform` checks through the main process.

Current platform behavior:

- macOS uses normal Dock behavior and does not create a separate tray/menu-bar icon.
- Windows and Linux keep Panevo running in the background when the main window is closed.
- Windows sets an explicit App User Model ID so the installed app groups under the Panevo identity.

Future responsibilities:

- Add platform-specific menu behavior if Panevo needs native menus.
- Add quit confirmation only if background workflows or automation make it necessary.
- Add auto-start support as an explicit user preference, not as default behavior.

### ConfigService

Owns local JSON persistence and normalization.

Responsibilities:

- Return an empty camera bank when no config exists.
- Normalize port, protocol, IP address, and mock mode.
- Preserve incomplete setup state while keeping values normalized.
- Remain independent from React and VISCA packet construction.

Future responsibilities:

- Camera profiles.
- Preset entries and labels.
- Import/export.
- Operator workspaces.

### CameraControlService

Owns the protocol-agnostic live control route for camera actions.

Responsibilities:

- Receive Panevo-level camera actions from IPC.
- Inspect the active camera profile's `controlProtocol`.
- Route the action to the selected adapter.
- Keep renderer and preload APIs stable when new control protocols are added.
- Return explicit unsupported errors when a configured control protocol or action has no active adapter.

Current implementation:

- `visca` is the default live control adapter for new camera profiles and handles PTZ, zoom, focus, stop, and preset commands for the tested Tenveo workflow.
- `onvif` remains available as an optional live control adapter for cameras where ONVIF movement feels reliable enough.
- `onvif` is the default sync adapter for discovery, device identity, capability probing, and numeric preset synchronization.
- ONVIF focus routes through the Imaging service while ONVIF movement routes through the PTZ service.
- ONVIF preset commands currently map Panevo preset numbers to matching ONVIF preset token strings, which must be validated per camera.
- Preset add/store operations are camera-native first. Local Panevo preset state is updated only after the camera operation succeeds.
- ONVIF preset delete is camera-native through `RemovePreset`.
- VISCA preset delete is local mapping removal only because CAM_Memory Reset failed hardware validation on the tested camera.

Future responsibilities:

- Add vendor-specific adapters without changing renderer controls.
- Normalize adapter-specific stop, preset, focus, and zoom semantics into Panevo-level behavior.
- Add a vendor-specific preset delete provider only after a camera model exposes a verified delete path.

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

### CommandQueue

Owns sequential command execution for protocol adapters.

Responsibilities:

- Prevent uncontrolled overlapping sends.
- Provide a place for future command prioritization.
- Allow stop commands to flush pending movement commands.
- Keep VISCA and ONVIF command serialization behavior consistent.

Future responsibilities:

- Priority lanes for emergency stop.
- Rate limiting.
- Busy-state handling.
- Command coalescing.

### OnvifService

Owns ONVIF probing and hides package-specific SOAP response shapes from IPC and renderer code.

Responsibilities:

- Connect to a configured ONVIF endpoint from the main process.
- Discover local-network ONVIF devices through WS-Discovery.
- Probe device information such as manufacturer, model, firmware, serial number, and hardware ID when available.
- Probe broad ONVIF capabilities such as device, media, PTZ, imaging, and events.
- Probe PTZ nodes and profile summaries without exposing raw ONVIF objects to the renderer.
- Probe preset tokens and expose normalized preset summaries.
- Return structured `PanevoResult` responses with stable error codes.

Current constraints:

- ONVIF probing is separate from live control selection.
- ONVIF is the default PTZ control path where available; VISCA remains the fallback path.
- Manual camera configuration remains available.
- Authentication, endpoint paths, and vendor behavior may vary by camera.

Future responsibilities:

- Secure credential storage through OS keychain or encrypted storage.
- Explicit local mapping for cameras that expose opaque ONVIF preset tokens.

### OnvifPtzClient

Owns ONVIF live PTZ commands while hiding package-specific control calls from IPC and renderer code.

Responsibilities:

- Connect to the configured ONVIF endpoint for a camera profile.
- Send ONVIF ContinuousMove commands for pan, tilt, diagonal movement, and zoom.
- Send ONVIF Stop commands for movement and zoom.
- Send ONVIF Imaging commands for focus mode, focus in/out, and focus stop.
- Send ONVIF preset recall/store commands.
- Send ONVIF preset remove commands.
- Queue commands sequentially and allow stop commands to flush pending work.
- Return structured `PanevoResult` responses with stable error codes.

Current constraints:

- ONVIF PTZ behavior should be validated per camera model.
- ONVIF focus depends on the camera exposing ONVIF Imaging focus support.
- ONVIF preset tokens may not match numeric VISCA presets.
- The `onvif` package remains an implementation detail and can be replaced later by Panevo-owned SOAP calls.

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
- Probe ONVIF metadata and capabilities
- Start movement
- Stop movement
- Start/stop zoom
- Recall/store preset

Raw packets, sockets, file paths, and Electron internals are not exposed.

IPC channel naming should remain stable and explicit. Avoid generic channels like `camera:command` until there is a real command registry with validation. Explicit channels are easier to audit during the MVP.

## Config Storage

Configuration is stored as local JSON in Electron's `userData` directory. The active Phase 2 shape stores multiple camera profiles plus an `activeCameraId`. Existing single-camera configs are migrated into the first camera profile.

Config data should be treated as user-editable state, not as trusted input. Saving config should allow incomplete setup state, including an empty camera bank, because operators may remove profiles or edit ports, labels, or future credentials before a camera is reachable. Main-process hardware services must normalize and validate values again before sending commands.

Camera profiles keep protocol ports separate:

- `port`: VISCA over IP control port. The tested Tenveo value is `52381`.
- `onvifPort`: ONVIF HTTP endpoint port. The tested Tenveo value is `8080`.
- `onvifUsername`: optional ONVIF username stored with the profile.
- `onvifPassword`: optional ONVIF password stored with the profile for Phase 2C validation.
- `controlProtocol`: selected live control adapter. Current default is `visca`; `onvif` remains available as an alternate adapter.
- `syncProtocol`: selected camera metadata and preset-sync adapter. Current default is `onvif`; `none` keeps presets fully local.

These should not be collapsed into one field because VISCA and ONVIF are separate protocols and may live on different ports.

ONVIF passwords are currently stored in local JSON so ONVIF live control works after restart. This is a Phase 2C validation tradeoff, not a final production security model. Persistent ONVIF credentials should move to OS keychain storage, encrypted local storage, or another explicit credential strategy before release-quality ONVIF support.

ONVIF probe results are currently renderer state, not persisted config. This prevents a one-time discovery result from becoming stale profile truth. If Panevo later stores discovered identity or capability metadata, the operator should explicitly accept that enrichment.

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

## Camera Health

Panevo should not treat UDP socket creation as proof that a camera is online. Health checks are an internal camera-service concern, not an operator-facing setup choice.

- VISCA health should prefer a non-moving inquiry and report `Verified` only after a camera response.
- VISCA background health should be passive and must not send periodic inquiries that can block or interfere with live control commands.
- Explicit VISCA connection tests may send a non-moving inquiry, should treat intermittent inquiry timeouts as degraded `Transport` state, and should require consecutive misses before reporting a failure.
- ONVIF health should verify the configured ONVIF control endpoint when ONVIF is the selected control route.
- Compatibility fallbacks may exist internally for specific camera profiles or migrations, but they should not be presented as a required setup decision in the UI.

The renderer should display these states differently. `Verified` is suitable for confident live operation; `Transport` means operator verification is still required.

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

ONVIF support should be isolated from VISCA support. ONVIF may provide discovery, metadata, preset lists, and PTZ control for compatible cameras, but renderer code should still work through Panevo-level camera and preset actions.
