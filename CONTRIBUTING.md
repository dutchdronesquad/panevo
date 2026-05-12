# Contributing to Panevo

Thanks for your interest in contributing to Panevo.

Panevo is a desktop app for live production control, PTZ camera operation, and future race-production integrations. The project is still early, so focused contributions and clear validation notes are especially useful.

## Start Here

Before changing architecture or product direction, read:

- [docs/index.md](docs/index.md)
- [docs/product/roadmap.md](docs/product/roadmap.md)
- [docs/product/mvp-checklist.md](docs/product/mvp-checklist.md)
- [docs/architecture/architecture.md](docs/architecture/architecture.md)

## Development Setup

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Run standard checks:

```bash
npm run type
npm run lint
npm run format:check
```

## Pull Requests

- Keep pull requests focused.
- Update documentation when behavior, architecture, or roadmap scope changes.
- Mention hardware validation when camera behavior changes.
- Avoid unrelated formatting or refactors unless the PR is intentionally format-only.
- Do not bypass PTZ safety checks, command queues, typed IPC, or active-camera validation.

## Hardware Changes

Changes to VISCA, ONVIF, PTZ movement, zoom, focus, presets, or safety behavior should include:

- camera model
- firmware version when known
- protocol used
- what was tested
- what was not tested
- any difference between mock mode and real hardware

Record Tenveo-specific validation in [docs/hardware/tenveo-hardware.md](docs/hardware/tenveo-hardware.md).

## Documentation

Use [docs/index.md](docs/index.md) as the entrypoint.

- Product planning lives in `docs/product`.
- Architecture and development workflow live in `docs/architecture`.
- Camera and protocol notes live in `docs/hardware`.
- Integration planning lives in `docs/integrations`.

If a decision affects future architecture, update [docs/product/decisions.md](docs/product/decisions.md).
