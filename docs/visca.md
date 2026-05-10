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
connect(config)
disconnect()
panLeft(speed)
panRight(speed)
tiltUp(speed)
tiltDown(speed)
moveUpLeft(panSpeed, tiltSpeed)
moveUpRight(panSpeed, tiltSpeed)
moveDownLeft(panSpeed, tiltSpeed)
moveDownRight(panSpeed, tiltSpeed)
zoomIn(speed)
zoomOut(speed)
stop()
zoomStop()
recallPreset(presetNumber)
storePreset(presetNumber)
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

Panevo's MVP exposes dynamic local preset entries. Each Panevo preset entry maps a local label to a camera preset number.

Current preset assumptions:

- Panevo can add, edit, and remove local preset entries.
- New Panevo configurations start with no preset placeholders.
- UI preset numbers are currently sent as direct VISCA preset values.
- Preset labels are local Panevo metadata, not camera-native preset names.
- Removing a preset entry from Panevo does not delete the preset from the camera.
- Camera-native add, remove, and rename behavior is deferred until broader camera preset management is designed.

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

ONVIF is planned as a future camera capability alongside VISCA, not as part of the initial PTZ MVP.

Expected ONVIF use cases:

- Discover cameras on the local network.
- Read camera metadata.
- Fetch camera preset lists, including names/tokens where supported.
- Import or sync camera presets into Panevo's local preset entries.
- Potentially provide an alternative PTZ control path for cameras where ONVIF is more reliable than VISCA.

VISCA should remain the MVP control path for Tenveo hardware. ONVIF support should be added behind a separate service boundary so renderer code continues to call Panevo-level actions rather than ONVIF or VISCA protocol details.

Possible future structure:

```text
services/cameras/
  preset-discovery-service.ts
  onvif-preset-provider.ts
  vendor-preset-provider.ts

services/onvif/
  onvif-client.ts
  onvif-types.ts
```

Preset sync should be explicit. Panevo should not silently replace local preset entries with camera-discovered presets during live operation.

## MVP Transport

The MVP implements UDP VISCA over IP. TCP is shown as a future protocol option in settings, but it is not implemented yet.

UDP implications:

- Creating a UDP socket does not prove the camera is reachable.
- "Test connection" can only prove local transport readiness unless a camera inquiry/response flow is implemented.
- Failed network paths may appear only when commands have no visible camera effect.
- Operator documentation must be clear that real hardware movement is the true validation step during MVP.

TCP should be considered later if Tenveo hardware supports it reliably or if ACK/completion handling is easier over TCP.
