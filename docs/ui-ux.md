# UI and UX Direction

Panevo is an operator tool for live production environments. The UI should be dark, fast, readable, and practical under pressure.

## Visual Direction

Panevo should feel aligned with:

- OBS
- Bitfocus Companion
- vMix
- Stream Deck
- Blackmagic software
- Modern broadcast tooling

It should avoid the look and interaction model of old CCTV control panels.

## Principles

- Prioritize control clarity over decoration.
- Use large, reliable hit targets for PTZ controls.
- Maintain strong contrast for low-light production environments.
- Keep dense information readable, not noisy.
- Make states obvious: connected, disconnected, mock mode, errors.
- Design for future touch support.

## MVP Layout

The MVP should provide:

- Left or top-level application shell with Panevo identity
- Camera settings card
- Connection status
- PTZ directional pad
- Zoom controls
- Speed selector
- Preset grid

## Interaction Rules

PTZ movement buttons should behave like professional PTZ software:

- Pointer down starts movement.
- Pointer up stops movement.
- Pointer leave cancels movement.
- Touch start starts movement.
- Touch end stops movement.

Preset recall should be a normal click. Preset store should be separate and require confirmation before overwrite.

## Future UI Concepts

- Multi-camera tabs or banks
- Scene-aware camera presets
- Race-aware production panel
- Operator workspaces
- Integration status rail
- Config import/export
- Stream Deck style button pages

