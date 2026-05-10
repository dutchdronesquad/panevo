# Panevo Overview

Panevo is a modern live production and PTZ control tool designed for race broadcasts, livestream operators, and camera automation workflows.

The first use case is drone racing livestream production for Dutch Drone Squad. The product direction is intentionally broader than that initial workflow: Panevo should become a flexible desktop control surface for live event production, camera automation, and race-aware broadcast operations.

## Vision

Panevo should help a small production crew operate cameras, production tools, and event-specific automation from a fast, reliable desktop application. It should feel closer to modern broadcast tooling than legacy CCTV software: technical, responsive, clean, and optimized for operators under time pressure.

The long-term platform should support:

- PTZ camera control
- Camera presets and shot recall
- Multi-camera operation
- OBS integration
- RotorHazard integration
- Stream Deck and Companion support
- Automation workflows
- Race-aware production controls
- Event triggers and operator workspaces

## Target Users

Primary users:

- Livestream operators who need fast camera control during an event.
- Race production crews operating with limited staff.
- Drone racing production teams that need repeatable shots and quick manual override.
- Technical directors who already use OBS, Companion, Stream Deck, RotorHazard, or similar tooling.

Secondary users:

- Camera operators who need a clean PTZ control surface.
- Event producers who want reusable control workflows.
- Open source contributors building integrations or camera support.

Panevo should assume that operators may be working under time pressure, in low-light environments, and with limited attention available for configuration details during a live show.

## Product Shape

Panevo is a desktop operator application. It should not become a generic web dashboard first. The desktop app can later expose APIs, companion integrations, or external control surfaces, but the primary experience is a local tool that keeps working in an event environment.

The product should eventually feel like a control room surface:

- Fast enough for live operation.
- Clear enough to read at a glance.
- Safe enough to trust around moving cameras.
- Flexible enough to support different event formats.

## Product Principles

- Operator-first: controls must be fast, readable, and reliable during a live show.
- Modular architecture: UI, integrations, networking, and protocol details must remain separated.
- Hardware-tolerant: camera vendors vary, so protocol code should be isolated and adjustable.
- Local-first MVP: the initial app should run without cloud services and store configuration locally.
- Extensible by design: the MVP should not overbuild future features, but it must leave clear paths for them.
- Manual override always wins: automation and integrations must never trap the operator.
- Tested behavior beats assumptions: hardware observations should be recorded in docs.
- Stable user intent API: UI and integrations should speak in actions, not protocol bytes.

## MVP Scope

The first milestone is a PTZ control MVP for VISCA over IP, targeting a Tenveo PTZ camera.

Included:

- Camera connection settings
- Local JSON config storage
- VISCA over IP command transport
- Mock mode for development without hardware
- Pan, tilt, diagonal movement, and stop
- Zoom in, zoom out, and zoom stop
- Focus auto/manual mode plus focus in/out controls
- Preset recall and preset store
- Electron IPC boundary between renderer and main process
- Basic command queueing
- Dark operator-focused UI

MVP success means a single configured Tenveo camera can be controlled reliably enough for early production testing, with mock mode still available for development without hardware.

## Current Product State

Phase 1, Phase 2A, Phase 2B, Phase 2C, and Phase 2D stabilization are complete. The active phase is Phase 2E: VISCA Compatibility.

The application now includes:

- Multi-camera profile management.
- Active camera selection with health checking.
- Per-camera preset entries.
- VISCA PTZ, zoom, focus, and preset control.
- ONVIF endpoint probing, preset sync, and ONVIF PTZ control.
- Separate live control and sync protocol selection.
- Connection status that distinguishes verified camera response from transport-only fallback.
- Import and export for local camera configuration.

Excluded from the MVP:

- NDI preview
- RTSP preview
- OBS control
- RotorHazard integration
- Stream Deck or Companion plugins
- Flexbar integration
- Broad camera autodiscovery
- Automation workflow editor
- User accounts or cloud sync

## Product Discipline

Panevo should grow in deliberate phases. Future capabilities such as preview, integrations, hardware surfaces, and automation should remain documented but deferred unless they directly support the current roadmap phase.

Progress through the MVP should be tracked in `docs/mvp-checklist.md`.

Current work should be evaluated with this question:

Does this make the operator workflow safer, more reliable, easier to test, or easier to ship for the active roadmap phase?

If the answer is no, document it as future scope and defer it.

## Success Metrics

Phase 1 success metrics:

- A contributor can run the app from README instructions.
- Mock mode works immediately after startup.
- A Tenveo camera can be configured by IP and port.
- Pan, tilt, diagonal movement, stop, zoom, and presets work from the UI.
- Operator safety behavior is predictable.
- Config persists across restarts.
- Docs explain tested behavior and open risks.

Longer-term success metrics:

- Operators can control multiple cameras without losing situational awareness.
- Integrations map to stable Panevo actions.
- Race-aware workflows reduce manual production effort without removing manual override.
- Preview, automation, and hardware surfaces remain optional capabilities rather than core blockers.

## Glossary

- PTZ: pan, tilt, and zoom camera control.
- VISCA: camera control protocol originally associated with Sony cameras and commonly implemented by PTZ vendors.
- VISCA over IP: VISCA commands sent over network transport, usually UDP or TCP.
- Mock mode: development mode where commands are logged or simulated without hardware.
- Operator surface: physical or virtual control surface, such as Stream Deck, Companion, or Flexbar.
- Preview: video confidence view from a camera, such as RTSP, NDI, or OBS-based monitoring.

## Documentation Intent

These documents are the project foundation for contributors and future AI-assisted development. They should prevent architectural drift by making the product direction, boundaries, and technical decisions explicit.
