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
- Prefer direct manipulation over nested configuration.
- Make dangerous actions visually distinct.
- Keep common live-operation controls visible without scrolling.
- Use concise labels and avoid explanatory text inside the main operating surface.

## Operator Context

Panevo may be used:

- In low-light production areas.
- On laptops with limited screen space.
- While operators are watching race footage or OBS output.
- With touch, mouse, trackpad, or future hardware control surfaces.
- Under time pressure where accidental movement matters.

The interface should therefore emphasize scanability, predictable hit targets, and immediate feedback.

## UI Framework Direction

Panevo should use a small, composable UI foundation rather than a heavily opinionated application framework.

This is the first active focus after the PTZ MVP. The UI foundation should be completed before camera profiles, ONVIF, or broader integrations are implemented.

The preferred direction is:

- Use `shadcn/ui` selectively for generic interface primitives.
- Prefer the `shadcn/ui` Vite setup when the project adopts it.
- Use Base UI or Radix primitives as the accessible headless behavior layer.
- Use Tailwind CSS or explicit Panevo design tokens for styling.
- Continue using `lucide-react` for icons.
- Keep Panevo-specific operator controls custom.

Adoption rules:

- Do not copy the default shadcn visual style wholesale.
- Do not introduce a marketing or SaaS dashboard feel.
- Use shadcn as source-owned scaffolding for primitives.
- Keep existing PTZ behavior unchanged during the migration.
- Add primitives only when they are immediately useful or clearly needed by upcoming Phase 2 work.

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
- Dynamic preset list
- Connection status surface
- Camera bank controls
- Operator workspaces
- Race-aware production controls

## Design Tokens

Panevo should maintain its own design tokens even if `shadcn/ui` is adopted later.

Token categories:

- Background surfaces.
- Elevated panels.
- Borders and dividers.
- Primary action color.
- Warning and danger colors.
- Connected, disconnected, mock, and error states.
- Focus rings.
- Control sizing.
- Spacing scale.

Avoid making the UI depend on one dominant color family. The app should be dark and technical, but not visually reduced to one blue or purple palette.

### Brand and Style Guide Direction

The renderer stylesheet should expose Panevo-owned semantic tokens first, then map shadcn/Tailwind compatibility tokens to those values. Component styles should consume the semantic `--panevo-*` tokens rather than new one-off hex values.

Core brand color:

- Signal Blue: `#3B8BEB`.
- Use Signal Blue for primary actions, selected navigation, focus rings, key operator emphasis, and compact brand marks.
- Do not use Signal Blue as a full-screen wash or dominant background. Panevo should stay dark and operational, with blue used as a signal.

Dark operator theme:

- Base shell: near-black operator surface.
- Panels: slightly lifted dark blue-gray surfaces.
- Controls: stronger dark blue-gray surfaces with clear hover and active states.
- Borders: low-contrast by default, stronger only for interactive affordances or selected states.
- Shadows: subtle and functional, used to separate panels rather than create decorative depth.

Status chips:

- Connected: green text/icon with restrained green background and border.
- Disconnected: neutral gray text/icon with neutral border.
- Mock mode: amber token family for simulated or non-hardware operation.
- Command error: red text/icon with restrained red background and border.
- Warning and danger colors should be distinct from Signal Blue and should never rely on color alone when used for destructive or safety-critical actions.

Typography:

- Use Inter first, followed by system UI fallbacks.
- Keep letter spacing at `0`; avoid dense broadcast UI becoming compressed or decorative.
- Use compact type scales: large headings for workspace identity only, smaller uppercase labels for panels, status metadata, and preset numbers.
- Prefer font weights around `650-750` for operator labels and state text instead of oversized text.
- Keep command labels short and scannable. Avoid instructional prose inside the live control surface.

Current CSS token anchors:

- `--panevo-signal-blue`
- `--panevo-surface-*`
- `--panevo-text-*`
- `--panevo-border-*`
- `--panevo-status-*`
- `--panevo-danger-*`
- `--panevo-warning-*`
- `--panevo-focus-ring`

## Component Rules

Generic primitives:

- Should live in `components/ui`.
- Should be source-owned and easy to restyle.
- Should not contain product-specific camera logic.

Panevo operator components:

- May use generic primitives.
- Should own domain-specific interaction behavior.
- Should prioritize reliability and clarity over generic reuse.
- Should include pointer/touch behavior where relevant.

Examples:

- `Button` is generic.
- `PresetButton` is product-specific.
- `Slider` is generic.
- `SpeedSelector` is product-specific.
- `Dialog` is generic.
- Preset overwrite confirmation is product-specific.

## MVP Layout

The MVP should provide:

- Left or top-level application shell with Panevo identity
- Camera settings card
- Connection status
- PTZ directional pad
- Zoom controls
- Speed selector
- Dynamic preset list

## Phase 2 Layout Direction

Panevo should use a sidebar navigation model once the app grows beyond one PTZ surface. This keeps live operation separate from configuration and prevents the main view from becoming a mixed settings/dashboard page.

Primary views:

- `Control`: live PTZ operation, zoom, active-camera status, emergency stop, and presets for the selected camera.
- `Cameras`: camera profile selection, camera connection settings, import/export, and profile metadata.

Rules:

- The `Control` view should stay optimized for livestream operation and avoid configuration clutter.
- The `Cameras` view may be denser and form-oriented because it is not the primary live-operation surface.
- The camera table should be a full-width management surface, not a nested settings card layout.
- Camera connection settings should open from row-level actions in a dialog.
- Adding a camera should happen through a dialog and should only commit the profile after a successful connection/probe test.
- Test connection belongs as a direct row action because it is a camera profile operation.
- Emergency stop and connection status should remain globally visible in the shell.
- Future integrations should become separate views or sidebar sections instead of being added to the control surface by default.
- `App.tsx` should remain state orchestration and view switching only; shell, header, and view composition should live in dedicated components.
- Live presets should be recall-first. Editing, storing, and deleting presets belong behind secondary actions and confirmation flows, not inline on every tile.

## Interaction Rules

PTZ movement buttons should behave like professional PTZ software:

- Pointer down starts movement.
- Pointer up stops movement.
- Pointer leave cancels movement.
- Touch start starts movement.
- Touch end stops movement.

Preset recall should be a normal click. Preset store should be separate and require confirmation before overwrite.

## Status and Feedback

Connection status should distinguish:

- Connected.
- Disconnected.
- Mock mode.
- Transport ready but camera response unverified.
- Command error.

Command feedback should be subtle but visible. It should not block the operator unless the action is destructive or safety-critical.

## Accessibility and Input

The MVP should support mouse and touch interaction patterns. Future keyboard support should be considered for:

- Emergency stop.
- Preset recall.
- Zoom stop.
- Switching camera banks.

Interactive elements should have accessible labels, visible focus states, and adequate target sizes.

## MVP UI Non-Goals

Do not add during Phase 1 unless required for safety or validation:

- Full theme editor.
- Complex layout editor.
- Marketing-style landing page.
- Video preview panels.
- Multi-camera preview dashboards.
- Automation workflow builder.

## Future UI Concepts

- Multi-camera tabs or banks
- Scene-aware camera presets
- Race-aware production panel
- Operator workspaces
- Integration status rail
- Config import/export
- Stream Deck style button pages
