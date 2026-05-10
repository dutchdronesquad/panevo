# MVP Checklist

This checklist tracks the work needed to complete the Panevo PTZ MVP. It should be updated as work is completed so future contributors and AI-assisted sessions can immediately see current progress.

## How To Use This Checklist

- Check items only after behavior is implemented and verified.
- If an item is partially true, leave it unchecked and add detail in the relevant doc.
- When hardware behavior is verified, update `tenveo-hardware.md`.
- When a technical direction changes, update `decisions.md`.
- When a task becomes intentionally deferred, move or duplicate it under Explicitly Deferred with context.
- Keep this checklist focused on Phase 1. Future features belong in `roadmap.md`.

## Phase 1.1: Foundation

- [x] Create project documentation structure.
- [x] Set up Electron Forge application.
- [x] Add React renderer.
- [x] Add TypeScript configuration.
- [x] Add main/preload/renderer process separation.
- [x] Add typed preload API through `window.panevo`.
- [x] Add local JSON config service.
- [x] Add mock mode foundation.
- [x] Add basic operator UI layout.
- [x] Verify TypeScript with `npm run typecheck`.
- [x] Verify `npm start` on a clean checkout.

## Phase 1.2: VISCA Hardware Validation

- [x] Send VISCA commands over UDP.
- [x] Validate basic control against a real Tenveo camera.
- [x] Validate pan left and pan right.
- [x] Validate tilt up and tilt down.
- [x] Validate diagonal movement.
- [x] Validate movement stop.
- [x] Validate zoom in and zoom out.
- [x] Validate zoom stop.
- [x] Validate preset recall.
- [x] Validate preset store.
- [x] Confirm Tenveo VISCA port assumption: `52381`.
- [x] Confirm preset numbering behavior.
- [x] Confirm useful PTZ speed range.
- [x] Confirm useful zoom speed range.
- [x] Document Tenveo-specific quirks in `docs/visca.md`.

## Phase 1.3: Operator Safety Hardening

- [x] Send movement stop on pointer cancel.
- [x] Send movement stop on pointer leave while active.
- [x] Send movement stop on window blur.
- [x] Send movement stop on document visibility loss.
- [x] Send zoom stop on pointer cancel.
- [x] Send zoom stop on pointer leave while active.
- [x] Add or emphasize always-visible emergency stop.
- [x] Clamp PTZ speed at IPC/service boundary.
- [x] Clamp zoom speed at IPC/service boundary.
- [x] Clamp preset values at IPC/service boundary.
- [x] Improve structured command errors in renderer.
- [x] Prevent hardware commands when saved config is invalid.

## Phase 1.4: Preset MVP Polish

- [x] Add dynamic local preset entries.
- [x] Start with no preset placeholders by default.
- [x] Persist preset entries locally.
- [x] Show preset labels and camera preset numbers in the preset list.
- [x] Allow preset entries to be added.
- [x] Allow preset entries to be edited.
- [x] Allow preset entries to be removed from Panevo.
- [x] Improve preset store confirmation.
- [x] Make recall and store actions visually distinct.
- [x] Document preset numbering assumptions.
- [x] Validate preset entries survive app restart.

## Phase 1.5: UI and Packaging Stabilization

- [x] Review UI spacing, contrast, and density.
- [x] Verify controls remain usable at minimum window size.
- [x] Verify touch/pointer behavior on PTZ and zoom controls.
- [x] Decide whether `shadcn/ui` is added before or after MVP completion.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint` or update lint tooling if incompatible with TypeScript version.
- [x] Verify `npm start`.
- [x] Verify `npm run package` when network/tooling allows.
- [x] Add screenshots to README.
- [x] Update README with tested hardware notes.

Codex sandbox notes from previous verification:

- `npm start` can be blocked in the Codex sandbox because Vite may be unable to listen on a local dev-server port: `listen EPERM: operation not permitted 127.0.0.1:5173`.
- `npm run package` can build main, preload, and renderer Vite bundles but fail full Forge packaging if DNS/network access to GitHub is unavailable: `getaddrinfo ENOTFOUND github.com`.
- README contains the screenshot section and `docs/screenshots/` location. Actual image capture should happen from a local app run.

Local verification:

- `npm start` was verified outside the Codex sandbox.
- `npm run package` was verified outside the Codex sandbox.
- Hardware regression was verified against the Tenveo camera after the preset and safety changes.

## Explicitly Deferred

- [ ] RTSP preview.
- [ ] NDI preview.
- [ ] OBS integration.
- [ ] RotorHazard integration.
- [ ] Stream Deck integration.
- [ ] Companion integration.
- [ ] Flexbar integration.
- [ ] Camera autodiscovery.
- [ ] ONVIF support.
- [ ] Multi-camera profiles.
- [ ] Automation workflows.
- [ ] TCP VISCA support.
- [ ] Replacing VISCA internals with an npm package.
