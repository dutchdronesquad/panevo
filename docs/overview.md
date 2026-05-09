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

## Product Principles

- Operator-first: controls must be fast, readable, and reliable during a live show.
- Modular architecture: UI, integrations, networking, and protocol details must remain separated.
- Hardware-tolerant: camera vendors vary, so protocol code should be isolated and adjustable.
- Local-first MVP: the initial app should run without cloud services and store configuration locally.
- Extensible by design: the MVP should not overbuild future features, but it must leave clear paths for them.

## MVP Scope

The first milestone is a PTZ control MVP for VISCA over IP, targeting a Tenveo PTZ camera.

Included:

- Camera connection settings
- Local JSON config storage
- VISCA over IP command transport
- Mock mode for development without hardware
- Pan, tilt, diagonal movement, and stop
- Zoom in, zoom out, and zoom stop
- Preset recall and preset store
- Electron IPC boundary between renderer and main process
- Basic command queueing
- Dark operator-focused UI

Excluded from the MVP:

- NDI preview
- RTSP preview
- Multi-camera switching
- OBS control
- RotorHazard integration
- Stream Deck or Companion plugins
- Automation workflow editor
- User accounts or cloud sync

## Documentation Intent

These documents are the project foundation for contributors and future AI-assisted development. They should prevent architectural drift by making the product direction, boundaries, and technical decisions explicit.

