# VISCA Architecture

Panevo's PTZ MVP controls cameras using VISCA over IP. The first target camera is a Tenveo PTZ camera, but the implementation should remain vendor-aware rather than vendor-locked.

## Design Goals

- Keep raw packet construction out of the renderer.
- Keep packet construction separate from socket transport.
- Use high-level camera methods in application code.
- Prepare for acknowledgements, retries, busy states, and rate limiting.
- Support mock mode for development without hardware.

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

## Command Queue

The MVP uses basic sequential queueing. This prevents overlapping sends and gives the project a natural place to add:

- VISCA acknowledgements
- Completion packet handling
- Retries
- Camera busy handling
- Rate limiting
- Command coalescing

Movement controls still need to feel responsive. Stop commands should remain fast and reliable because they are operator safety controls.

## Vendor Variance

VISCA implementations vary across vendors. Some cameras require different speed ranges, preset values, socket behavior, or command framing. Panevo should isolate those differences in command builders and camera profiles rather than spreading conditionals through UI code.

## MVP Transport

The MVP implements UDP VISCA over IP. TCP is shown as a future protocol option in settings, but it is not implemented yet.

