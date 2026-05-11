# Panevo Documentation Index

This folder is the long-term project memory for Panevo. It exists to keep product direction, architecture, technical decisions, and MVP scope clear across contributors and future AI-assisted sessions.

## Start Here

- `overview.md`: product vision, scope, principles, and MVP discipline.
- `roadmap.md`: phased delivery plan and MVP completion criteria.
- `mvp-checklist.md`: operational checklist for tracking progress.
- `architecture.md`: process boundaries, source layout, IPC, services, and extension points.
- `visca.md`: VISCA over IP architecture, command strategy, queueing, package strategy, and discovery notes.
- `ui-ux.md`: visual direction, UI framework strategy, interaction rules, and operator-focused design guidance.
- `integrations.md`: future OBS, RotorHazard, operator-surface, stream discovery, and automation integrations.
- `preview.md`: current no-in-app-preview decision and ONVIF RTSP discovery scope.
- `onvif.md`: ONVIF package decision, probing scope, authentication notes, and failure modes.
- `development.md`: local development workflow, commands, conventions, and repo practices.
- `testing.md`: manual and technical validation strategy for the MVP.
- `tenveo-hardware.md`: Tenveo-specific hardware validation notes and open questions.
- `decisions.md`: architectural decisions and deferred choices.

## Documentation Rules

- Keep docs aligned with tested behavior.
- Record assumptions explicitly.
- Prefer updating existing decisions over burying conflicting guidance in new files.
- Use `mvp-checklist.md` to track Phase 1 progress.
- Keep future ideas documented, but do not treat them as active scope until the roadmap phase changes.
- If code behavior changes, update docs in the same task.

## Current Active Phase

The active phase is Phase 3: Stream Discovery and External Preview.

Current priority:

1. Keep in-app preview out of the active codebase.
2. Keep ONVIF RTSP stream discovery available for diagnostics and future integrations.
3. Keep external tools such as OBS, NDI Studio Monitor, or camera-native tooling responsible for video preview.
4. Validate that removing preview code does not affect PTZ control or ONVIF probing.

Still deferred:

- In-app video preview.
- Multi-camera preview grid.
- OBS control.
- RotorHazard integration.
- Stream Deck, Companion, and Flexbar integrations.
- Automation workflows.
- TCP VISCA, unless UDP is insufficient for the target camera.
- Replacing the local VISCA implementation with an npm package.
