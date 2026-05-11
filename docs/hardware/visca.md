# VISCA Architecture

Panevo's PTZ MVP controls cameras using VISCA over IP. The first target camera is a Tenveo PTZ camera, but the implementation should remain vendor-aware rather than vendor-locked.

## Design Goals

- Keep raw packet construction out of the renderer.
- Keep packet construction separate from socket transport.
- Use high-level camera methods in application code.
- Prepare for acknowledgements, retries, busy states, and rate limiting.
- Support mock mode for development without hardware.
- Keep the application API stable even if the underlying VISCA implementation changes.

## VISCA Modules

```text
services/visca/
  visca-types.ts      Shared VISCA config/result/types
  visca-commands.ts   Packet builders
  visca-queue.ts      Sequential command execution
  visca-client.ts     High-level camera client and transport
```

## High-Level Client API

```ts
connect(config);
disconnect();
panLeft(speed);
panRight(speed);
tiltUp(speed);
tiltDown(speed);
moveUpLeft(panSpeed, tiltSpeed);
moveUpRight(panSpeed, tiltSpeed);
moveDownLeft(panSpeed, tiltSpeed);
moveDownRight(panSpeed, tiltSpeed);
zoomIn(speed);
zoomOut(speed);
stop();
zoomStop();
recallPreset(presetNumber);
storePreset(presetNumber);
removePreset(presetNumber);
```

This API represents user intent. It is intentionally not a generic `sendPacket` API.

Future integrations should use the same high-level concepts:

- Movement start.
- Movement stop.
- Zoom start.
- Zoom stop.
- Preset recall.
- Preset store.
- Connection test.

## Command Queue

The MVP uses basic sequential queueing. This prevents overlapping sends and gives the project a natural place to add:

- VISCA acknowledgements
- Completion packet handling
- Retries
- Camera busy handling
- Rate limiting
- Command coalescing

Movement controls still need to feel responsive. Stop commands should remain fast and reliable because they are operator safety controls.

Queue evolution path:

1. MVP: sequential sends.
2. Safety hardening: prioritize stop and clear pending movement.
3. Hardware validation: record timing and error behavior.
4. Protocol maturity: add ACK/completion handling if the camera supports it.
5. Production maturity: add retries, timeouts, busy handling, and rate limiting.

Stop commands should never be delayed behind a long backlog of non-critical commands.

## Package Strategy

Panevo currently keeps VISCA packet construction in local code. This is acceptable for the first MVP because the required command surface is small: movement, zoom, stop, preset recall, and preset store.

Before expanding the VISCA implementation, the project should evaluate existing packages instead of assuming all protocol behavior must be implemented in-house.

Candidate package categories:

- Node.js VISCA over IP packages, such as `visca-over-ip`.
- TypeScript/Node VISCA libraries, such as `@utopian/visca`.
- ONVIF packages for cameras where ONVIF PTZ support is more reliable than VISCA.

Evaluation criteria:

- Active maintenance and recent releases.
- TypeScript support and API clarity.
- UDP and TCP VISCA support.
- ACK/completion handling.
- Retry, timeout, and camera-busy behavior.
- Preset behavior and vendor compatibility.
- Ability to support Tenveo hardware without renderer changes.
- Electron packaging impact and native dependency risk.

The preferred architecture is to hide any package behind Panevo's own `ViscaClient` interface. Renderer code and IPC contracts should not depend directly on a third-party VISCA API. If a package proves reliable, it can replace or power the transport/command internals while preserving the high-level Panevo camera API.

## Vendor Variance

VISCA implementations vary across vendors. Some cameras require different speed ranges, preset values, socket behavior, or command framing. Panevo should isolate those differences in command builders and camera profiles rather than spreading conditionals through UI code.

Known areas of variance:

- Pan speed range.
- Tilt speed range.
- Zoom speed range.
- Focus mode and focus direction mapping.
- Preset numbering.
- UDP versus TCP behavior.
- ACK and completion packets.
- Home position commands.
- Power and standby commands.
- Absolute versus relative movement support.

Camera-specific behavior should eventually live in camera profiles. The first profile is effectively Tenveo-compatible VISCA over IP.

## Tenveo MVP Notes

Observed Tenveo behavior during MVP validation:

- UDP VISCA control works on port `52381`.
- Pan speed range is `1-24`.
- Tilt speed range is `1-24`.
- Zoom speed range is `1-8`.
- Preset recall and store work.
- The camera appears to support broader preset management, including add, remove, rename, and call operations.

Focus controls:

- Panevo exposes `Auto` and `Manual` focus mode controls using the standard VISCA focus mode command.
- Manual focus exposes `Focus In` and `Focus Out` hold buttons.
- The current implementation maps `Focus In` to Sony-style VISCA near focus and `Focus Out` to far focus.
- Tenveo hardware should be checked to confirm whether the in/out direction feels correct. If it is reversed, the mapping should be changed in `visca-commands.ts`, not in renderer code.
- Panevo does not currently read the camera's actual focus mode back from hardware.

Panevo treats presets as camera-native references where the active protocol can support that operation. Each Panevo preset entry maps a UI label to a camera preset number, but Panevo should not silently pretend a camera-native operation succeeded when the protocol cannot perform it.

Current VISCA preset assumptions:

- Panevo can recall VISCA presets.
- Panevo can store the current camera position into a VISCA preset number.
- Adding a preset from the operator UI stores the current camera position before the local preset entry is added.
- New Panevo configurations start with no preset placeholders.
- UI preset numbers are currently sent as direct VISCA preset values.
- Preset labels remain local Panevo metadata for VISCA because generic VISCA does not provide a reliable camera-native rename path.
- VISCA does not provide a reliable generic way to import the camera's preset list or preset names.
- Removing a preset while ONVIF sync is enabled uses ONVIF `RemovePreset` to delete the camera-native preset, even when live control is VISCA.
- Removing a preset without ONVIF sync removes only Panevo's local mapping. The camera-native preset remains on the camera.
- `CAM_Memory Reset` (`81 01 04 3F 00 pp FF`) was investigated for delete behavior, but did not work reliably on the tested camera and is not used.
- Camera-native remove and rename behavior for Tenveo may exist through a vendor extension or web API, but it should be implemented behind a dedicated provider after verification.

## Discovery Strategy

VISCA over IP does not provide one universally reliable discovery mechanism across all vendors and network configurations. Panevo should support manual camera configuration permanently, even after discovery features are added.

Future camera discovery may combine several strategies:

- Scan the local subnet for known VISCA ports, especially `52381`.
- Send lightweight VISCA inquiry or probe commands where supported.
- Use ONVIF discovery as a complementary route for cameras that expose ONVIF.
- Consider mDNS or SSDP only when specific camera models advertise useful services.
- Allow operators to save discovered devices as camera profiles.

Discovery should be implemented as a separate service, not inside the renderer and not inside low-level packet builders. The UI should present discovery as an assistive setup workflow, not as the only way to configure a camera.

Risks and constraints:

- Broadcast networks may use VLANs, static IPs, firewalls, or isolated camera networks.
- UDP probes may be blocked or ignored.
- Some cameras may respond slowly or inconsistently.
- Aggressive subnet scanning can be noisy and should be rate-limited.
- Discovery results should never trigger camera movement.

## ONVIF Relationship

ONVIF is now an active Phase 2C camera capability alongside VISCA. It is not part of the original Phase 1 PTZ MVP, but it is implemented behind a separate service boundary so the renderer continues to call Panevo-level actions rather than VISCA or ONVIF protocol details.

ONVIF use cases:

- Discover cameras on the local network.
- Read camera metadata.
- Fetch camera preset lists, including names/tokens where supported.
- Import or sync camera presets into Panevo's local preset entries.
- Provide an ONVIF PTZ control path for cameras where ONVIF is reliable.

ONVIF is the default sync route for new camera profiles because it can provide discovery, metadata, and preset synchronization. VISCA is the default live control path for the tested Tenveo workflow because it feels more direct during operation. ONVIF live control remains available as an alternate adapter for cameras where it performs well.

Current and possible future structure:

```text
services/camera-control/
  camera-control-service.ts
  command-queue.ts

services/cameras/
  preset-discovery-service.ts
  onvif-preset-provider.ts
  vendor-preset-provider.ts

services/onvif/
  onvif-service.ts
  onvif-ptz-client.ts
  onvif-types.ts
```

Preset sync should be explicit. Panevo should not silently replace local preset entries with camera-discovered presets during live operation.

## MVP Transport

The MVP implements UDP VISCA over IP. TCP is shown as a future protocol option in settings, but it is not implemented yet.

UDP implications:

- Creating a UDP socket does not prove the camera is reachable.
- Panevo separates `Verified` and `Transport` health states.
- `Verified` means the camera responded to a non-moving VISCA focus-mode inquiry before timeout.
- `Transport` means Panevo could prepare the UDP VISCA transport, but no camera response was verified.
- Periodic background health checks are passive for VISCA. They ensure the configured UDP transport is ready but do not send a VISCA inquiry during normal operation.
- Explicit connection tests may send a non-moving VISCA inquiry to upgrade the status to `Verified`.
- If an explicit verified inquiry misses a response, Panevo treats the status as `Transport` first. Three consecutive missed verified inquiries are treated as a failed health check.
- Health-check strategy is internal. Operators should not have to choose between response verification and fallback modes during camera setup.
- `VISCA response verified` is preferred. Any transport-only fallback should be treated as an internal compatibility behavior for cameras that accept commands but do not answer useful VISCA inquiries.
- A failed verified health check means the camera did not respond repeatedly before timeout or the transport failed.
- Failed network paths may appear only when commands have no visible camera effect.
- Vendor support for inquiry responses can vary. ONVIF can provide a complementary device-level health source where available, but the selected control protocol determines which health path is used.

TCP should be considered later if Tenveo hardware supports it reliably or if ACK/completion handling is easier over TCP.
