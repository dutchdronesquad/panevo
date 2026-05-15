import { describe, expect, it } from "vitest";
import {
  formatKeyboardShortcutKey,
  formatKeyboardShortcutKeys,
  hasKeyboardShortcutActivationModifier,
  isKeyboardShortcutModifierCode,
  normalizeKeyboardShortcutKey,
  toKeyboardShortcutKey,
} from "../../src/shared/keyboard-shortcuts";

describe("normalizeKeyboardShortcutKey", () => {
  it("returns null for empty string", () => {
    expect(normalizeKeyboardShortcutKey("")).toBeNull();
  });

  it("returns null for modifier-only key", () => {
    expect(normalizeKeyboardShortcutKey("AltLeft")).toBeNull();
    expect(normalizeKeyboardShortcutKey("ControlRight")).toBeNull();
    expect(normalizeKeyboardShortcutKey("ShiftLeft")).toBeNull();
    expect(normalizeKeyboardShortcutKey("MetaLeft")).toBeNull();
  });

  it("normalizes a bare key code", () => {
    expect(normalizeKeyboardShortcutKey("KeyA")).toBe("KeyA");
    expect(normalizeKeyboardShortcutKey("ArrowUp")).toBe("ArrowUp");
    expect(normalizeKeyboardShortcutKey("Space")).toBe("Space");
  });

  it("normalizes modifier aliases to canonical names", () => {
    expect(normalizeKeyboardShortcutKey("Control+KeyA")).toBe("Ctrl+KeyA");
    expect(normalizeKeyboardShortcutKey("Ctrl+KeyA")).toBe("Ctrl+KeyA");
    expect(normalizeKeyboardShortcutKey("Cmd+KeyA")).toBe("Meta+KeyA");
    expect(normalizeKeyboardShortcutKey("Command+KeyA")).toBe("Meta+KeyA");
  });

  it("enforces canonical modifier order (Ctrl, Alt, Shift, Meta)", () => {
    expect(normalizeKeyboardShortcutKey("Alt+Ctrl+KeyA")).toBe("Ctrl+Alt+KeyA");
    expect(normalizeKeyboardShortcutKey("Shift+Alt+KeyA")).toBe("Alt+Shift+KeyA");
    expect(normalizeKeyboardShortcutKey("Meta+Alt+KeyL")).toBe("Alt+Meta+KeyL");
  });

  it("deduplicates modifiers", () => {
    expect(normalizeKeyboardShortcutKey("Alt+Alt+KeyA")).toBe("Alt+KeyA");
    expect(normalizeKeyboardShortcutKey("Ctrl+Ctrl+KeyA")).toBe("Ctrl+KeyA");
  });

  it("trims whitespace around parts", () => {
    expect(normalizeKeyboardShortcutKey(" Alt + KeyA ")).toBe("Alt+KeyA");
  });

  it("returns null when the base code is a physical modifier key", () => {
    // "ControlLeft" is a physical modifier code → rejected
    expect(normalizeKeyboardShortcutKey("Alt+ControlLeft")).toBeNull();
    expect(normalizeKeyboardShortcutKey("ShiftRight")).toBeNull();
  });
});

describe("hasKeyboardShortcutActivationModifier", () => {
  it("returns true when Alt is present", () => {
    expect(hasKeyboardShortcutActivationModifier("Alt+Digit1")).toBe(true);
  });

  it("returns true when Ctrl is present", () => {
    expect(hasKeyboardShortcutActivationModifier("Ctrl+KeyS")).toBe(true);
  });

  it("returns false for Shift-only modifier", () => {
    expect(hasKeyboardShortcutActivationModifier("Shift+KeyA")).toBe(false);
  });

  it("returns false for bare key", () => {
    expect(hasKeyboardShortcutActivationModifier("KeyA")).toBe(false);
  });

  it("returns false for Meta-only modifier", () => {
    expect(hasKeyboardShortcutActivationModifier("Meta+KeyA")).toBe(false);
  });
});

describe("isKeyboardShortcutModifierCode", () => {
  it("returns true for all modifier codes", () => {
    for (const code of [
      "AltLeft",
      "AltRight",
      "ControlLeft",
      "ControlRight",
      "MetaLeft",
      "MetaRight",
      "ShiftLeft",
      "ShiftRight",
    ]) {
      expect(isKeyboardShortcutModifierCode(code)).toBe(true);
    }
  });

  it("returns false for regular keys", () => {
    expect(isKeyboardShortcutModifierCode("KeyA")).toBe(false);
    expect(isKeyboardShortcutModifierCode("ArrowUp")).toBe(false);
    expect(isKeyboardShortcutModifierCode("Space")).toBe(false);
  });
});

describe("toKeyboardShortcutKey", () => {
  const makeEvent = (
    code: string,
    modifiers: { altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean } = {},
  ) => ({
    code,
    altKey: modifiers.altKey ?? false,
    ctrlKey: modifiers.ctrlKey ?? false,
    shiftKey: modifiers.shiftKey ?? false,
    metaKey: modifiers.metaKey ?? false,
  });

  it("returns null for modifier-only codes", () => {
    expect(toKeyboardShortcutKey(makeEvent("AltLeft", { altKey: true }))).toBeNull();
    expect(toKeyboardShortcutKey(makeEvent("ControlLeft", { ctrlKey: true }))).toBeNull();
  });

  it("returns bare key for key without modifiers", () => {
    expect(toKeyboardShortcutKey(makeEvent("KeyA"))).toBe("KeyA");
    expect(toKeyboardShortcutKey(makeEvent("ArrowUp"))).toBe("ArrowUp");
  });

  it("includes active modifiers in canonical order", () => {
    expect(toKeyboardShortcutKey(makeEvent("KeyA", { altKey: true }))).toBe("Alt+KeyA");
    expect(toKeyboardShortcutKey(makeEvent("KeyA", { ctrlKey: true }))).toBe("Ctrl+KeyA");
    expect(
      toKeyboardShortcutKey(makeEvent("Digit1", { altKey: true, ctrlKey: true })),
    ).toBe("Ctrl+Alt+Digit1");
  });

  it("includes Shift modifier", () => {
    expect(toKeyboardShortcutKey(makeEvent("KeyA", { shiftKey: true }))).toBe("Shift+KeyA");
  });
});

describe("formatKeyboardShortcutKey", () => {
  it("formats Key codes as plain letters", () => {
    expect(formatKeyboardShortcutKey("KeyA")).toBe("A");
    expect(formatKeyboardShortcutKey("KeyZ")).toBe("Z");
  });

  it("formats Digit codes as plain digits", () => {
    expect(formatKeyboardShortcutKey("Digit1")).toBe("1");
    expect(formatKeyboardShortcutKey("Digit0")).toBe("0");
  });

  it("formats Numpad digit codes with prefix", () => {
    expect(formatKeyboardShortcutKey("Numpad1")).toBe("Numpad 1");
    expect(formatKeyboardShortcutKey("Numpad9")).toBe("Numpad 9");
  });

  it("uses human-readable label for special keys", () => {
    expect(formatKeyboardShortcutKey("ArrowUp")).toBe("Arrow Up");
    expect(formatKeyboardShortcutKey("ArrowDown")).toBe("Arrow Down");
    expect(formatKeyboardShortcutKey("Space")).toBe("Space");
    expect(formatKeyboardShortcutKey("Escape")).toBe("Esc");
  });

  it("formats modifier+key combos with ' + ' separator", () => {
    expect(formatKeyboardShortcutKey("Alt+Digit1")).toBe("Alt + 1");
    expect(formatKeyboardShortcutKey("Ctrl+KeyS")).toBe("Ctrl + S");
    expect(formatKeyboardShortcutKey("Ctrl+Alt+KeyA")).toBe("Ctrl + Alt + A");
  });

  it("returns raw code for unknown keys", () => {
    expect(formatKeyboardShortcutKey("F5")).toBe("F5");
    expect(formatKeyboardShortcutKey("Delete")).toBe("Delete");
  });
});

describe("formatKeyboardShortcutKeys", () => {
  it("returns 'Unassigned' for empty array", () => {
    expect(formatKeyboardShortcutKeys([])).toBe("Unassigned");
  });

  it("formats a single key", () => {
    expect(formatKeyboardShortcutKeys(["KeyA"])).toBe("A");
  });

  it("joins multiple keys with ' / '", () => {
    expect(formatKeyboardShortcutKeys(["KeyA", "ArrowUp"])).toBe("A / Arrow Up");
  });
});
