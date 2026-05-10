# MVP Checklist

This checklist tracks the work needed to complete the Panevo PTZ MVP. It should be updated as work is completed so future contributors and AI-assisted sessions can immediately see current progress.

## How To Use This Checklist

- Check items only after behavior is implemented and verified.
- If an item is partially true, leave it unchecked and add detail in the relevant doc.
- When hardware behavior is verified, update `tenveo-hardware.md`.
- When a technical direction changes, update `decisions.md`.
- When a task becomes intentionally deferred, move or duplicate it under Explicitly Deferred with context.
- Keep this checklist focused on completed MVP and near-term Phase 2 stabilization work. Larger future features belong in `roadmap.md`.

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
- [ ] Automation workflows.
- [ ] TCP VISCA support.
- [ ] Replacing VISCA internals with an npm package.

## Phase 2A: UI Foundation

- [x] Add Tailwind CSS.
- [x] Initialize `shadcn/ui` for Vite.
- [x] Add shared UI primitives for common controls.
- [x] Replace temporary `Button` primitive.
- [x] Replace temporary `Card` primitive.
- [x] Add dialog and alert dialog primitives.
- [x] Add input, label, select, switch, slider, tooltip, tabs, dropdown, popover, and toast primitives.
- [x] Migrate camera settings, speed selectors, and preset edit fields to shadcn form primitives.
- [x] Replace native preset confirmation dialogs with shadcn alert dialogs.
- [x] Add shadcn tooltip provider and zoom control tooltips.
- [x] Preserve custom PTZ, zoom, dynamic preset, and connection status components.
- [x] Define Panevo design tokens.
- [x] Verify PTZ, zoom, settings, mock mode, and dynamic presets still work.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Remove Vite 8 `inlineDynamicImports` preload warning.

## Phase 2B: Camera Profiles

- [x] Add camera profile config model.
- [x] Migrate existing single-camera config to the first camera profile.
- [x] Add active camera selection.
- [x] Allow the last camera profile to be removed.
- [x] Store presets per camera profile.
- [x] Add profile create, rename, and remove actions.
- [x] Disconnect/reconnect VISCA client when active camera connection settings change.
- [x] Add import/export config.
- [x] Split operator control and camera configuration into sidebar views.
- [x] Extract shell, workspace header, and view components from `App.tsx`.
- [x] Make live presets recall-first with edit, store, and delete behind secondary actions.
- [x] Make the camera table a full-width management surface with per-row settings dialogs.
- [x] Gate new camera creation behind a successful connection/probe test.
- [x] Add basic VISCA focus controls with auto/manual mode and focus in/out.
- [x] Add camera connection health checks.
- [x] Distinguish verified camera response from transport-only fallback status.
- [x] Run camera health check during active camera selection.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

Phase 2B hardware regression:

- [x] Validate camera switching against real Tenveo hardware.
- [x] Validate `VISCA response verified` health mode against real Tenveo hardware.
- [x] Validate `Transport ready fallback` status behavior against real Tenveo hardware.
- [x] Validate focus auto/manual/in/out against real Tenveo hardware.

## Phase 2C: Camera Discovery and ONVIF

- [x] Research ONVIF package options and packaging impact.
- [x] Decide whether to use an ONVIF package or local SOAP client.
- [x] Add isolated main-process ONVIF service boundary.
- [x] Add ONVIF device information probe for a configured camera.
- [x] Add ONVIF PTZ capability probe.
- [x] Normalize discovery/probe results into Panevo-level probe records.
- [x] Document ONVIF auth requirements and failure modes.
- [x] Keep manual VISCA IP/port setup available.
- [x] Add camera-management UI action for probing ONVIF on a configured camera.
- [x] Show normalized ONVIF probe results without exposing raw ONVIF objects.
- [x] Add separate camera profile field for ONVIF port.
- [x] Document tested Tenveo ONVIF port `8080`.
- [x] Add ONVIF username support in camera profiles.
- [x] Add ONVIF password support for probe and control authentication.
- [x] Keep latest ONVIF probe status in per-camera renderer state.
- [x] Show ONVIF verified/unavailable/not-probed state in the camera table.
- [x] Show ONVIF media profile details and PTZ availability in the probe dialog.
- [x] Automatically run ONVIF probe after saving ONVIF endpoint or credential changes.
- [x] Automatically rebuild ONVIF probe status after app restart using stored credentials.
- [x] Group camera settings into profile, VISCA, and ONVIF sections.
- [x] Add `controlProtocol` to camera profiles.
- [x] Add `CameraControlService` as the protocol-agnostic live control boundary.
- [x] Route existing live PTZ, zoom, focus, and preset actions through the VISCA control adapter.
- [x] Add ONVIF PTZ control adapter behind `CameraControlService`.
- [x] Route ONVIF pan, tilt, zoom, stop, and preset actions through the selected camera `controlProtocol`.
- [x] Add ONVIF focus mode, focus in/out, and focus stop through the ONVIF Imaging service.
- [x] Make preset add/store camera-native before updating Panevo local state.
- [x] Add ONVIF camera-native preset removal.
- [x] Remove VISCA camera-native preset delete after CAM_Memory Reset failed hardware validation.
- [x] Automatically import numeric ONVIF presets after adding an ONVIF camera.
- [x] Sync numeric ONVIF presets from the camera after app restart.
- [x] Split live control and camera sync into separate `controlProtocol` and `syncProtocol` fields.
- [x] Make VISCA the default live control protocol for new camera profiles.
- [x] Make ONVIF the default discovery and preset-sync protocol for new camera profiles.
- [x] Add delete confirmation for camera profile removal.
- [x] Make VISCA versus ONVIF preset import limitations visible in the operator UI and docs.
- [x] Document ONVIF credential-storage risk.
- [x] Validate ONVIF probing against real Tenveo hardware.
- [x] Validate ONVIF pan, tilt, diagonal movement, zoom, and stop against real Tenveo hardware.
- [x] Validate ONVIF focus auto/manual/in/out/stop against real Tenveo hardware.
- [x] Validate ONVIF preset recall/store token mapping against real Tenveo hardware.
- [x] Decide to keep the `onvif` package behind Panevo service adapters for Phase 2C and keep Panevo-owned SOAP as the replacement path if maintenance or packaging becomes a blocker.
- [x] Document Phase 2C ONVIF password storage as a local plain-config mode and keep OS keychain/encrypted storage as production hardening.
- [x] Add assisted camera setup from ONVIF probe results.
- [x] Add ONVIF discovery across the local network.
- [x] Add ONVIF preset discovery/import investigation.

## Phase 2D: Stabilization and Release Readiness

- [x] Split VISCA live control from ONVIF discovery/sync.
- [x] Make Electron open wider by default for operator workflows.
- [x] Add responsive layout rules for large, laptop, tablet-width, and narrow windows.
- [x] Make VISCA background health checks passive so they do not block live control.
- [x] Route preset removal through ONVIF `RemovePreset` when `syncProtocol` is `onvif`.
- [x] Validate VISCA PTZ, zoom, focus, stop, and emergency stop with ONVIF sync enabled.
- [x] Validate ONVIF preset add/store/startup sync/remove against Tenveo hardware.
- [x] Validate that deleted ONVIF presets disappear from the camera web UI.
- [x] Validate app restart keeps ONVIF credentials and rebuilds probe/sync state.
- [x] Validate responsive layout at `1440`, `1180`, `980`, `760`, and `560` px widths.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run package`.
  - Phase 2D accepted; last local package attempt completed Vite production bundles but Electron Forge packaging failed while resolving `github.com` (`getaddrinfo ENOTFOUND github.com`). Retry with working network access before release distribution.
- [x] Update `tenveo-hardware.md` with Phase 2D regression results.

## Phase 2E: VISCA Compatibility

- [ ] Decide whether Panevo keeps its local VISCA implementation for now.
- [ ] Evaluate whether a third-party VISCA package solves a real current problem.
- [ ] Document Tenveo VISCA compatibility assumptions.
- [ ] Decide whether TCP VISCA is useful enough to implement for the tested camera.
- [ ] Identify any camera-profile compatibility flags needed before adding more camera models.
- [ ] Keep VISCA live control stable while ONVIF remains the sync/discovery route.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 3: Preview and Monitoring

- [ ] Decide the first supported preview transport.
- [ ] Add per-camera preview source fields after choosing the first transport.
- [ ] Add active-camera preview panel without blocking PTZ control.
- [ ] Show preview unavailable/configuration/error states.
- [ ] Document packaging and CPU impact.
- [ ] Defer NDI until packaging/licensing impact is understood.
