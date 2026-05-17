# Tenveo Hardware Notes

The first target camera for Panevo is a Tenveo PTZ camera controlled over VISCA over IP.

This document records observed behavior. It should be updated after real hardware tests. Do not treat unverified assumptions as confirmed behavior.

## Current Assumptions

- VISCA over IP protocol: UDP.
- Default VISCA port: `52381`.
- ONVIF HTTP port observed on the tested camera: `8080`.
- Camera is configured manually by IP address.
- Preview is handled outside Panevo during MVP testing.
- Mock mode remains the default development path when hardware is unavailable.
- Pan speed range: `1-24`.
- Tilt speed range: `1-24`.
- Zoom speed range: `1-8`.
- Panevo exposes a dynamic local preset list that maps to camera preset numbers.
- Panevo currently treats UI preset numbers as direct VISCA preset values.
- VISCA is the preferred default live control route for this tested Tenveo workflow because it feels more direct than ONVIF PTZ movement.
- ONVIF is the preferred discovery/sync route for this camera, including device identity and numeric scene preset synchronization.

## Confirmed Behavior

The following items should be checked only after testing against a real Tenveo camera:

- [x] Basic UDP VISCA commands can control the camera.
- [x] Pan controls work.
- [x] Tilt controls work.
- [x] Diagonal movement works.
- [x] Zoom controls work.
- [x] Preset recall works.
- [x] Preset store works.
- [x] Stop command behavior is safe across repeated tests.
- [x] Zoom stop behavior is safe across repeated tests.
- [x] Presets can be added.
- [x] Presets can be removed.
- [x] Presets can be renamed.
- [x] Presets can be called.
- [x] ONVIF endpoint is exposed on port `8080`.
- [x] ONVIF pan controls work.
- [x] ONVIF tilt controls work.
- [x] ONVIF diagonal movement works.
- [x] ONVIF zoom controls work.
- [x] ONVIF stop behavior is safe across repeated tests.
- [x] ONVIF preset recall works with numeric Panevo preset entries.
- [x] ONVIF preset store works with numeric Panevo preset entries.
- [x] VISCA live control works while ONVIF sync is enabled.
- [x] ONVIF preset sync rebuilds numeric preset entries after app restart.
- [x] ONVIF `RemovePreset` removes camera-native presets when `syncProtocol` is `onvif`.

## Open Questions

- What practical maximum preset range should Panevo expose by default?
- Does the camera send useful ACK/completion packets over UDP?
- Does TCP VISCA work on this model, and does it provide a concrete benefit over the validated UDP route?
- Does ONVIF probing on port `8080` require credentials for device information, PTZ nodes, or preset discovery?
- Does ONVIF ContinuousMove behave consistently at Panevo's mapped speed ranges?
- Do ONVIF preset tokens match numeric preset numbers, or does Panevo need preset token discovery before using ONVIF presets safely?
- Does ONVIF expose focus control through imaging or PTZ services on this model?
- Are there model-specific quirks for diagonal movement?
- How should Panevo map camera-native preset rename/delete operations into local preset entries?

## Hardware Test Log

Add dated test notes here.

### 2026-05-11

- Camera model: Tenveo PTZ camera.
- Firmware: not recorded.
- Network setup: local network, VISCA UDP on `52381`, ONVIF on `8080`.
- Panevo version or commit: Phase 2D stabilization branch/worktree.
- Tested commands: VISCA PTZ, zoom, focus, stop, emergency stop, ONVIF probe, ONVIF startup sync, ONVIF numeric preset import/store/remove.
- Results: VISCA remains the preferred live control route. ONVIF is suitable for discovery, credentials-backed startup sync, numeric preset synchronization, and camera-native preset removal.
- Issues: ONVIF PTZ movement works but feels less native/direct than VISCA on this camera, so it remains optional for live control.
- Follow-up: retry `npm run package` with working network access, record firmware/model details when available, and validate TCP VISCA only if UDP reliability or camera feedback becomes insufficient.

### YYYY-MM-DD

- Camera model:
- Firmware:
- Network setup:
- Panevo version or commit:
- Tested commands:
- Results:
- Issues:
- Follow-up:

## Safety Notes

- Always test new movement behavior at low speed first.
- Keep the camera in a clear movement area.
- Avoid unattended tests.
- If movement does not stop, disconnect network or power and record the failure.
