# Roadmap

Panevo should grow in deliberate phases. The first phase is intentionally narrow: reliable PTZ control with a strong architecture foundation.

## Phase 1: PTZ MVP

- Electron + React + TypeScript app foundation
- Local camera configuration
- VISCA over IP command transport
- Mock mode
- PTZ direction controls
- Zoom controls
- Preset recall and store
- Command queueing foundation
- Operator-oriented dark UI

## Phase 2: Camera Operations

- Multi-camera profiles
- Per-camera preset labels
- Camera connection health checks
- Vendor-specific VISCA compatibility options
- Optional TCP VISCA support
- Import/export config
- Safer preset overwrite flows

## Phase 3: Production Integrations

- OBS scene and source integration
- RotorHazard race state integration
- Stream Deck and Companion support
- Race-aware shot presets
- Event-triggered camera actions

## Phase 4: Preview and Monitoring

- RTSP preview experiments
- NDI preview investigation
- Multi-camera preview grid
- Low-latency operator confidence views

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

