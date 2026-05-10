# Testing and Validation

Panevo's MVP needs both technical validation and hardware validation. TypeScript can prove API shape, but it cannot prove camera behavior, VISCA vendor compatibility, or operator safety.

## Test Categories

### Static Checks

- TypeScript compile check with `npm run typecheck`.
- Linting with `npm run lint` once lint tooling is aligned with the active TypeScript version.
- Production Vite build through Electron Forge packaging flow where possible.

### Mock Mode Validation

Mock mode should be usable without camera hardware.

Validate:

- App starts.
- Config loads.
- Save settings works.
- Test connection reports mock mode.
- PTZ controls send mock commands.
- Zoom controls send mock commands.
- Preset recall and store send mock commands.
- UI remains responsive while commands are queued.

### Real Hardware Validation

Real hardware validation should use a controlled camera setup.

Before testing:

- Confirm camera has enough physical movement space.
- Start with low PTZ speed.
- Keep power/network access available in case movement does not stop.
- Avoid testing during a live production until safety behavior is validated.

Validate:

- UDP VISCA port.
- Pan left and right.
- Tilt up and down.
- Diagonal movement.
- Movement stop.
- Zoom in and out.
- Zoom stop.
- Focus auto/manual mode.
- Focus in and out.
- Active camera health check reports connected when the camera is reachable.
- Active camera health check reports an error when the camera is disconnected or unreachable.
- Preset recall.
- Preset store.
- Speed range.
- Preset numbering.

Record results in `tenveo-hardware.md`.

## Safety Validation

Safety behavior is part of the MVP, not polish.

Validate:

- Releasing pointer stops movement.
- Pointer cancel stops movement.
- Pointer leave while active stops movement.
- Window blur stops movement.
- Document visibility loss stops movement.
- Emergency stop remains visible and works.
- Invalid config prevents hardware commands.
- Command errors are visible and recoverable.

## Packaging Validation

Packaging should be validated before considering the MVP complete.

Validate:

- `npm run package` completes on a machine with network access.
- The packaged app launches.
- Mock mode works in packaged app.
- Config persists in packaged app.
- Hardware commands still work in packaged app.

## Regression Checklist

Run this before marking a Phase 1 subphase complete:

- [ ] `npm run typecheck`
- [ ] App launches in development mode.
- [ ] Mock mode test connection works.
- [ ] Mock PTZ movement logs commands.
- [ ] Mock stop logs command.
- [ ] Mock zoom logs commands.
- [ ] Config persists after restart.
- [ ] Real camera moves and stops safely, when hardware is available.
- [ ] Relevant docs and checklist are updated.
