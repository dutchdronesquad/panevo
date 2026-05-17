# Roadmap

Panevo should grow in deliberate phases. The first phase is intentionally narrow: reliable PTZ control with a strong architecture foundation.

Use `docs/product/mvp-checklist.md` as the operational checklist for tracking Phase 1 progress. Use `docs/index.md` as the entrypoint to the full documentation set.

## Phase 1: PTZ MVP

Phase 1 was intentionally narrow: one usable, reliable PTZ control workflow for a single VISCA over IP camera.

### Phase 1.1: Foundation

Status: mostly complete.

- Electron Forge + React + Vite + TypeScript app foundation
- Project documentation structure
- Main/preload/renderer process separation
- Typed preload API through `window.panevo`
- Local JSON config storage
- Mock mode foundation
- Basic operator UI layout

Exit criteria:

- App starts in development mode.
- TypeScript passes.
- Mock mode can run without hardware.
- Renderer never accesses raw Node.js networking APIs.

### Phase 1.2: VISCA Hardware Validation

Status: complete.

- Validate Tenveo UDP VISCA control on port `52381`.
- Confirm pan, tilt, diagonal movement, and stop.
- Confirm zoom in, zoom out, and zoom stop.
- Confirm preset recall and preset store.
- Document observed Tenveo behavior and any deviations.
- Verify preset numbering: whether UI preset `1` maps to VISCA value `1` or `0`.
- Verify practical PTZ and zoom speed ranges.

Exit criteria:

- A real camera can be controlled reliably from the app.
- Stop behavior is safe and repeatable.
- Known Tenveo quirks are documented.
- The app still works in mock mode.

### Phase 1.3: Operator Safety Hardening

Status: complete pending real-camera regression check.

- Send stop on pointer cancel, pointer leave, window blur, and app visibility loss.
- Keep an always-visible emergency stop action.
- Clamp speed and preset inputs at IPC/service boundaries.
- Return clear structured command errors to the renderer.
- Make command failure state visible without blocking the operator.
- Avoid sending commands without valid saved config.

Exit criteria:

- Camera movement stops when the operator releases control or the app loses focus.
- Invalid config cannot accidentally send hardware commands.
- Command errors are visible and recoverable.

### Phase 1.4: Preset MVP Polish

Status: complete.

- Add dynamic local preset entries.
- Persist preset entries locally.
- Allow preset entries to be added, edited, and removed from Panevo.
- Improve preset store confirmation.
- Make recall and store visually distinct.
- Record preset behavior assumptions in docs.

Exit criteria:

- Presets are usable during a livestream workflow.
- Store actions are hard to trigger accidentally.
- Preset entries survive app restart.

### Phase 1.5: UI and Packaging Stabilization

Status: complete.

- Clean up MVP UI spacing, sizing, and contrast.
- Keep PTZ controls large and touch-friendly.
- Evaluate whether to introduce `shadcn/ui` now or defer until after MVP.
- Run type and lint.
- Verify development start.
- Verify package build when network/tooling allows.
- Add first screenshots to README.

Exit criteria:

- MVP can be run by another contributor from README instructions.
- UI is readable and usable in a live production environment.
- No critical TypeScript or packaging blockers remain.

### MVP Completion Criteria

Status: complete.

The PTZ MVP is complete when:

- A single Tenveo camera can be configured manually.
- Mock mode works without hardware.
- Pan, tilt, diagonal movement, stop, zoom, and presets work through the UI.
- Local settings and preset entries persist.
- Safety stop behavior is reliable.
- The README and docs reflect actual tested behavior.
- Future features remain documented but unimplemented.

### Explicitly Deferred Until After MVP

- RTSP or NDI preview.
- OBS preview/source automation beyond manual scene switching.
- RotorHazard integration.
- Stream Deck, Companion, Flexbar, or additional control device adapters.
- Automation workflows.
- TCP VISCA, unless UDP proves insufficient for the target camera.
- Replacing the VISCA internals with an npm package.
- Broad UI framework migration, unless it directly resolves MVP blockers.

## Phase 2: Product Foundation and Camera Operations

Phase 2 should start by stabilizing the UI foundation before adding more camera complexity. The MVP proved the PTZ workflow; the next risk is building additional features on temporary UI primitives.

### Phase 2A: UI Foundation

Status: complete.

- Add Tailwind CSS.
- Initialize `shadcn/ui` for Vite.
- Keep Panevo's dark broadcast/operator visual direction.
- Replace temporary `Button` and `Card` primitives with source-owned shadcn-style primitives.
- Add shared primitives for dialog, alert dialog, input, label, select, switch, slider, tooltip, tabs, dropdown menu, popover, and toast/sonner.
- Preserve custom Panevo controls for PTZ, zoom, dynamic presets, connection status, and future operator surfaces.
- Define Panevo design tokens for surfaces, borders, actions, status states, focus rings, and control sizing.
- Review the main operator surface after the component migration.
- Keep the MVP behavior unchanged during the UI migration.

Exit criteria:

- `npm run type` passes.
- `npm run lint` passes.
- Existing PTZ, zoom, settings, mock mode, and dynamic preset workflows still work.
- The app no longer relies on one-off temporary UI primitives for common controls.
- The UI still feels like broadcast/operator tooling, not a generic SaaS dashboard.

### Phase 2B: Camera Profiles

Status: complete.

- Multi-camera profiles.
- Active camera selection.
- Per-camera preset entries.
- Camera profile settings dialogs.
- Add-camera flow gated behind a successful connection/health check.
- Basic focus controls.
- Import/export config.
- Camera connection health modes: `Verified` response check and `Transport` fallback.

Exit criteria:

- Multiple camera profiles can be created, renamed, selected, edited, deleted, imported, and exported.
- Selecting a camera runs a health check instead of incorrectly marking the camera disconnected.
- The active camera status distinguishes verified camera response from transport-only fallback.
- PTZ, zoom, focus, presets, emergency stop, and per-camera presets continue to work after switching cameras.
- `npm run type` passes.
- `npm run lint` passes.

### Phase 2C: Camera Discovery and ONVIF

Status: active.

- Initial ONVIF support through an isolated main-process service.
- ONVIF device information probing for a configured camera.
- ONVIF PTZ capability probing for a configured camera.
- Protocol-agnostic camera control boundary with VISCA as the default live route and ONVIF as an optional live adapter.
- Separate ONVIF sync route for discovery, identity, capability probing, and numeric preset synchronization.
- ONVIF PTZ control adapter for compatible cameras.
- Camera discovery and assisted setup.
- ONVIF preset discovery/import.
- ONVIF camera capability discovery where supported.
- Camera-native preset management.
- Vendor-specific discovery behavior.

Entry criteria:

- Phase 2B receives a real-camera regression pass on Tenveo hardware. Done.
- Known Tenveo behavior is recorded in `docs/hardware/tenveo-hardware.md`.
- The current implementation is committed or otherwise snapshotted before broad discovery work begins. Done.

Recommended order:

1. Research ONVIF support strategy and candidate Node.js packages. Done.
2. Add an isolated `services/onvif` boundary in the main process. Done.
3. Probe configured cameras for ONVIF device information and PTZ capabilities. Done.
4. Design discovered-camera records without coupling them to VISCA profiles. Initial probe result shape, transient per-camera UI state, table status, and camera-management result dialog exist.
5. Route live camera actions through `CameraControlService` so VISCA and ONVIF PTZ adapters share one Panevo action surface. Done.
6. Add ONVIF PTZ, zoom, stop, focus, and preset control behind the same Panevo action surface. Done.
7. Add assisted camera setup only after ONVIF probing is stable.
8. Add preset discovery/import only after capability and auth handling are understood.

Exit criteria:

- Panevo can test whether a configured camera exposes ONVIF without breaking VISCA control.
- ONVIF code remains isolated from renderer components and VISCA internals.
- Discovery results are normalized into Panevo-level camera records.
- Manual IP/port camera setup remains available.
- ONVIF auth, timeout, and failure states are documented.
- Camera-management UI can show latest ONVIF probe state without persisting probe data as profile truth.
- Live control remains protocol-agnostic in IPC/renderer code.
- `visca` is the default live control adapter for new camera profiles.
- `onvif` is the default sync adapter for new camera profiles.
- `onvif` remains available as an optional live control adapter.

Follow-up before promoting ONVIF control:

- Validate ONVIF pan, tilt, zoom, stop, and presets against the Tenveo camera.
- Decide whether the `onvif` package remains acceptable or should be replaced with Panevo-owned SOAP calls.
- Move ONVIF password storage out of plain local JSON.

### Phase 2D: Stabilization and Release Readiness

Status: complete.

Phase 2D is focused on making the current PTZ/operator workflow dependable before adding larger new features. The goal is to reduce regressions, validate the protocol split, and make the UI usable across realistic desktop window sizes.

Scope:

- Hardware regression for VISCA live control with ONVIF sync enabled.
- ONVIF preset add, store, import, startup sync, and camera-native remove validation.
- Responsive UI validation across large desktop, laptop, tablet-width, and narrow test windows.
- Operator status copy and error-state polish.
- Packaging smoke test.
- Documentation updates based on verified behavior.

Exit criteria:

- VISCA live control remains responsive while ONVIF sync is enabled.
- Background health checks do not block or disrupt PTZ commands.
- Preset remove behaves as documented for ONVIF sync and local-only modes.
- Camera management, control, and settings views remain usable at common window sizes.
- `npm run type`, `npm run lint`, and packaging smoke checks pass.
- `docs/hardware/tenveo-hardware.md`, `docs/architecture/testing.md`, and `docs/product/mvp-checklist.md` reflect the latest validation.

### Phase 2E: VISCA Compatibility

Status: complete for the current Tenveo/UDP scope; revisit when adding a new camera model or after TCP hardware validation creates a concrete need.

Phase 2E keeps camera control reliable while preparing for broader camera support. This phase should stay focused on command behavior, vendor variation, and protocol decisions.

- Keep Panevo's local VISCA implementation behind `ViscaClient` for now.
- Do not adopt a third-party VISCA package until it solves a demonstrated problem such as ACK/completion handling, TCP support, retries, or a verified vendor quirk.
- Keep TCP VISCA deferred for the tested Tenveo camera until hardware validation shows that it works and improves reliability or command feedback.
- Track vendor-specific VISCA compatibility through camera-profile capabilities and service-layer adapters, not renderer conditionals.
- Keep safer preset overwrite flows as an operator UX topic; it should not require replacing VISCA internals.

Exit criteria:

- Decide whether a third-party VISCA package is worth adopting or whether Panevo should keep the local VISCA implementation.
- Document known Tenveo VISCA quirks and any camera-profile compatibility flags.
- Decide whether TCP VISCA is useful for the tested Tenveo camera.
- Keep VISCA live control stable while ONVIF remains the sync/discovery route.

## Phase 3: Stream Discovery and External Preview

Panevo should expose camera stream metadata without owning video playback yet. Video preview remains external so the application can stay focused on reliable control and camera discovery.

Current scope:

- ONVIF RTSP stream URI discovery.
- RTSP stream diagnostics in probe results.
- No active preview settings in camera profiles.
- No NDI runtime, SDK binding, IPC, or renderer playback layer.

Not first scope:

- In-app RTSP playback.
- In-app NDI playback.
- Multi-camera preview grid.
- Recording/streaming.
- OBS preview dependency as the only preview path.

Exit criteria:

- Validate RTSP URL discovery against Tenveo hardware.
- Keep PTZ control unaffected by stream discovery failures.
- Document future preview requirements before reintroducing any playback backend.

## Phase 3B: Open Source Project Readiness

Panevo should be prepared as an open source project before larger integrations increase the repository surface area.

Scope:

- Add `LICENSE`.
- Rewrite `README.md` to be more end-user and contributor friendly.
- Add screenshots or screenshot placeholders.
- Add contribution guidance.
- Add pull request template.
- Add GitHub label taxonomy.
- Add Renovate configuration.
- Add Release Drafter configuration.
- Add GitHub Actions for lint, type, and package smoke checks.
- Add security/support docs where useful.

Exit criteria:

- A new user can understand what Panevo does and how to run it from the README.
- A contributor can find architecture, roadmap, and setup docs from the README.
- CI catches lint and type failures.
- Dependency update PRs are grouped and labelled.
- Release notes can be drafted consistently.
- Pull request guidance supports useful contributions.

## Phase 4: Production Integrations

- OBS scene and source integration
- RotorHazard race state integration
- Stream Deck and Companion support
- Flexbar touch panel integration investigation
- Operator controls such as keyboard shortcuts and input devices including HDZero radio, gamepad, joystick, MIDI, and HID button boxes
- Race-aware shot presets
- Event-triggered camera actions

Phase 4 should start with integration management UX and then define a shared Panevo action/event layer. Integrations should emit normalized Panevo actions and consume normalized Panevo state instead of talking directly to VISCA, ONVIF, renderer components, or camera sockets.

Recommended Phase 4 order:

1. Add an Integrations page and shared integration lifecycle model.
2. Define the Panevo action/event layer and feedback model.
3. Add OBS read-only connection and scene discovery.
4. Add OBS scene switch action.
5. Add Companion/Stream Deck friendly action bridge for core camera actions.
6. Add a control device spike using standard Gamepad/HID or MIDI behavior.
7. Add RotorHazard read-only race state.
8. Add first guarded trigger/action automation.
9. Investigate Flexbar once the shared action and feedback model exists.

Direct preset-to-OBS scene mapping is intentionally not part of the OBS integration phase. That behavior belongs in automation, where trigger source, action ordering, failure behavior, and manual override can be represented explicitly.

## Phase 5: Automation Platform

- Workflow editor
- Trigger/action system
- Race event automation
- Operator workspaces
- Timeline or rundown concepts
- Plugin architecture evaluation

## Risks

- VISCA behavior varies between vendors and camera firmware.
- Network camera latency can affect operator confidence.
- Preview support can become complex quickly and should not block PTZ control.
- Automation must be carefully designed to avoid dangerous camera movement during live production.
- Too much early abstraction could slow MVP delivery.
