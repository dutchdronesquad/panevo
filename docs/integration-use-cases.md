# Integration Use Cases

Panevo integrations should be designed from operator workflows, not from whichever API is easiest to call first. This document defines the minimum useful behavior for future integrations so the project can expand without losing the core live-production control focus.

## Integration Product Principles

- Integrations must map to Panevo actions and state, not directly to VISCA packets, ONVIF SOAP calls, or renderer component internals.
- Every integration is optional. Panevo camera control must still work when integrations are disabled, disconnected, or misconfigured.
- Integrations must have clear operator-visible connection status and failure states.
- Live-control safety wins over automation. Stop, disconnect handling, and manual override must remain available.
- The first version of an integration should be narrow, testable, and useful during a real production workflow.

## Shared Action Model

Future integrations should converge on a common action/event layer.

```text
External system or device
  -> integration adapter
  -> Panevo action layer
  -> CameraControlService / OBS service / automation service

Panevo state
  -> feedback layer
  -> UI / Companion / Stream Deck / Flexbar / physical controls
```

The first useful action set should include:

- Select active camera.
- Recall preset.
- Store preset with confirmation where appropriate.
- Stop movement.
- Pan, tilt, diagonal movement, and zoom.
- Set focus mode and focus in/out where supported.
- Trigger an OBS scene action.
- Enable or disable an automation profile.

The first useful feedback set should include:

- Active camera.
- Camera connection state.
- Control protocol.
- Current preset list.
- Last command status.
- Automation enabled/disabled state.
- Integration connected/disconnected state.

## OBS

### Operator Workflow

The operator wants camera actions and broadcast scene actions to stay aligned. For example, a race start might select a wide shot, switch OBS to the racing scene, and keep a fallback scene available.

### Minimum Useful Behavior

- Connect to OBS through obs-websocket.
- Test connection and show OBS status.
- Read the scene list.
- Switch to a selected scene.
- Optionally map a Panevo preset recall to an OBS scene switch.

### Not First Scope

- Rendering OBS preview inside Panevo.
- Full OBS source editor.
- Streaming/recording control as the first feature.
- Complex macro engine before the Panevo action layer exists.

### Failure Behavior

- OBS disconnect must not affect PTZ control.
- Scene switch errors should be visible but non-modal.
- Panevo should never assume a scene switch succeeded without confirmation from OBS.

## RotorHazard

### Operator Workflow

The race producer wants Panevo to react to race state. Examples include recalling a start-grid camera preset before race start, switching to finish-line framing near race end, or exposing pilot/heat data to automation.

### Minimum Useful Behavior

- Connect to a RotorHazard instance.
- Read current race state.
- Read active heat, pilots, and lane/channel metadata where available.
- Receive race lifecycle events such as staging, race start, race finish, and race done.
- Emit normalized race events into Panevo automation.

### Not First Scope

- Race management.
- Editing pilots, heats, rounds, or timing data.
- Hard-coding Dutch Drone Squad race assumptions into core Panevo models.
- Automatically moving cameras on race events without explicit operator configuration.

### Failure Behavior

- RotorHazard disconnect should pause race-aware automation.
- Manual PTZ and preset control must remain available.
- Stale race data must be labelled as stale or unavailable.

## Companion And Stream Deck

### Operator Workflow

Operators often use external button panels for fast, repeatable actions. Panevo should expose camera and production actions so those panels can drive common workflows without mouse interaction.

### Minimum Useful Behavior

- Recall preset.
- Select active camera.
- Stop movement.
- Store preset through a guarded action.
- Show active camera and connection feedback.
- Show preset labels and status where the surface supports it.

### Not First Scope

- Full Companion marketplace module release.
- Visual page designer inside Panevo.
- Multi-operator conflict resolution.
- Direct VISCA or ONVIF commands from Companion.

### Failure Behavior

- Loss of feedback channel must not block local UI control.
- Dangerous actions such as preset store need explicit confirmation or a protected mapping mode.
- Stop actions should remain easy to map and should not depend on current automation state.

## Flexbar

### Operator Workflow

Flexbar can act as a compact touch strip for camera banks, preset recall, zoom actions, race cues, and OBS shortcuts.

### Minimum Useful Behavior

- Investigate whether Flexbar exposes an SDK, local protocol, plugin system, shortcut mapping, or macro bridge.
- Define a Panevo action layout suitable for touch-strip interaction.
- Support active camera, preset recall, stop, and OBS scene actions if the integration path allows it.
- Provide simple visual feedback such as active camera, connected state, or selected page.

### Not First Scope

- Custom visual layout editor.
- Flexbar-only concepts in Panevo core.
- Proprietary protocol work before public integration options are understood.

### Failure Behavior

- Flexbar disconnect should leave Panevo local controls unchanged.
- Dynamic labels should fall back to static action labels when feedback is unavailable.

## Physical Operator Controls

This category covers physical input devices that can drive Panevo without mouse interaction.

Examples:

- HDZero radio connected over Bluetooth.
- Gamepad or joystick.
- MIDI controller.
- Keyboard shortcuts.
- Button boxes.
- Future generic HID devices.

HDZero radio is a useful concrete test case, but Panevo should not design a one-off `HDZero -> VISCA` path. The correct architecture is `device input -> normalized Panevo action -> CameraControlService`.

### Operator Workflow

The operator wants a physical control surface for PTZ movement, zoom, presets, and stop. A joystick or radio-style controller may feel more natural than a mouse when tracking race action.

### Minimum Useful Behavior

- Detect a connected input device through a standard OS/browser path where possible.
- Map axes to pan/tilt.
- Map buttons or switches to zoom, stop, and preset recall.
- Support a deadman/enable button for movement.
- Stop movement on disconnect, lost focus, or stale input.
- Store per-device mapping profiles locally.

### Recommended First Device Path

Prefer devices that expose themselves as a standard HID, gamepad, joystick, keyboard, or MIDI controller. Avoid reverse-engineering proprietary Bluetooth protocols unless there is no standard input path.

### Safety Requirements

- Dedicated operator controller only. Do not share a flight-control radio used by an active pilot.
- Movement must require an explicit enable/deadman condition.
- Input timeout must send stop.
- Disconnect must send stop.
- Active camera must be visible before physical input can move a camera.
- Axis curves, inversion, deadzone, and speed limits must be configurable.

### Not First Scope

- Proprietary HDZero protocol reverse engineering.
- Multi-controller conflict resolution.
- Full controller calibration UI.
- Wireless reliability guarantees.

### Failure Behavior

- Disconnect sends stop and marks the device unavailable.
- Stale input sends stop.
- Unknown devices start unmapped.
- Device input must never bypass Panevo's speed clamps or command queue.

## Automation Workflows

### Operator Workflow

The operator wants repeatable production behavior: race events, camera presets, scene switches, and manual overrides working together.

### Minimum Useful Behavior

- Simple trigger/action rules.
- Triggers from RotorHazard, OBS state, manual buttons, or device input.
- Actions through Panevo's shared action layer.
- Global automation enable/disable.
- Visible last-triggered rule and last action result.

### Not First Scope

- Node-based workflow editor.
- Timeline/rundown system.
- Multi-user collaborative automation.
- Unbounded scripting.

### Failure Behavior

- Failed actions must not block later manual control.
- Automation must be quickly disableable.
- Stop must override automation.
- Automation should not run against an unknown or disconnected active camera.

## Suggested Phase 4 Order

1. Define the Panevo action/event layer.
2. Add OBS connection and scene-list read-only state.
3. Add simple OBS scene switch action.
4. Add external action endpoint or Companion-friendly bridge for core camera actions.
5. Add physical input spike using standard Gamepad/HID or MIDI APIs.
6. Add RotorHazard read-only race state.
7. Add first guarded trigger/action automation.
8. Investigate Flexbar once the shared action and feedback model exists.
