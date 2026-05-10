# Panevo Documentation Index

This folder is the long-term project memory for Panevo. It exists to keep product direction, architecture, technical decisions, and MVP scope clear across contributors and future AI-assisted sessions.

## Start Here

- `overview.md`: product vision, scope, principles, and MVP discipline.
- `roadmap.md`: phased delivery plan and MVP completion criteria.
- `mvp-checklist.md`: operational checklist for tracking progress.
- `architecture.md`: process boundaries, source layout, IPC, services, and extension points.
- `visca.md`: VISCA over IP architecture, command strategy, queueing, package strategy, and discovery notes.
- `ui-ux.md`: visual direction, UI framework strategy, interaction rules, and operator-focused design guidance.
- `integrations.md`: future OBS, RotorHazard, operator-surface, preview, and automation integrations.
- `preview.md`: preview architecture, transport strategy, non-goals, and validation rules.
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

The active phase is Phase 2E: VISCA Compatibility.

Current priority:

1. Decide whether Panevo keeps its local VISCA implementation or evaluates a third-party VISCA package.
2. Document Tenveo VISCA quirks and possible camera-profile compatibility flags.
3. Decide whether TCP VISCA is useful for the tested camera.
4. Keep VISCA live control stable while ONVIF remains the sync/discovery route.
5. Prepare the preview architecture without coupling preview to camera control.

Still deferred:

- NDI preview.
- Multi-camera preview grid.
- OBS control.
- RotorHazard integration.
- Stream Deck, Companion, and Flexbar integrations.
- Automation workflows.
- TCP VISCA, unless UDP is insufficient for the target camera.
- Replacing the local VISCA implementation with an npm package.
