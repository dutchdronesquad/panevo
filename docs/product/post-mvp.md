# Post-MVP Scope

This document tracks useful work that is intentionally outside the current MVP checklist. These items should stay here until Panevo has a concrete target workflow, hardware or integration surface, and validation path.

The order below is priority order. It favors work that builds directly on the current automation and action-layer foundation before lower-confidence hardware, preview, or transport work.

Use `docs/product/mvp-checklist.md` for active delivery tracking and `docs/product/roadmap.md` for high-level phase direction.

## Post-MVP Phase 1: Multi-Camera Automation Targeting

Status: deferred post-MVP.

- [ ] Add optional per-action camera targeting so automation can control a named camera instead of only the current active camera.
- [ ] Keep `"Active camera"` as the default target for backward compatibility and operator predictability.
- [ ] Add `cameraId?: string` to camera-dependent Panevo actions without requiring a migration for existing rules.
- [ ] Resolve targeted cameras in `ActionDispatcher` without bypassing speed clamps, command queues, stop behavior, emergency stop, or protocol-specific adapters.
- [ ] Update automation guards so camera-dependent actions validate their own target camera, not just whether any active camera exists.
- [ ] Add a camera selector to the automation builder "Then" step for camera and preset actions.
- [ ] Populate preset choices from the selected camera when a rule targets a specific camera.
- [ ] Show targeted camera names in rule summaries so operators can see which hardware a rule may move.
- [ ] Fail clearly with an `ACTION_CAMERA_NOT_FOUND` style result if a rule targets a deleted camera profile.
- [ ] Add focused tests for active-camera fallback, explicit camera targeting, missing camera handling, preset selection, and stop-overrides-automation behavior.

## Post-MVP Phase 2: Automation Event Inputs and OBS Workflows

Status: deferred post-MVP.

- [ ] Add manual action bridge triggers only after their event semantics are explicit.
- [ ] Add OBS state triggers only after the automation event model can represent source, scene, and connection-state changes cleanly.
- [ ] Add control-device input triggers only after device events can be normalized safely.
- [ ] Provide preset-to-scene behavior as explicit automation templates, not hidden preset side effects.
- [ ] Define failure behavior when a camera action succeeds but an OBS action fails, or the reverse.
- [ ] Show last run result, action ordering, and partial failure state clearly to the operator.
- [ ] Add rule run history and diagnostics for multi-step workflows.
- [ ] Add focused tests for mixed camera, OBS, manual bridge, and control-device automation workflows before treating them as release-ready.

## Post-MVP Phase 3: Expanded Control Device Adapters

Status: deferred post-MVP.

- [ ] Validate whether an HDZero radio exposes a standard Gamepad, HID, MIDI, serial, Bluetooth, or other usable input path.
- [ ] Add MIDI support only after a concrete controller and mapping workflow are validated locally.
- [ ] Add custom HID, serial, or Bluetooth adapters only after disconnect, stale-input, and permission behavior are understood.
- [ ] Add button or switch mappings for active-camera selection and preset recall after feedback and confirmation UX is designed.
- [ ] Define per-device calibration, profile import/export, and safe defaults for unknown devices.
- [ ] Preserve deadman gating, stop-on-release, app-blur stop, disconnect stop, speed clamps, command queues, and active-camera validation.
- [ ] Document hardware-specific validation notes for every supported device class.

## Post-MVP Phase 4: Companion and Stream Deck Action Bridge

Status: deferred post-MVP.

- [ ] Decide whether first support is a local HTTP/WebSocket action bridge, a Companion module, a Stream Deck plugin, or documented keyboard shortcuts.
- [ ] Expose safe Panevo actions for external triggering.
- [ ] Support active camera selection.
- [ ] Support explicit camera targeting if Post-MVP Phase 1 has introduced it.
- [ ] Support preset recall.
- [ ] Support emergency stop.
- [ ] Support guarded preset store.
- [ ] Provide basic feedback for active camera, targeted camera, connection state, and last action result.
- [ ] Prevent external triggers from bypassing safety checks.
- [ ] Document setup and supported action IDs.

## Post-MVP Phase 5: Advanced Automation Editor

Status: deferred post-MVP.

- [ ] Decide whether Panevo needs a freeform workflow editor beyond constrained `When / If / Then` rules.
- [ ] Define the safe subset of triggers, conditions, delays, branches, retries, and multi-camera actions before building a visual editor.
- [ ] Define import/export behavior for automation rules with camera, preset, OBS, and integration references.
- [ ] Keep user scripting, arbitrary custom conditions, and timeline/rundown editing out of scope until a separate product decision reopens them.
- [ ] Preserve stop-overrides-automation and active-camera or targeted-camera validation for every generated workflow.

## Post-MVP Phase 6: In-App Preview Backends

Status: deferred post-MVP.

- [ ] Reconfirm that in-app preview solves a concrete operator problem that external tools do not solve.
- [ ] Decide whether the first backend should be RTSP, NDI, OBS program/preview monitoring, or a helper-process bridge.
- [ ] Define latency, CPU/GPU, audio, and multi-camera expectations before adding playback code.
- [ ] Evaluate packaging impact for native media runtimes such as NDI SDK, FFmpeg, GStreamer, or WebRTC gateways.
- [ ] Define credential handling for RTSP URLs without storing secrets in reusable preview strings.
- [ ] Keep preview failures isolated from PTZ, presets, stop, discovery, and automation.
- [ ] Document hardware validation requirements for each supported backend.

## Post-MVP Phase 7: Flexbar Investigation

Status: deferred post-MVP.

- [ ] Confirm whether Flexbar exposes an SDK, plugin API, local protocol, shortcut bridge, or macro bridge.
- [ ] Decide whether Panevo integrates directly or through generic action triggers.
- [ ] Define a compact touch-strip action layout for active camera, explicit camera targets, presets, stop, zoom, OBS actions, and race cues.
- [ ] Define feedback requirements for labels, colors, active camera, targeted camera, and connection state.
- [ ] Document macOS and Windows packaging or permission implications.
- [ ] Avoid Flexbar-specific concepts in Panevo core.

## Post-MVP Phase 8: VISCA Transport and Library Reassessment

Status: deferred post-MVP.

- [ ] Validate TCP VISCA against real hardware before implementing it.
- [ ] Define the concrete benefit TCP must provide over the current UDP route, such as ACK/completion feedback, reliability, or camera compatibility.
- [ ] Evaluate third-party VISCA packages only if they solve a demonstrated problem in Panevo's current local implementation.
- [ ] Keep any package or transport replacement behind the existing main-process camera-control boundary.
- [ ] Preserve command queueing, speed clamps, stop behavior, emergency stop, and active-camera validation during any transport change.
- [ ] Add compatibility tests and hardware notes before promoting a new VISCA transport or package path.
