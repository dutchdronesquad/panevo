# Panevo Documentation Index

This folder is the long-term project memory for Panevo. It exists to keep product direction, architecture, technical decisions, and MVP scope clear across contributors and future AI-assisted sessions.

## Start Here

Product:

- `product/overview.md`: product vision, scope, principles, and MVP discipline.
- `product/roadmap.md`: phased delivery plan and MVP completion criteria.
- `product/mvp-checklist.md`: operational checklist for tracking progress.
- `product/decisions.md`: architectural decisions and deferred choices.

Architecture:

- `architecture/architecture.md`: process boundaries, source layout, IPC, services, and extension points.
- `architecture/development.md`: local development workflow, commands, conventions, and repo practices.
- `architecture/testing.md`: manual and technical validation strategy for the MVP.

Hardware and protocols:

- `hardware/visca.md`: VISCA over IP architecture, command strategy, queueing, package strategy, and discovery notes.
- `hardware/onvif.md`: ONVIF package decision, probing scope, authentication notes, and failure modes.
- `hardware/tenveo-hardware.md`: Tenveo-specific hardware validation notes and open questions.

UI:

- `ui/ui-ux.md`: visual direction, UI framework strategy, interaction rules, and operator-focused design guidance.

Integrations:

- `integrations/integrations.md`: future OBS, RotorHazard, operator-surface, stream discovery, and automation integrations.
- `integrations/integration-use-cases.md`: minimum useful operator workflows for OBS, RotorHazard, Companion, Stream Deck, Flexbar, physical controls, and automation.
- `integrations/preview.md`: current no-in-app-preview decision and ONVIF RTSP discovery scope.

Project:

- `project/open-source-readiness.md`: repository readiness, README direction, CI, labels, Renovate, and release automation.
- `project/release-packaging.md`: Electron Forge packaging strategy, app icon assets, platform release checks, and signing requirements.

## Documentation Rules

- Keep docs aligned with tested behavior.
- Record assumptions explicitly.
- Prefer updating existing decisions over burying conflicting guidance in new files.
- Use `product/mvp-checklist.md` to track progress.
- Keep future ideas documented, but do not treat them as active scope until the roadmap phase changes.
- If code behavior changes, update docs in the same task.

## Current Active Phase

The active phase is Phase 4C: OBS Integration.

Current priority:

1. Keep OBS routed through the isolated main-process adapter and typed preload IPC.
2. Keep integrations routed through normalized Panevo actions instead of renderer or protocol internals.
3. Preserve active-camera validation, command queues, speed clamps, and stop behavior through the action dispatcher.
4. Treat automation actions as defined but unsupported until their adapter phase starts.

Still deferred:

- In-app video preview.
- Multi-camera preview grid.
- OBS control.
- RotorHazard integration.
- Stream Deck, Companion, Flexbar, and physical operator control integrations.
- Automation workflows.
- TCP VISCA, unless UDP is insufficient for the target camera.
- Replacing the local VISCA implementation with an npm package.
