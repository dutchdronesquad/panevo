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

## UI Framework Direction

Panevo should use a small, composable UI foundation rather than a heavily opinionated application framework.

The preferred direction is:

- Use `shadcn/ui` selectively for generic interface primitives.
- Prefer the `shadcn/ui` Vite setup when the project adopts it.
- Use Base UI or Radix primitives as the accessible headless behavior layer.
- Use Tailwind CSS or explicit Panevo design tokens for styling.
- Continue using `lucide-react` for icons.
- Keep Panevo-specific operator controls custom.

This means `shadcn/ui` should be treated as source-owned component scaffolding, not as a visual theme to copy wholesale. Panevo should avoid the default SaaS/admin look and instead apply its own broadcast/operator styling.

Good candidates for shared UI primitives:

- Button
- Dialog and Alert Dialog
- Select
- Switch
- Slider
- Tooltip
- Tabs
- Dropdown Menu
- Popover
- Toast or Sonner notifications

Panevo-specific components should remain custom:

- PTZ directional pad
- Zoom controls
- Preset grid
- Connection status surface
- Camera bank controls
- Operator workspaces
- Race-aware production controls

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
