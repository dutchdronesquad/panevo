# Future Integrations

Panevo's MVP only implements PTZ control. Future integrations should be added as separate services with clear IPC contracts and renderer-facing abstractions.

## Integration Principles

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

## OBS

Potential features:

- Scene switching
- Source visibility
- Recording and streaming state
- Scene-aware camera presets
- Production macros

OBS integration should likely use obs-websocket and remain isolated in a dedicated main-process service.

Possible architecture:

```text
services/obs/
  obs-client.ts
  obs-types.ts
  obs-ipc.ts
```

OBS should initially be used for state awareness and simple actions, not as a required preview path for the PTZ MVP.

## RotorHazard

Potential features:

- Race state monitoring
- Pilot and heat metadata
- Lap and gate event triggers
- Race-aware camera automation
- Overlay coordination

RotorHazard integration should avoid hard-coding Dutch Drone Squad assumptions into core Panevo concepts.

RotorHazard concepts should be translated into generic race/event concepts before they affect core Panevo architecture.

## Operator Surfaces

Panevo should support external operator surfaces over time. These integrations should map hardware or companion controls to Panevo actions rather than duplicating camera protocol logic.

Potential features:

- External button surfaces for camera moves and presets
- Companion module support
- Stream Deck plugin investigation
- Status feedback on hardware keys
- Flexbar integration investigation
- Touch panel pages for camera banks, presets, zoom, and race-aware actions

Panevo should expose stable action concepts before committing to a plugin API.

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

- RTSP preview
- NDI preview
- Multi-camera confidence grid
- Low-latency preview controls

Preview should be treated as a separate capability from camera control. It can introduce native dependencies, performance risks, and packaging complexity.

Possible preview routes:

- External preview only during MVP.
- RTSP preview through a renderer-compatible player or native helper.
- NDI preview if packaging and licensing constraints are acceptable.
- OBS-based preview or confidence monitor integration.

Preview should not block camera control startup. If preview fails, PTZ control should still work.

Current direction:

- Preview is moving into Phase 3 as the next major capability after Phase 2E VISCA compatibility decisions.
- The first implementation should be an active-camera confidence preview, not a full multi-camera monitoring wall.
- Preview source configuration should live on the camera profile, but preview services must remain separate from VISCA and ONVIF control services.
- The renderer should display preview state and errors, but protocol handling, transcoding, or native helpers should be owned by the main process or a dedicated helper boundary.

First transport decision:

- Chromium/Electron cannot play raw RTSP directly in a normal `<video>` element.
- If the camera exposes MJPEG, HLS, WebRTC, or another browser-compatible preview route, that should be tested first because it avoids native transcoding.
- If the only useful camera feed is RTSP, Panevo needs a helper/transcoding strategy before rendering it reliably.
- NDI should remain deferred until licensing, packaging, and runtime dependency impact are understood.

Preview acceptance rules:

- PTZ, stop, preset, and camera configuration must keep working when preview fails.
- Preview should be easy to disable per camera.
- Preview errors must be visible but not modal during live operation.
- Preview work should be validated for CPU/load impact during movement commands.

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

## Automation

Potential features:

- Trigger/action workflows
- Race event automation
- Scheduled camera moves
- Conditional actions
- Manual override controls

Automation must include operator safety constraints, clear state visibility, and quick cancellation.

Automation should be built only after stable action concepts exist. Early automation should be simple trigger/action mapping, not a full workflow engine.

Manual override requirements:

- Operator can stop camera movement at any time.
- Operator can disable automation quickly.
- Automation state is visible.
- Failed automation does not leave controls disabled.
