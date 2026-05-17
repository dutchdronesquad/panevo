# Architecture Decisions

This document records product and technical decisions that should guide future implementation. Update it when a decision is changed or superseded.

## ADR-001: Use Electron Forge as the Application Foundation

Status: accepted.

Panevo uses Electron Forge because it is an official Electron packaging and development route and gives the project a conventional desktop application foundation.

Implications:

- Main and preload entrypoints remain explicit.
- Packaging and makers are handled by Forge.
- Renderer tooling can still use Vite and React.

## ADR-002: Use React + Vite for the Renderer

Status: accepted.

Panevo uses React for the operator UI and Vite for fast renderer development.

Rationale:

- The MVP is a desktop control surface, not a server-rendered web application.
- React is sufficient for stateful UI controls and future component growth.
- Vite keeps the renderer development loop fast.

Non-choice:

- Next.js is not used because Panevo does not need routing, SSR, API routes, or server-rendered pages for the desktop MVP.

## ADR-003: Keep VISCA Behind Panevo's Own Client Interface

Status: accepted.

Renderer and IPC code call high-level methods such as `panLeft`, `zoomIn`, and `recallPreset`. They do not know about packet bytes or third-party VISCA APIs.

Rationale:

- VISCA implementations vary by vendor.
- The project may later adopt an npm package.
- The renderer should remain stable if command construction changes.

## ADR-004: Local VISCA Packet Construction Is Acceptable for MVP

Status: accepted for MVP.

The MVP command surface is small enough to implement locally while preserving clean module boundaries.

Future review:

- Reevaluate before adding ACK handling, retries, TCP support, or broad vendor compatibility.
- If a package is adopted, keep it behind `ViscaClient`.

## ADR-005: Manual Camera Configuration Remains Required

Status: accepted.

Camera discovery is deferred. Even after discovery exists, manual IP and port configuration must remain available.

Rationale:

- Broadcast networks often use VLANs, static IPs, and firewall rules.
- VISCA discovery is not universally reliable.
- Operators need deterministic setup paths.

## ADR-006: Preview Is Deferred Until After PTZ MVP

Status: accepted.

NDI and RTSP preview are explicitly out of scope for Phase 1.

Rationale:

- Preview can introduce native dependencies and packaging complexity.
- External preview tools such as OBS or NDI Studio Monitor are sufficient during PTZ MVP validation.
- Camera control should be reliable before preview is integrated.

## ADR-007: UI Framework Will Be Adopted Selectively

Status: accepted and active for Phase 2A.

Panevo will use `shadcn/ui` for generic UI primitives, preferably with Base UI or Radix primitives underneath where supported by the selected shadcn setup.

Rationale:

- Source-owned primitives fit the project's need for custom operator styling.
- A heavily opinionated UI framework risks making Panevo look like a generic admin tool.
- PTZ controls, dynamic preset lists, and operator surfaces should remain custom Panevo components.

Implementation constraints:

- Tailwind and shadcn should be introduced before Phase 2 camera profiles.
- Existing PTZ behavior must remain unchanged during the migration.
- Panevo-specific controls should not be forced into generic primitives.
- Design tokens should preserve the dark, technical, broadcast-oriented visual direction.
- Tailwind CSS v4 is the active styling baseline.
- shadcn components should be added through the shadcn CLI so generated component code remains aligned with the selected preset and registry.

## ADR-008: Integrations Are Deferred Until MVP Completion

Status: accepted.

OBS, RotorHazard, Stream Deck, Companion, Flexbar, and automation remain documented but not active implementation scope during Phase 2B stabilization. Camera discovery and ONVIF investigation are the next planned scope for Phase 2C after the Phase 2B hardware regression pass.

Rationale:

- The first product value is reliable camera control.
- Integrations depend on stable action concepts.
- Premature integration work can obscure hardware and safety issues.

## ADR-009: Keep Vite 8 With Electron Forge Compatibility Patches

Status: accepted.

Panevo uses Vite 8 so the renderer and shadcn/Tailwind v4 setup stay on the current toolchain. Electron Forge's Vite plugin may still emit preload output config intended for older Vite/Rollup behavior.

Implementation note:

- `vite.preload.config.ts` removes Forge's deprecated `inlineDynamicImports` output option from the resolved preload build config.
- The preload build explicitly uses `codeSplitting: false`, which is the Vite 8/Rolldown-compatible replacement.
- This keeps the preload bundle single-file without carrying deprecated build warnings.

## ADR-010: Use an ONVIF Package Behind a Panevo Service Adapter

Status: accepted for Phase 2C.

Panevo uses the `onvif` npm package for Phase 2C ONVIF probing, discovery, preset discovery, and PTZ control. The package is isolated behind Electron main-process adapters.

Rationale:

- ONVIF is SOAP-based and has enough vendor variation that hand-writing the first client would slow discovery work.
- The package provides camera connection, WS-Discovery, capabilities, device information, profiles, PTZ node probing, preset discovery, ContinuousMove, Stop, and preset command helpers.
- The installed package has a small runtime dependency footprint and no native dependency in the current install.
- Keeping it behind a service adapter lets Panevo replace it later if packaging, compatibility, or maintenance becomes a problem.

Implementation constraints:

- Renderer code must not receive raw ONVIF package objects.
- ONVIF probing and control must return Panevo-level result types.
- ONVIF discovery must return normalized Panevo discovery records, not raw package objects.
- ONVIF is the default sync route for new camera profiles.
- VISCA is the default live PTZ control path for the tested Tenveo workflow.
- ONVIF remains available as an optional live PTZ control path where camera behavior is reliable.
- Manual VISCA camera setup remains available even if ONVIF probing fails.
- ONVIF username and password are currently stored in the local camera profile so ONVIF probing, sync, and optional live control can authenticate after restart.
- Plain JSON password storage is the documented Phase 2C mode. It is not production-ready for broader release; move credentials to OS keychain or encrypted storage before release-quality ONVIF support.
- ONVIF preset import runs automatically when adding an ONVIF camera and remains available manually from the probe dialog.
- ONVIF preset import is limited to numeric preset tokens until Panevo has a safe mapping model for opaque ONVIF tokens.

Known risk:

- `onvif@0.8.1` currently emits Node's `[DEP0169]` warning because it uses the deprecated `url.parse()` API internally. This is acceptable for Phase 2C investigation, but it must be reviewed before treating ONVIF support as production-polished.
- The package should be considered replaceable. If maintenance, compatibility, or security concerns become blocking, replace the adapter internals with Panevo-owned SOAP requests while preserving `OnvifService`, `OnvifPtzClient`, IPC, and renderer-facing types.

## ADR-011: Route Live Camera Actions Through a Protocol-Agnostic Control Service

Status: accepted and active.

Panevo uses `CameraControlService` as the main-process boundary for live camera actions. Renderer and preload APIs remain Panevo-level actions such as `panLeft`, `zoomIn`, `stop`, and `recallPreset`; they do not choose `ViscaClient`, ONVIF PTZ, or vendor-specific clients directly.

Rationale:

- Panevo should support both VISCA and ONVIF over time without mixing protocol details into the operator UI.
- Live production needs one predictable selected control path per camera.
- ONVIF is the preferred route for discovery, metadata, and preset sync where the camera supports it.
- VISCA is the default live route for the tested Tenveo workflow because it is more responsive in operator use.
- ONVIF remains available for cameras or workflows where ONVIF control is reliable enough.

Implementation constraints:

- Each camera profile has a `controlProtocol` and a `syncProtocol`.
- Default `controlProtocol` is `visca`.
- Default `syncProtocol` is `onvif`.
- `onvif` routes through `OnvifPtzClient` for PTZ, zoom, stop, focus, and preset control.
- ONVIF probe/discovery can coexist with VISCA control, but live movement commands must route through the selected control adapter.
- Focus control routes through VISCA or ONVIF Imaging depending on the selected control adapter. ONVIF focus remains vendor-sensitive because cameras may expose PTZ without accepting Imaging focus commands.
- Presets are treated as camera-native references where the selected adapter can support the operation. Add/store should update the camera before local Panevo state changes.
- ONVIF preset delete is camera-native. VISCA preset delete removes only Panevo's local mapping because CAM_Memory Reset did not work on the tested camera.
- Preset behavior must remain explicit because ONVIF preset tokens may not match Panevo's numeric preset entries.

## ADR-012: Route Integrations Through a Shared Panevo Action Dispatcher

Status: accepted for Phase 4B.

Panevo uses a main-process `ActionDispatcher` as the shared boundary for future integrations, automation, and external operator surfaces. Integrations emit normalized Panevo actions and consume Panevo feedback snapshots instead of calling renderer components, camera IPC handlers, VISCA, ONVIF, or future OBS services directly.

Rationale:

- Integrations need one stable action vocabulary for cameras, presets, stop, focus, OBS, and automation.
- Live-control safety depends on preserving the existing active-camera validation, speed clamps, stop behavior, and command queues.
- External controls such as Companion, Stream Deck, Flexbar, control devices, and automation need feedback state without coupling to React component state.
- OBS and automation actions can be named before their adapters exist; `obs.scene.switch` becomes active in Phase 4C.

Implementation constraints:

- Camera and preset actions route through `ConfigService` and `CameraControlService`.
- `camera.stop` supports movement, zoom, focus, and all live motion channels.
- `preset.store` and `preset.remove` are destructive action classes because they can overwrite or remove camera-native state.
- `obs.scene.switch` routes through the Phase 4C OBS adapter when OBS is enabled; `automation.profile.set-enabled` returns structured unsupported results until Phase 4H.
- Feedback snapshots include active camera, connection snapshot, active-camera presets, integration lifecycle states, and last action status.

## ADR-013: OBS Uses an Isolated Main-Process Websocket Adapter

Status: accepted for Phase 4C.

Panevo implements the first OBS integration with a small source-owned OBS websocket v5 adapter in the main process. The adapter owns authentication, request IDs, timeouts, connection testing, scene-list loading, and `SetCurrentProgramScene`.

Rationale:

- Phase 4C needs only a narrow subset of OBS websocket behavior.
- Keeping the adapter source-owned avoids adding a broad dependency before the integration surface is proven.
- The boundary remains replaceable if a package such as `obs-websocket-js` becomes useful later.
- Renderer code must not depend on OBS websocket protocol details.

Implementation constraints:

- OBS calls are exposed through typed preload IPC.
- `obs.scene.switch` is a guarded action routed by `ActionDispatcher`.
- The Control view can expose a standalone OBS Scenes section for manual scene switching when OBS is enabled.
- Preset-to-scene mapping belongs in automation workflows, not in the direct OBS integration phase.
- OBS connection failures return structured errors and must not affect PTZ control, active-camera validation, or camera command queues.
- OBS is not used as a preview backend.

## ADR-014: Keyboard Shortcuts Are Settings, Not Integrations

Status: accepted for Phase 4E.

Panevo treats built-in keyboard shortcuts as local operator preferences instead of integration entries. External devices such as HDZero radios, gamepads, joysticks, MIDI controllers, and HID button boxes remain optional integrations or device adapters.

Rationale:

- Keyboard shortcuts are part of Panevo's own operator UI and do not need discovery, external connection state, or plugin lifecycle labels.
- Operators need direct control over key mappings without opening the Integrations workflow.
- Hardware devices still need adapter-specific validation, stale-input handling, disconnect behavior, and optional mapping profiles.

Implementation constraints:

- Keyboard preferences are stored in `panevo-preferences.json`, separate from camera profiles and integration configuration.
- Settings owns the user-editable mapping UI and prevents duplicate enabled key assignments.
- Global preset shortcut bindings must include Alt or Ctrl. Foreground Control-view bindings may use direct keys because they only run while Panevo has focus and can observe key release.
- Settings provides a kill switch to disable all keyboard shortcut handling.
- Preset shortcuts are registered globally in the main process and dispatch normalized Panevo actions through `ActionDispatcher`.
- PTZ movement, zoom, and stop remain foreground Control-view shortcuts because they need reliable keydown/keyup behavior.

## ADR-015: Input Devices Use Control Devices Mapping Profiles

Status: accepted for Phase 4E.2.

Panevo treats gamepad/joystick-style devices as optional Input Device integrations. The integration setup only selects the device. Mapping, deadman assignment, live input monitoring, and profile management happen in the dedicated Control Devices view.

Rationale:

- Device selection and mapping are different operator tasks. Keeping setup limited to device selection makes the integration dialog calmer and avoids pretending every device can be fully configured up front.
- Browser Gamepad API devices can expose live axes and buttons in the renderer, but camera commands must still route through normalized Panevo actions.
- Continuous PTZ and zoom control needs a deadman gate and reliable stop behavior on release, disconnect, blur, and view unmount.

Implementation constraints:

- Input-device mappings are stored locally on the integration entry as mapping profiles.
- Unknown devices start inert until the operator assigns axes/buttons and a deadman input.
- Pan, tilt, speed-based zoom, zoom buttons, and stop dispatch through `ActionDispatcher`.
- Absolute zoom position mapping is deferred because current hardware validation was choppy and unreliable.
- Active-camera selection and preset recall mappings remain future scope.

## ADR-016: Keep Local VISCA for Current Compatibility Scope

Status: accepted for Phase 2E.

Panevo keeps its source-owned VISCA command construction and UDP transport for the current Tenveo workflow. A third-party VISCA package should not be adopted until it solves a concrete problem that the local adapter does not solve.

Rationale:

- The currently validated command surface is narrow and already covered by Panevo's `ViscaClient`, command builders, queueing, speed clamps, and action-dispatch path.
- Reviewed Node/TypeScript VISCA packages do not provide a clearly lower-risk replacement for the current Tenveo/UDP path.
- The local implementation is already isolated from renderer, preload, IPC, and integration code.
- Adding a dependency before there is a protocol gap would increase packaging and maintenance risk without improving operator behavior.

Implementation constraints:

- Renderer and integrations must continue to call Panevo-level actions, not VISCA packets or package APIs.
- Any future package must stay behind `ViscaClient` or a replacement service with the same Panevo-level behavior.
- TCP VISCA remains deferred until real hardware validation shows that it works and improves reliability, feedback, or camera compatibility.
- Vendor-specific behavior should be represented as camera-profile capabilities and service-layer adapter behavior, not UI conditionals.
- Preset delete remains local-only for VISCA unless a verified vendor-specific delete path is added behind a dedicated provider.

## ADR-017: Normalize RotorHazard Race State Behind a Transport Adapter

Status: accepted for Phase 4F.

Panevo should integrate RotorHazard behind a main-process transport adapter that emits Panevo-level race state and race events. The first transport should be RotorHazard's existing Socket.IO server. A custom RotorHazard plugin should only be added if the built-in live socket surface does not expose the race state, lifecycle events, or payload stability Panevo needs.

Rationale:

- RotorHazard already runs Flask-SocketIO for its own UI updates, so Panevo can listen to the same live race-state channel before requiring users to install a custom plugin.
- Race lifecycle events need a live event source. Socket.IO is the Phase 4F transport for timing-sensitive automation triggers.
- A main-process Socket.IO client keeps the renderer decoupled from RotorHazard payloads while still letting Panevo normalize race concepts.
- A transport adapter keeps Phase 4H automation independent from whether events came from built-in RotorHazard Socket.IO events or a future RotorHazard plugin.
- Keeping Phase 4F read-only avoids accidental race-management side effects during live production.

Implementation constraints:

- Panevo's Electron main process owns the `services/rotorhazard` connection boundary.
- Renderer code must consume Panevo-level race state and integration status, not RotorHazard Socket.IO payloads.
- Automation rules must consume Panevo race events such as `race.staging`, `race.started`, `race.finished`, `race.done`, `race.lap-recorded`, `race.active-heat-changed`, and `race.data-stale`.
- The Phase 4F scope is read-only: current race state, active heat, pilot/lane/channel metadata, lifecycle events, and stale/disconnect state.
- RotorHazard disconnect or stale data should pause future race-aware automation but must not block manual PTZ, presets, stop, OBS, or camera configuration.
- HTTP polling is not a fallback path for RotorHazard race state or lifecycle events.
- A RotorHazard plugin remains the explicit next design option if the built-in Socket.IO surface is not stable or complete enough for Panevo's normalized race event model.
- If a RotorHazard plugin is added, it should use RHAPI inside RotorHazard and publish Panevo-namespaced Socket.IO events from the RotorHazard server. Panevo should remain the connecting client instead of requiring inbound connections to the Panevo desktop app.
