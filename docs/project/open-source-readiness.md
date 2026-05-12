# Open Source Project Readiness

Panevo should be prepared as a usable open source desktop application, not only as a local prototype. This work should happen before larger integrations are built so contributors, users, and future maintainers have a clear project surface.

## Goals

- Make the repository understandable for end users and contributors.
- Make basic contribution and release workflows explicit.
- Add automation that catches common regressions before pull requests are merged.
- Keep dependency updates visible and reviewable.
- Make releases repeatable instead of ad hoc.

## Repository Essentials

Required before a public release:

- `LICENSE`
- User-friendly `README.md`
- Contributor-oriented development setup
- Linked documentation index
- Pull request template
- GitHub labels
- Renovate configuration
- Release Drafter configuration
- GitHub Actions for lint/type/package smoke checks

Recommended before wider contribution:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- Issue templates
- `SUPPORT.md`
- `FUNDING.yml` only if the project is ready to receive funding

## README Direction

The README should primarily serve end users and new contributors.

It should include:

- Product description.
- Current status.
- Supported/tested hardware.
- What Panevo can do today.
- What Panevo intentionally does not do yet.
- Screenshots or clearly marked screenshot placeholders.
- Development setup.
- Build/package instructions.
- Documentation links.
- Contribution status.

The README should not become the full architecture document. Detailed technical decisions belong in `docs/`.

## GitHub Automation

Initial workflows should be small and reliable:

- `lint`: run `npm run lint`
- `type`: run `npm run type`
- `package-smoke`: run Electron Forge package/build where practical

Packaging workflows may need platform-specific handling later because Electron packaging can depend on network access, native tooling, and signing requirements.

## Renovate

Renovate should be configured conservatively:

- Group minor and patch updates.
- Keep major updates separate.
- Avoid automerging major or Electron-related updates.
- Schedule updates so they do not create noise during active release work.
- Label dependency PRs consistently.

## Labels

Suggested first label set:

- `type: bug`
- `type: feature`
- `type: docs`
- `type: maintenance`
- `type: refactor`
- `area: camera-control`
- `area: onvif`
- `area: visca`
- `area: ui`
- `area: integrations`
- `area: packaging`
- `priority: high`
- `priority: normal`
- `priority: low`
- `status: needs-hardware`
- `status: blocked`

## Release Drafter

Release Drafter should group changes by user-facing intent:

- Features
- Fixes
- Hardware compatibility
- Documentation
- Maintenance
- Dependencies

Release notes should mention hardware validation status where relevant.

## Acceptance Criteria

This phase is complete when:

- A new user understands what Panevo is and how to run it from the README.
- A contributor can find architecture, roadmap, and setup docs quickly.
- CI catches lint and type errors.
- Dependency update PRs are structured and labelled.
- Release notes can be drafted consistently.
- Issue and PR templates guide useful reports instead of vague tickets.
