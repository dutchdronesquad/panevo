# Automation Builder

This document defines the implementation direction for the Phase 4H automation UI. The Automation view has runtime state, persisted rules, RotorHazard race-event triggers, and a constrained builder inspired by Home Assistant's automation model.

The goal is not a node editor. Panevo needs a predictable live-production rule builder with explicit trigger, condition, action order, safety, and failure behavior.

## Product Model

Automation rules should be presented as:

```text
When
  an event happens

If
  optional conditions match

Then
  run these actions in order
```

This maps directly onto the existing shared types:

- `AutomationRule.trigger` is `When`.
- `AutomationRule.conditions` is `If`.
- `AutomationRule.actions` is `Then`.
- `AutomationService.evaluate(...)` remains the runtime evaluator.
- `ActionDispatcher` remains the only path for rule actions that touch cameras, OBS, or future production tools.

## First Builder Scope

The first builder should support only the rule shapes the runtime and integrations already support well.

### When

Supported trigger source:

- RotorHazard race event.

The RotorHazard trigger source is selectable only when the RotorHazard integration is enabled/connected and has valid host/port settings. Existing saved RotorHazard rules remain visible with their stored trigger value when the source is unavailable, but new rules cannot choose a RotorHazard trigger until the source is available again.

Supported event values:

- `race.ready`
- `race.staging`
- `race.started`
- `race.finished`
- `race.done`
- `race.active-heat-changed`
- `race.data-stale`

`race.lap-recorded` is part of the shared event vocabulary, but should stay hidden until RotorHazard normalization emits it reliably.

### If

Supported conditions:

- `race.not-stale`
- `race.status` with `ready`, `staging`, `racing`, `finished`, `done`, or `stale`

New rule defaults:

- No trigger selected.
- No conditions selected.
- No actions selected.
- Rule label empty.
- Rule disabled.

The UI should make the structure clear with `When (trigger)`, `If (condition)`, and `Then (action)` labels instead of silently pre-filling a race-start workflow.

### Then

Supported actions:

- `preset.recall`
- `obs.scene.switch`
- `camera.stop`

Actions are ordered. The UI must let the operator move actions up/down. The runtime already stops a rule on the first failed action.

Preset actions should be configured by choosing a named preset from the active Panevo camera instead of entering a raw preset number. OBS scene actions should be configured by choosing a scene name from the enabled OBS integration instead of entering free text. Existing saved rules may still be shown with fallback labels when the current camera preset list or OBS scene list no longer contains that value.

The `Preset` add action is disabled when the active camera has no presets. The `OBS` add action is disabled when OBS is not enabled/connected or no scene list can be loaded. Existing saved preset or OBS actions remain visible through their stored fallback value so rules are not silently damaged by temporary configuration or connection state.

This is the general builder rule for external sources and targets: new trigger/action choices require the source or target to be available, while persisted values remain visible and preserved.

New rules should be empty and disabled by default. The operator must explicitly choose the trigger, any conditions, the action list, the per-rule enabled state from the rule list, and the global automation runtime.

## UX Direction

The Automation view should keep three top-level areas:

- Runtime summary: global enable/disable, pause reason, last-triggered rule, last action result.
- Rule list: rule label, enabled state, trigger/action summary, edit, delete.
- Rule builder dialog: add/edit a single rule.

The builder dialog should use flat sections with subtle separators, not nested cards:

```text
Rule
  Label

When (trigger)
  RotorHazard [Available / Not configured / Disabled / Unavailable]
  [RotorHazard race event select]

If (condition)
  Race data
    [Ignored / Required] [Not stale switch]
  Race status
    [Any status / Ready / Staging / Racing / Finished / Done / Stale]

Then (action)
  [No actions]
  [Action item 1: action type + up/down/delete]
    [named preset / OBS scene / stop target]
  [Action item 2: action type + up/down/delete]
    [fields]
  [+ Preset] [+ OBS] [+ Stop]
```

Avoid visible instructional prose in the app. Labels should be short and operational: `When (trigger)`, `If (condition)`, `Then (action)`, `Preset`, `OBS`, `Stop`, `Save`. Disabled add buttons should expose the reason through title/ARIA metadata instead of long inline copy. Per-rule enable/disable belongs in the rule list, not in the builder dialog.

## Implementation Slices

Do not replace the whole view in one patch. Implement this in small slices.

### Slice 1: Builder Draft Model

Status: implemented.

Add renderer-only draft helpers near the Automation view or in a local component module:

- `RuleDraft`
- `BuilderAction`
- `draftFromRule(rule)`
- `ruleFromDraft(draft)`
- `draftIsValid(draft)`
- `canEditRule(rule)`

Acceptance:

- No visible UI changes.
- `npm run type` stays green.
- Existing automation behavior is unchanged.

### Slice 2: Builder Dialog Shell

Status: implemented.

Add a `RuleBuilderDialog` component that renders:

- Rule label.
- `When` card with RotorHazard event select.
- `If` card with not-stale switch and status select.
- `Then` card with action rows.

The dialog can manage draft state locally, but it should call `onSave(rule)` and `onClose()` from the parent.

Acceptance:

- Dialog can open with a new draft.
- Dialog can open from an existing editable rule.
- Save button is disabled until draft is valid.
- No persistence behavior changes yet.

### Slice 3: Wire Dialog Into AutomationView

Status: implemented.

Replace the template controls with:

- `New rule` button.
- `Edit` button per editable rule.
- Existing per-rule enable/disable and delete behavior.

Use the existing `saveAutomationConfig` preload API.

Acceptance:

- New rule persists to `panevo-automation.json`.
- Edited rule persists.
- Rule count updates after save.
- Existing rules created by the old template UI remain readable.
- Rules with unsupported shapes show in the list but have disabled edit.

### Slice 4: Builder Styling

Add focused CSS for:

- Builder dialog width and scroll behavior.
- Builder cards.
- Condition rows.
- Action rows.
- Small responsive layout for narrow windows.

Acceptance:

- No overlapping text at minimum supported window width.
- Action rows stay stable when changing action type.
- Buttons remain icon-based where appropriate.

### Slice 5: Verification And Docs

Run:

```bash
npm run type
npm run test
npm run lint
npm run format:check
```

Update:

- `docs/product/mvp-checklist.md`
- `docs/product/decisions.md`
- this document

## Safety Rules

These safety rules apply to the builder and runtime:

- Global automation starts disabled.
- New rules start empty and disabled.
- Race-aware rules should expose `race.not-stale` as an explicit condition choice.
- Manual stop and emergency stop must remain available regardless of automation state.
- Rule actions must dispatch through `ActionDispatcher`.
- Renderer code must never call VISCA, ONVIF, OBS websocket, RotorHazard Socket.IO, or filesystem APIs directly.
- A failed rule action must stop the current rule run and surface the failure in last-run state.
- Automation must not bypass active-camera validation, speed clamps, command queues, stop behavior, or OBS configuration checks.

### Stop overrides automation

A `panevo:stop` IPC call (operator emergency stop or movement stop) immediately sets the abort flag on `AutomationService`. Any rule that is currently mid-run checks this flag before dispatching its next action and returns with `status: "interrupted"` if it is set. Actions that have already completed are not reversed. The flag is cleared at the start of each new evaluation cycle so subsequent events are not suppressed.

The interrupt fires from `registerCameraIpc` → `getAutomationService().interruptCurrentRun()` on every `panevo:stop` handler invocation.

### No active camera guard

Before `AutomationService` dispatches any rule that contains camera-dependent actions (`camera.*` or `preset.*` action types), it calls the injected `isCameraConfigured` function. If no active camera profile is configured in Panevo, the rule is skipped with `status: "skipped"` and a clear message. Rules that contain only non-camera actions (e.g. `obs.scene.switch`) are not blocked by this check.

In the production singleton (`automation-service-instance.ts`) this check calls `ConfigService.getActiveCameraConfig()`. If the camera becomes disconnected mid-rule, the camera control layer returns a connection error, the action dispatcher returns a failure result, and `runRule` stops the rule with `status: "failed"`.

## Explicit Non-Goals

- Node-based workflow editor.
- User scripting.
- Timeline or rundown system.
- Multi-user automation editing.
- Arbitrary custom conditions.
- Direct preset-to-OBS scene mapping outside automation.

## Follow-Up Scope

After the constrained builder is usable:

- Manual action triggers.
- OBS state triggers.
- Control-device input triggers.
- Rule run history.
- Stream Deck feedback model for rule state and last result.
- Import/export of automation rules with the rest of Panevo configuration.
