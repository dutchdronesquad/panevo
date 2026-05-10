# Architecture Decisions

This document records product and technical decisions that should guide future implementation. Update it when a decision is changed or superseded.

## ADR-001: Use Electron Forge as the Application Foundation

Status: accepted.

Panevo uses Electron Forge because it is an official Electron packaging and development route and gives the project a conventional desktop application foundation.

Implications:

- Main and preload entrypoints remain explicit.
- Packaging and makers are handled by Forge.
- Renderer tooling can still use Vite and React.

## ADR-002: Use React + Vite for the Renderer

Status: accepted.

Panevo uses React for the operator UI and Vite for fast renderer development.

Rationale:

- The MVP is a desktop control surface, not a server-rendered web application.
- React is sufficient for stateful UI controls and future component growth.
- Vite keeps the renderer development loop fast.

Non-choice:

- Next.js is not used because Panevo does not need routing, SSR, API routes, or server-rendered pages for the desktop MVP.

## ADR-003: Keep VISCA Behind Panevo's Own Client Interface

Status: accepted.

Renderer and IPC code call high-level methods such as `panLeft`, `zoomIn`, and `recallPreset`. They do not know about packet bytes or third-party VISCA APIs.

Rationale:

- VISCA implementations vary by vendor.
- The project may later adopt an npm package.
- The renderer should remain stable if command construction changes.

## ADR-004: Local VISCA Packet Construction Is Acceptable for MVP

Status: accepted for MVP.

The MVP command surface is small enough to implement locally while preserving clean module boundaries.

Future review:

- Reevaluate before adding ACK handling, retries, TCP support, or broad vendor compatibility.
- If a package is adopted, keep it behind `ViscaClient`.

## ADR-005: Manual Camera Configuration Remains Required

Status: accepted.

Camera discovery is deferred. Even after discovery exists, manual IP and port configuration must remain available.

Rationale:

- Broadcast networks often use VLANs, static IPs, and firewall rules.
- VISCA discovery is not universally reliable.
- Operators need deterministic setup paths.

## ADR-006: Preview Is Deferred Until After PTZ MVP

Status: accepted.

NDI and RTSP preview are explicitly out of scope for Phase 1.

Rationale:

- Preview can introduce native dependencies and packaging complexity.
- External preview tools such as OBS or NDI Studio Monitor are sufficient during PTZ MVP validation.
- Camera control should be reliable before preview is integrated.

## ADR-007: UI Framework Will Be Adopted Selectively

Status: accepted and active for Phase 2A.

Panevo will use `shadcn/ui` for generic UI primitives, preferably with Base UI or Radix primitives underneath where supported by the selected shadcn setup.

Rationale:

- Source-owned primitives fit the project's need for custom operator styling.
- A heavily opinionated UI framework risks making Panevo look like a generic admin tool.
- PTZ controls, dynamic preset lists, and operator surfaces should remain custom Panevo components.

Implementation constraints:

- Tailwind and shadcn should be introduced before Phase 2 camera profiles.
- Existing PTZ behavior must remain unchanged during the migration.
- Panevo-specific controls should not be forced into generic primitives.
- Design tokens should preserve the dark, technical, broadcast-oriented visual direction.
- Tailwind CSS v4 is the active styling baseline.
- shadcn components should be added through the shadcn CLI so generated component code remains aligned with the selected preset and registry.

## ADR-008: Integrations Are Deferred Until MVP Completion

Status: accepted.

OBS, RotorHazard, Stream Deck, Companion, Flexbar, and automation remain documented but not active implementation scope during Phase 2B stabilization. Camera discovery and ONVIF investigation are the next planned scope for Phase 2C after the Phase 2B hardware regression pass.

Rationale:

- The first product value is reliable camera control.
- Integrations depend on stable action concepts.
- Premature integration work can obscure hardware and safety issues.

## ADR-009: Keep Vite 8 With Electron Forge Compatibility Patches

Status: accepted.

Panevo uses Vite 8 so the renderer and shadcn/Tailwind v4 setup stay on the current toolchain. Electron Forge's Vite plugin may still emit preload output config intended for older Vite/Rollup behavior.

Implementation note:

- `vite.preload.config.ts` removes Forge's deprecated `inlineDynamicImports` output option from the resolved preload build config.
- The preload build explicitly uses `codeSplitting: false`, which is the Vite 8/Rolldown-compatible replacement.
- This keeps the preload bundle single-file without carrying deprecated build warnings.
