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

## ONVIF

ONVIF should be considered a future camera capability rather than a production integration like OBS or RotorHazard.

Potential features:

- Camera discovery.
- Camera metadata.
- Preset list discovery.
- Preset import/sync into Panevo's local preset entries.
- Optional ONVIF PTZ control path for compatible cameras.

ONVIF support should be implemented as a main-process service and exposed through Panevo-level IPC actions. Renderer components should not depend directly on ONVIF tokens, SOAP details, or vendor-specific response shapes.

Important constraints:

- ONVIF support varies by camera and firmware.
- Authentication may be required.
- Preset tokens and names may not map cleanly to VISCA preset numbers.
- Sync should be operator-initiated, not automatic during live operation.

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
