# Future Integrations

Panevo's MVP only implements PTZ control. Future integrations should be added as separate services with clear IPC contracts and renderer-facing abstractions.

## OBS

Potential features:

- Scene switching
- Source visibility
- Recording and streaming state
- Scene-aware camera presets
- Production macros

OBS integration should likely use obs-websocket and remain isolated in a dedicated main-process service.

## RotorHazard

Potential features:

- Race state monitoring
- Pilot and heat metadata
- Lap and gate event triggers
- Race-aware camera automation
- Overlay coordination

RotorHazard integration should avoid hard-coding Dutch Drone Squad assumptions into core Panevo concepts.

## Stream Deck and Companion

Potential features:

- External button surfaces for camera moves and presets
- Companion module support
- Stream Deck plugin investigation
- Status feedback on hardware keys

Panevo should expose stable action concepts before committing to a plugin API.

## Preview Systems

Potential features:

- RTSP preview
- NDI preview
- Multi-camera confidence grid
- Low-latency preview controls

Preview should be treated as a separate capability from camera control. It can introduce native dependencies, performance risks, and packaging complexity.

## Automation

Potential features:

- Trigger/action workflows
- Race event automation
- Scheduled camera moves
- Conditional actions
- Manual override controls

Automation must include operator safety constraints, clear state visibility, and quick cancellation.

