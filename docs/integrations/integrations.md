# Future Integrations

Panevo's MVP only implements PTZ control. Future integrations should be added as separate services with clear IPC contracts and renderer-facing abstractions.

Use `docs/integrations/integration-use-cases.md` as the product guardrail before implementing any integration. This file describes integration categories and architecture direction; the use-case document defines the minimum useful operator workflows.

Automation is not an integration. It is a core Panevo capability that consumes normalized Panevo events and dispatches normalized Panevo actions. Integrations such as OBS, RotorHazard, input devices, Companion, Stream Deck, or Flexbar can provide inputs or action targets for automation, but the automation engine itself should live in Panevo core services and have its own operator surface.

## Integration Principles

- Integrations should be managed from a dedicated Integrations page before individual integrations add bespoke settings screens.
- Integrations should map to Panevo actions, not raw VISCA packets.
- Integrations should not bypass safety controls.
- Integrations should remain optional.
- Integrations should be isolated in main-process services where they need network, filesystem, or native access.
- Renderer UI should show integration status without making integrations required for PTZ operation.
- MVP camera control must remain usable when all integrations are disabled.

Before starting any integration, answer:

- What operator workflow does this improve?
- Does the integration require credentials or local network access?
- Does it introduce packaging or native dependency risk?
- What happens if the integration disconnects during a live show?
- Can the operator manually override it?

## Integration Management UX

Panevo should get an `Integrations` sidebar page before individual integrations become active features. This page is the operator-facing home for adding, configuring, testing, enabling, disabling, and removing integrations.

Current Phase 4A implementation:

- The renderer has an `Integrations` sidebar view.
- The view is backed by a static integration registry in `src/renderer/types/integration.ts`.
- Initial registry entries exist for OBS, RotorHazard, Companion / Stream Deck, Input Device, and Flexbar.
- Lifecycle labels and status-chip mapping are centralized in the registry module.
- The main Integrations page starts empty and only shows integrations the operator has added.
- Operators choose integrations from an Add Integration dialog backed by the registry.
- Choosing an integration opens a setup wizard/detail panel instead of immediately adding it.
- Registry entries define the first local setup fields for each integration type.
- Each configured integration row shows name, description, saved setup summary, lifecycle status, and primary action.
- A shared setup wizard pattern exists as the first UI surface and persists local setup details after review.
- Configured integrations are persisted in a separate `panevo-integrations.json` file through `IntegrationConfigService`.
- Camera profiles remain in `panevo-config.json`; integration state does not live inside camera configuration.
- Enable, disable, configure, and remove actions persist integration lifecycle state through integration IPC.
- Remove is a visible row action and requires confirmation before deleting the local integration entry.
- Test actions are available only for adapters that have been implemented.
- Saving configuration adds an integration as configured; it does not auto-enable.
- Integration read/write errors are shown on the Integrations page and do not block PTZ control.
- Phase 4B adds a main-process `ActionDispatcher` and shared action/feedback types for future integration adapters.
- Camera and preset actions dispatched by integrations route through `ConfigService` and `CameraControlService`.
- Phase 4C adds the first OBS adapter. `obs.scene.switch` now routes through the enabled OBS websocket connection; automation actions remain unsupported until their core implementation phase.
- OBS is the only integration that currently connects to external software.
- No integration currently affects PTZ control.

Minimum lifecycle states:

- `Not configured`
- `Configured`
- `Enabled`
- `Connected`
- `Error`
- `Disabled`

Minimum actions per integration:

- Configure
- Enable or disable
- Test connection
- Reset or remove configuration
- View last error

Initial integration registry entries:

- OBS
- RotorHazard
- Companion / Stream Deck bridge
- Input devices
- Flexbar

Automation should not be an integration registry entry. It should use a dedicated core service, persisted automation settings, and a dedicated operator surface when Phase 4H starts.

Integration configuration should be stored separately from camera profiles. Camera configuration should stay focused on cameras, control protocols, sync protocols, credentials, and presets.

Suggested future structure:

```text
src/
  main/
    services/
      integrations/
        integration-config-service.ts
        integration-registry.ts
        integration-types.ts
  renderer/
    views/
      IntegrationsView.tsx
    components/
      integrations/
        IntegrationCard.tsx
        IntegrationConfigDialog.tsx
```

Suggested local config file:

```text
panevo-integrations.json
```

No integration should become active automatically after install or discovery. The operator should explicitly enable it.

## OBS

Potential features:

- Scene switching
- Source visibility
- Recording and streaming state
- Scene-aware camera presets
- Production macros

OBS integration uses the OBS websocket v5 JSON protocol and remains isolated in a dedicated main-process service. Panevo owns a narrow client for the MVP instead of taking a broad package dependency, so the boundary can still be replaced by `obs-websocket-js` later if the adapter grows.

Current architecture:

```text
services/obs/
  obs-errors.ts
  obs-protocol.ts
  obs-session.ts
  obs-service.ts

ipc/
  obs-ipc.ts
```

OBS should initially be used for state awareness and simple actions, not as a required preview path for the PTZ MVP.

Phase 4C supports:

- Local OBS websocket settings, defaulting to `127.0.0.1:4455`.
- Optional OBS websocket password authentication.
- Connection testing from the integrations table.
- Reading the OBS scene list and current program scene.
- Switching the current program scene through the normalized `obs.scene.switch` Panevo action when OBS is enabled.
- Showing a Control-view OBS Scenes section where operators can see the current program scene and click a scene to switch manually when OBS is enabled.

Failure modes should stay local to the OBS adapter. A missing password returns `OBS_AUTH_REQUIRED`; connection timeouts return `OBS_CONNECTION_TIMEOUT`; failed OBS requests return `OBS_REQUEST_FAILED`. These failures must not disconnect the active camera, stop the camera command queue, or change PTZ control state.

## RotorHazard

Potential features:

- Race state monitoring
- Pilot and heat metadata
- Lap and gate event triggers
- Race-aware camera automation
- Overlay coordination

RotorHazard integration should avoid hard-coding Dutch Drone Squad assumptions into core Panevo concepts.

RotorHazard concepts should be translated into generic race/event concepts before they affect core Panevo architecture.

Phase 4F direction:

- Use RotorHazard's existing Socket.IO server as the first transport.
- Keep the Panevo desktop app connected through an isolated main-process `services/rotorhazard` boundary.
- Treat Socket.IO as a protocol dependency; do not use a raw browser-style WebSocket client unless RotorHazard exposes a separate raw websocket endpoint.
- Define a Panevo race-event contract before automation work starts, and keep it independent from RotorHazard event names and payload shapes.
- Normalize RotorHazard lifecycle events into Panevo race events such as ready, staging, race started, race finished, race done, lap recorded, active heat changed, and race data stale.
- Read active race, heat, pilot, lane, and channel information from stable Socket.IO events and request/response calls where available, but keep missing fields optional.
- Consider an optional RotorHazard plugin only if the existing Socket.IO surface does not expose the events or normalized payloads Panevo needs. If added, the plugin should use RHAPI inside RotorHazard and publish Panevo-namespaced Socket.IO events from RotorHazard so Panevo remains the connecting client.
- Do not use HTTP polling as a fallback path for Phase 4F.
- Do not edit RotorHazard races, pilots, heats, rounds, formats, or timing data from Panevo in this phase.
- RotorHazard stale/disconnected state should pause future race-aware automation while leaving manual camera and OBS operation available.

Long-term transport model:

```text
RotorHazard built-in Socket.IO events
  -> RotorHazardTransportAdapter
  -> PanevoRaceEvent / PanevoRaceState
  -> renderer status + Phase 4H automation

Optional future RotorHazard plugin
  -> Panevo-namespaced Socket.IO events on RotorHazard
  -> same RotorHazardTransportAdapter contract
  -> PanevoRaceEvent / PanevoRaceState
```

The key boundary is the Panevo race-event contract, not the first transport. Automation should depend only on normalized events and state, so switching from built-in RotorHazard Socket.IO events to an optional RotorHazard plugin later does not rewrite automation rules.

Current Phase 4F implementation:

- Adds `socket.io-client` as the RotorHazard transport dependency.
- Adds an isolated main-process `RotorHazardService` under `services/rotorhazard`.
- Exposes typed preload IPC actions for RotorHazard Socket.IO connection checks and current race-state reads.
- Makes the RotorHazard integration configurable from the Integrations view with host and port fields.
- Defaults the RotorHazard port to `5000`, matching the standard RotorHazard server port.
- Does not include an API-key setting because RotorHazard does not expose a supported API-key auth path for this integration.
- Tests the Socket.IO connection using websocket transport only; Panevo does not add HTTP polling as a fallback.
- Defines the first `PanevoRaceState` and `PanevoRaceEvent` shared types for Phase 4H automation.
- Reads current race status, frequency data, and active heat data by sending RotorHazard `load_data` for `race_status`, `frequency_data`, and `current_heat`, then normalizes the response into `PanevoRaceState`.
- Maps channel metadata from RotorHazard node frequency data when that payload is available.
- Shows the current RotorHazard race-state snapshot from the Integrations test action.
- Maintains a runtime RotorHazard race-state monitor while the configured RotorHazard integration is enabled.
- Shows monitor status in the Integrations view as connected, connecting, stale, disconnected, or error.
- Marks the monitor as automation-paused when RotorHazard is disconnected, stale, or still waiting for initial race state.
- Retries the RotorHazard Socket.IO monitor after disconnects or connection errors while the integration remains enabled, starting after 5 seconds and backing off to 10, 20, and 30 seconds.
- Normalizes runtime race lifecycle changes into recent `PanevoRaceEvent` records on the monitor, including ready, staging, race started, race done, active heat changed, and data stale.
- Forwards normalized RotorHazard monitor events to core `AutomationService`; automation remains disabled until the operator enables it from the Automation view.
- Does not yet persist `PanevoRaceEvent` records or render live race state in the Control view.

RotorHazard setup:

1. Start RotorHazard and confirm the web UI is reachable from the Panevo machine.
2. Add the RotorHazard integration in Panevo.
3. Enter the RotorHazard host as a hostname or IP address. For most local race setups this is the RotorHazard machine's LAN IP address.
4. Keep the port at `5000` unless RotorHazard is running on a custom port.
5. Save and enable the integration. Panevo starts the runtime monitor while the integration is enabled.
6. Use the Integrations test action to read a race-state snapshot.

Failure modes:

- Missing or invalid host/port settings keep the monitor idle and show a configuration error.
- Connection errors set the monitor to `error`, keep `automationPaused` true, schedule a Socket.IO retry, and leave manual PTZ, presets, stop, OBS, and camera configuration available.
- If Socket.IO connects but RotorHazard does not return initial race state before the timeout, Panevo marks the monitor `stale` and keeps future race-aware automation paused.
- If RotorHazard disconnects after a live state was received, Panevo marks the last race state stale, emits a `race.data-stale` event, keeps future race-aware automation paused, and retries Socket.IO while the integration remains enabled.
- Panevo does not retry through HTTP polling and does not use an API key for RotorHazard.

Validation notes:

- Live RotorHazard testing confirmed that changing the active heat updates the Panevo Integrations view without restarting Panevo.
- Live RotorHazard testing confirmed that stopping RotorHazard marks the monitor disconnected/stale and pauses future race-aware automation.
- Live RotorHazard testing confirmed that restarting RotorHazard restores the monitor to live state through the Socket.IO reconnect backoff without toggling the integration.

## Operator Surfaces

Panevo should support external operator surfaces over time. These integrations should map hardware or companion controls to Panevo actions rather than duplicating camera protocol logic.

Potential features:

- External button surfaces for camera moves and presets
- Companion module support
- Stream Deck plugin investigation
- Status feedback on hardware keys
- Flexbar integration investigation
- Input devices such as gamepads, joysticks, MIDI controllers, button boxes, or radio-style controllers
- Touch panel pages for camera banks, presets, zoom, and race-aware actions

Panevo should expose stable action concepts before committing to a plugin API.

## Control Devices

Input devices are a broad integration category for hardware that lets an operator move cameras or trigger production actions without relying on mouse input.

Potential device classes:

- HDZero radio connected over Bluetooth, if it exposes a standard input path.
- Gamepad or joystick.
- MIDI controller.
- Keyboard shortcuts as a built-in Settings feature, not an external integration.
- Custom HID button box.
- Future generic control panels.

HDZero radio is a useful test idea because it matches drone-racing workflows, but Panevo should not create a direct HDZero-specific camera-control path first. The preferred model is:

```text
Input device
  -> device adapter
  -> normalized Panevo action
  -> CameraControlService / automation / OBS
```

Minimum useful behavior:

- Map axes to pan, tilt, and speed-based zoom.
- Map buttons or switches to zoom and stop.
- Defer active-camera selection and preset recall mappings until feedback/confirmation UX is designed.
- Support a deadman/enable input before movement commands are sent.
- Stop movement when the device disconnects, the app loses focus, or input becomes stale.
- Keep per-device mapping profiles local and optional.

Safety constraints:

- Do not assume a flight radio is safe to share with camera operation during an active race.
- Do not bypass speed clamps, command queues, active-camera checks, or emergency stop handling.

Phase 4E starts with keyboard shortcuts as the first control device route:

- PTZ movement, zoom, and stop shortcuts work only while Panevo is focused on the Control view, where real keydown/keyup events are available.
- Preset shortcuts are registered globally in the main process and can work while Panevo is in the tray, another app is focused, or any Panevo screen is open.
- Shortcuts are configured from Settings and stored in local Panevo preferences.
- Shortcuts can be turned off completely from Settings.
- Global preset shortcut bindings must include Alt or Ctrl. Foreground Control-view bindings may use direct keys.
- Arrow keys send held PTZ movement actions through `ActionDispatcher`.
- Plus and minus send held zoom actions through `ActionDispatcher`.
- Alt + number keys 1 through 9 recall presets globally through `ActionDispatcher`.
- X sends a foreground stop-all action.
- Key release, app blur, or visibility loss stops held foreground movement or zoom.

Keyboard shortcuts are intentionally not modeled as an integration because they are part of Panevo's own operator UI. External devices such as HDZero radios, gamepads, joysticks, MIDI controllers, and HID button boxes should remain optional integrations or device adapters.

HDZero radio support should follow only after local hardware validation confirms that the radio appears as a standard Gamepad, HID, MIDI, serial, or Bluetooth input device.

- Phase 4E.2 provides setup-time discovery/status for devices exposed through the standard browser Gamepad API.
- The current input setup selects a device only; live axis values, button states, and mapping profiles live in the Control Devices view.
- The Control Devices view stores local mapping profiles for axes, buttons, deadzone, inversion, and speed limits.
- Live control requires an active deadman input before movement or zoom commands are dispatched.
- Live control dispatches pan, tilt, speed-based zoom, stop-all, and zoom buttons through `ActionDispatcher`.
- Absolute zoom position mapping is deferred because current validation showed choppy and unreliable behavior.
- Movement and zoom stop when the deadman is released, the device disconnects, the app loses focus, or the Control Devices view is left.
- The integration dialog should only select the input device. Mapping, calibration, deadman assignment, and action bindings belong in the dedicated Control Devices sidebar view after the integration is configured.
- Unknown devices should start unmapped.
- Device disconnect must result in stop where a movement command may be active.

This category should be implemented only after a shared Panevo action layer exists.

### Flexbar

Flexbar is a standalone touch bar style control surface for macOS and Windows. It may be useful as a compact operator panel for camera presets, scene-aware controls, zoom actions, and race production shortcuts.

Future investigation should cover:

- Whether Flexbar exposes a stable SDK, plugin API, local protocol, or shortcut/macro bridge.
- Whether Panevo should integrate directly, through Flexbar's software, or through generic keyboard/MIDI/OSC-style actions.
- How dynamic labels, colors, and state feedback can map to Panevo camera status.
- Whether Flexbar pages should mirror Stream Deck/Companion concepts or use a dedicated touch-strip layout.
- Packaging and permission requirements on macOS and Windows.

## Preview Systems

Potential features:

- External preview workflows
- Multi-camera confidence grid
- RTSP diagnostics and external-tool interoperability

Preview should be treated as a separate capability from camera control. It can introduce native dependencies, performance risks, and packaging complexity.

Possible preview routes:

- External preview only during the current phase.
- RTSP preview source discovery through ONVIF for diagnostics and interop only.
- OBS-based preview or confidence monitor integration.

Preview should not block camera control startup. If preview fails, PTZ control should still work.

Current direction:

- Panevo does not implement in-app video preview right now.
- The app keeps ONVIF RTSP stream discovery because it is useful diagnostics and future integration metadata.
- External tools such as OBS, NDI Studio Monitor, and camera-native tooling remain responsible for preview.
- There are no active preview fields on camera profiles.
- There is no NDI runtime, SDK binding, preview IPC, or renderer playback surface in the active codebase.

First transport decision:

- Chromium/Electron cannot play raw RTSP directly in a normal `<video>` element.
- NDI requires a deliberate SDK/backend and packaging strategy, so it should not be half-integrated.
- RTSP should not be silently converted through a gateway or helper process.
- Panevo should not silently fall back to FFmpeg or GStreamer for preview playback.
- ONVIF probe results are used to discover RTSP stream URIs for diagnostics only.

Preview acceptance rules:

- PTZ, stop, preset, and camera configuration must keep working when preview fails.
- Future preview work must define packaging, licensing, CPU/load impact, and crash behavior before implementation.

## ONVIF

ONVIF is an active Phase 2C camera capability. It should remain isolated from VISCA internals and exposed through Panevo-level camera actions. ONVIF is the default route for discovery, metadata, capability probing, and preset sync. VISCA is the default live control route for the tested Tenveo workflow because its movement behavior is more operator-friendly.

Potential features:

- Camera discovery.
- Camera metadata.
- Preset list discovery.
- Preset import/sync into Panevo's local preset entries.
- Optional ONVIF PTZ control path for compatible cameras.
- ONVIF focus support through the Imaging service where cameras expose it.

ONVIF support should be implemented as a main-process service and exposed through Panevo-level IPC actions. Renderer components should not depend directly on ONVIF tokens, SOAP details, or vendor-specific response shapes.

Current implementation:

- Uses the `onvif` npm package behind `OnvifService`.
- Uses `OnvifPtzClient` behind `CameraControlService` for live ONVIF control.
- Exposes `window.panevo.probeOnvifCamera(input)` through preload.
- Exposes `window.panevo.discoverOnvifCameras(input)` through preload.
- Supports local-network ONVIF WS-Discovery from the camera-management view.
- Connects to a configured ONVIF endpoint using the camera profile's `onvifPort`.
- New camera profiles default to ONVIF port `8080` because that is the observed port on the tested Tenveo camera.
- Supports ONVIF identity authentication with stored username and password fields in the local camera profile.
- Returns normalized device information, capability flags, media profile summaries, preset summaries, and PTZ node count.
- Keeps the latest ONVIF probe result as transient renderer state for table status and the probe dialog.
- Supports assisted camera setup from discovery/probe results while still validating the connection before saving.
- Supports operator-initiated import of numeric ONVIF preset tokens into Panevo's local preset list.
- Can use ONVIF for live PTZ movement when the camera profile's `controlProtocol` is set to `onvif`.

Control architecture:

- Live camera actions route through `CameraControlService`.
- Camera profiles include `controlProtocol` for live movement and `syncProtocol` for camera metadata/preset sync.
- `visca` is the default live control adapter for new camera profiles.
- `onvif` is the default sync adapter for new camera profiles.
- ONVIF remains available as an optional live control adapter.
- ONVIF metadata/probing can enrich setup while VISCA remains the selected live control route.

Important constraints:

- ONVIF support varies by camera and firmware.
- Authentication may be required.
- Preset tokens and names may not map cleanly to VISCA preset numbers.
- ONVIF preset sync runs during add/probe/startup when `syncProtocol` is `onvif`; it should not run in the middle of a live movement command.
- Preset removal uses ONVIF `RemovePreset` when `syncProtocol` is `onvif`, even if live control stays on VISCA.
- Panevo imports only numeric ONVIF preset tokens for now. Opaque ONVIF tokens need an explicit mapping model before automatic control can be trusted.
- A successful ONVIF probe does not automatically switch a camera from VISCA to ONVIF control.
- The active control protocol determines which health check and control adapter are used.
- ONVIF passwords are stored in local plain JSON during Phase 2C so probing/control survive restart. Production hardening should move them to OS keychain or encrypted storage.
- The current `onvif` npm package remains behind adapters so it can be replaced with Panevo-owned SOAP calls later.

## Automation Inputs

Automation is a core Panevo capability, not an external integration. This section exists here only to describe how integrations should interact with automation.

Potential automation inputs and targets from integrations:

- RotorHazard race-state and race-event triggers.
- OBS scene/state triggers and OBS scene-switch actions.
- Control device, Companion, Stream Deck, or Flexbar manual triggers.
- Panevo camera, preset, stop, and focus actions.

The automation engine itself belongs in Panevo core. It must include operator safety constraints, clear state visibility, and quick cancellation.

Automation should be built only after stable action concepts exist. Early automation should be simple trigger/action mapping, not a full workflow engine.

Manual override requirements:

- Operator can stop camera movement at any time.
- Operator can disable automation quickly.
- Automation state is visible.
- Failed automation does not leave controls disabled.
