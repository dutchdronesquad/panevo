# ONVIF

ONVIF support is part of Phase 2C. ONVIF is the preferred route for camera discovery, metadata, capability probing, and preset synchronization. VISCA remains the default live control route for the tested Tenveo workflow because it feels more direct during operation. ONVIF live control remains available for cameras where the ONVIF PTZ implementation performs well.

## Current Scope

Implemented:

- `src/main/services/onvif/onvif-service.ts`
- `src/main/ipc/onvif-ipc.ts`
- `window.panevo.probeOnvifCamera(input)`
- `window.panevo.discoverOnvifCameras(input)`
- Per-camera ONVIF probe action in the camera-management table
- Per-camera transient ONVIF probe state in the renderer
- ONVIF status display in the camera-management table
- Local-network ONVIF WS-Discovery from the camera-management table
- Assisted add-camera flow from ONVIF discovery results
- Assisted add-camera probing that can fill the device label and select ONVIF control when PTZ is reported
- ONVIF device information probe
- ONVIF capability summary
- ONVIF media profile summary
- ONVIF preset discovery through the active media profile
- Import of numeric ONVIF preset tokens into Panevo's preset list
- Automatic numeric ONVIF preset import when an ONVIF camera is added successfully
- Camera-native ONVIF preset removal through `RemovePreset`
- ONVIF PTZ node count
- Stored ONVIF username and password fields per camera profile
- `controlProtocol` selection per camera profile
- ONVIF PTZ control adapter through `OnvifPtzClient`
- Protocol-agnostic live routing through `CameraControlService`

Not implemented yet:

- Secure ONVIF credential storage through OS keychain or encrypted storage
- Automatic synchronization of opaque, non-numeric ONVIF preset tokens

## Package Decision

Panevo currently uses the `onvif` npm package behind internal service adapters:

- `OnvifService` for metadata, capabilities, profiles, and PTZ node probing.
- `OnvifPtzClient` for live PTZ, zoom, stop, focus, and preset calls.

Rationale:

- It provides an existing ONVIF SOAP client and discovery foundation.
- It avoids hand-writing SOAP envelopes during the first ONVIF investigation.
- It has a small dependency footprint for the current use case.
- It can be replaced later because renderer and IPC code receive Panevo-level types, not raw package objects.
- It is now the accepted Phase 2C route while ONVIF remains behind replaceable Panevo adapters.

Packaging note:

- The installed package version is `0.8.1`.
- Its direct runtime dependency is `xml2js`.
- There are no native runtime dependencies in the installed package, so Electron packaging risk is lower than preview-oriented libraries.
- The package currently emits a Node deprecation warning because it uses the legacy `url.parse()` API internally. This warning is from the dependency, not Panevo's code. Treat it as acceptable during Phase 2C probing, but reevaluate before shipping ONVIF as a polished production feature.
- The package is intentionally isolated. If maintenance, protocol coverage, packaging, or security concerns become unacceptable, Panevo should replace the adapter internals with a local SOAP client without changing renderer-facing APIs.

## Probe Input

The main-process probe accepts:

- `ipAddress`: required camera host or IP address.
- `port`: optional ONVIF HTTP port.
- `username`: optional ONVIF username.
- `password`: optional ONVIF password.
- `timeoutMs`: optional timeout, clamped between `1000` and `30000`, default `5000`.

The probe uses `preserveAddress: true` so service calls keep using the configured address instead of blindly following camera-reported service addresses. This is safer on production networks where cameras may report addresses that are not reachable from the operator workstation.

Camera profiles store ONVIF port separately from the VISCA port. The tested Tenveo camera exposes ONVIF on port `8080`, so Panevo's new camera profile default is `8080`. The lower-level probe service still accepts an explicit port so future camera models can use their own ONVIF endpoint.

The camera-management UI probes the configured `ipAddress:onvifPort` and supports ONVIF identity authentication input:

- `onvifUsername` is stored in the camera profile.
- `onvifPassword` is currently stored in the local camera profile.

This keeps ONVIF probing and ONVIF live control usable after app restart. For Phase 2C this is a documented local plain-config mode, not the final production security model. Before ONVIF is treated as polished production scope, move credentials to OS keychain storage or another explicit secure-storage strategy.

## Probe Output

The renderer receives a normalized `OnvifProbeResult`:

- `reachable`
- `ipAddress`
- `port`
- `checkedAt`
- `message`
- `device`
- `capabilities`
- `profiles`
- `presets`
- `ptzNodeCount`

This result is intentionally not a `CameraProfile`. ONVIF metadata can help create or enrich a Panevo camera profile later, but it should not overwrite VISCA configuration automatically.

## Renderer Usage

The camera-management view keeps the latest ONVIF probe result in renderer state per camera profile. This is intentionally transient:

- It shows whether ONVIF is `Verified`, `Unavailable`, or `Not probed`.
- It displays the latest known device identity in the table after a successful probe.
- It automatically refreshes after saving ONVIF endpoint or credential changes.
- It is rebuilt automatically after app startup for cameras with an ONVIF control route or stored ONVIF credentials.
- It resets when config is imported or relevant ONVIF profile settings change, then probes again where possible.
- It does not write camera-discovered metadata back into the local config automatically.
- It imports numeric preset tokens automatically during successful ONVIF camera creation and can also import them explicitly from the probe dialog.
- This preset import capability is ONVIF-specific. VISCA profiles can still recall and store preset numbers, but they cannot generically import a camera preset list or camera preset names.

The ONVIF probe dialog presents:

- Camera endpoint and authentication fields.
- Manufacturer/model identity when available.
- Firmware, serial, PTZ node count, and media profile count.
- High-level capability chips.
- Media profile rows with PTZ/source/encoder flags.
- Preset rows when the camera reports preset tokens.
- A numeric preset import action when tokens can be mapped to Panevo preset numbers.

This gives the operator setup confidence and helps decide whether a camera should use VISCA or ONVIF as its live control route.

The ONVIF discovery dialog uses WS-Discovery to find local-network ONVIF endpoints. Discovered devices are not added blindly. When the operator chooses `Test and add`, Panevo creates a proposed ONVIF camera profile and runs the same connection validation gate used by manual camera creation.

## ONVIF Control

Camera profiles include separate protocol choices:

- `controlProtocol`: selected live control adapter. `visca` is the default. `onvif` can be selected when ONVIF movement is reliable for a camera.
- `syncProtocol`: selected discovery, identity, capability, and preset-sync adapter. `onvif` is the default. `none` keeps Panevo presets fully local.

Renderer and preload APIs stay protocol-agnostic. Buttons still call Panevo-level actions such as `panLeft`, `zoomIn`, `stop`, and `recallPreset`. The main-process `CameraControlService` chooses the active adapter from the selected camera profile.

Implemented ONVIF control methods:

- Continuous pan/tilt movement.
- Diagonal movement.
- Zoom in and zoom out.
- Stop movement and stop zoom.
- Focus auto/manual mode through ONVIF Imaging.
- Focus in/out and focus stop through ONVIF Imaging move commands.
- Preset recall.
- Preset store.
- Preset removal through ONVIF `RemovePreset`. This is also used when live control is VISCA but the camera profile has `syncProtocol: onvif`.
- ONVIF health check through the same selected-control route.

Current ONVIF control constraints:

- ONVIF PTZ uses normalized speed values from `-1` to `1`, while VISCA uses camera-specific numeric ranges. Panevo maps the existing UI ranges into ONVIF normalized values.
- ONVIF preset recall/store/remove currently maps Panevo preset number `N` to ONVIF preset token string `"N"`. ONVIF preset import only imports numeric tokens for now. Cameras with opaque preset tokens need an explicit token-to-local-preset mapping before they can be synchronized safely.
- Editing an ONVIF preset label uses the same camera-native preset write path as storing a preset. This keeps Panevo and the camera aligned, but vendors may treat `SetPreset` as a position update as well as a name update.
- ONVIF focus uses the Imaging service, not the PTZ service. Some cameras may expose ONVIF PTZ but reject Imaging focus calls.
- Panevo maps Focus In to positive continuous focus speed and Focus Out to negative continuous focus speed. This may need a camera-profile mapping if a vendor reports the direction inverted.
- ONVIF behavior should still be validated per camera model because vendors vary in PTZ, focus, and preset token behavior.

## Authentication

ONVIF authentication varies by camera and firmware.

Expected cases:

- Some cameras allow unauthenticated device/time/capability calls.
- Some cameras require credentials for most useful calls.
- Some cameras use the same credentials as the web UI.
- Some cameras require enabling ONVIF or creating a dedicated ONVIF user in the camera web UI.

Panevo currently supports username/password during probing and live ONVIF control. Both are stored in the local JSON camera profile so ONVIF control can authenticate after app restart.

Security direction:

- Plain JSON password storage is the documented Phase 2C mode so probing and control continue after restart.
- Do not treat plain JSON password storage as production-ready outside trusted development and controlled operator machines.
- Before release-quality ONVIF support, move ONVIF passwords to OS keychain storage, encrypted local storage, or a clearly documented opt-in plain-config mode.
- Import/export config should eventually redact or separately handle stored credentials.

## Failure Modes

Common ONVIF probe failures:

- Wrong ONVIF port.
- ONVIF disabled on the camera.
- Camera reachable through VISCA but not through ONVIF.
- Credentials required or invalid.
- Camera reports service URLs that are not reachable from the workstation.
- Firewall, VLAN, or multicast restrictions.
- Camera supports ONVIF device/media calls but not PTZ calls.
- Camera supports ONVIF probing but rejects live PTZ movement.
- Camera uses preset tokens that do not match Panevo's numeric preset entries.
- Vendor-specific response shapes or incomplete ONVIF implementation.

Panevo should treat these as setup diagnostics. ONVIF failure should not disable manual VISCA setup or existing VISCA control.

## Known Dependency Warning

Electron/Node may print:

```text
[DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications.
```

Observed source:

- `node_modules/onvif/lib/cam.js`
- `node_modules/onvif/lib/discovery.js`
- `node_modules/onvif/promises/discovery.js`

This does not mean the ONVIF probe failed. It means the current ONVIF package uses a deprecated Node URL parser internally when reading ONVIF service URLs. Do not suppress this globally. If the warning becomes noisy or blocks packaging confidence, the next options are:

- Check whether a newer `onvif` package release has migrated to the WHATWG `URL` API.
- Submit or carry a focused upstream patch.
- Replace the ONVIF package behind `OnvifService`.
- Implement a smaller local SOAP client for only the ONVIF calls Panevo needs.

## Next Steps

1. Validate ONVIF discovery on the real production network, especially VLAN and firewall behavior.
2. Validate numeric ONVIF preset import against the Tenveo camera.
3. Investigate explicit mapping for opaque ONVIF preset tokens.
4. Move ONVIF passwords out of plain local JSON before production release scope.
5. Reevaluate the `onvif` package before ONVIF is treated as release-polished.
