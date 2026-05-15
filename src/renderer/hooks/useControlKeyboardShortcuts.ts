import { useEffect, useRef, useState } from "react";
import {
  normalizeKeyboardShortcutKey,
  toKeyboardShortcutKey,
} from "@/shared/keyboard-shortcuts";
import type {
  CommandResponse,
  KeyboardShortcutActionId,
  KeyboardShortcutBinding,
  KeyboardShortcutConfig,
  PanevoAction,
  PanevoPtzDirection,
} from "@/shared/types";

interface UseControlKeyboardShortcutsOptions {
  enabled: boolean;
  speed: number;
  zoomSpeed: number;
  config: KeyboardShortcutConfig;
  onCommand: (command: CommandResponse) => void;
  onError: (message: string) => void;
}

interface UseControlKeyboardShortcutsResult {
  activePtzDirection: PanevoPtzDirection | null;
  activeZoom: "in" | "out" | null;
}

const movementVectorsById: Partial<
  Record<KeyboardShortcutActionId, { x: number; y: number }>
> = {
  "ptz.tilt-up": { x: 0, y: -1 },
  "ptz.tilt-down": { x: 0, y: 1 },
  "ptz.pan-left": { x: -1, y: 0 },
  "ptz.pan-right": { x: 1, y: 0 },
  "ptz.up-left": { x: -1, y: -1 },
  "ptz.up-right": { x: 1, y: -1 },
  "ptz.down-left": { x: -1, y: 1 },
  "ptz.down-right": { x: 1, y: 1 },
};

const zoomDirectionsById: Partial<
  Record<KeyboardShortcutActionId, "in" | "out">
> = {
  "zoom.in": "in",
  "zoom.out": "out",
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, button, [contenteditable="true"], [role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]',
    ),
  );
};

const toEnabledBindingsByKey = (
  bindings: KeyboardShortcutBinding[],
): Map<string, KeyboardShortcutBinding> => {
  const bindingsByKey = new Map<string, KeyboardShortcutBinding>();

  for (const binding of bindings) {
    if (!binding.enabled || binding.group === "presets") {
      continue;
    }

    for (const key of binding.keys) {
      const normalizedKey = normalizeKeyboardShortcutKey(key);
      if (normalizedKey && !bindingsByKey.has(normalizedKey)) {
        bindingsByKey.set(normalizedKey, binding);
      }
    }
  }

  return bindingsByKey;
};

const toEnabledBindingsByCode = (
  bindings: KeyboardShortcutBinding[],
): Map<string, KeyboardShortcutBinding[]> => {
  const bindingsByCode = new Map<string, KeyboardShortcutBinding[]>();

  for (const binding of bindings) {
    if (!binding.enabled || binding.group === "presets") {
      continue;
    }

    for (const key of binding.keys) {
      const normalizedKey = normalizeKeyboardShortcutKey(key);
      if (!normalizedKey) {
        continue;
      }

      const parts = normalizedKey.split("+");
      const code = parts[parts.length - 1];
      bindingsByCode.set(code, [...(bindingsByCode.get(code) ?? []), binding]);
    }
  }

  return bindingsByCode;
};

const toPtzDirection = (
  pressedActionIds: Set<KeyboardShortcutActionId>,
): PanevoPtzDirection | null => {
  const vector = Array.from(pressedActionIds).reduce(
    (current, actionId) => {
      const next = movementVectorsById[actionId];
      if (!next) {
        return current;
      }

      return {
        x: current.x + next.x,
        y: current.y + next.y,
      };
    },
    { x: 0, y: 0 },
  );
  const x = Math.sign(vector.x);
  const y = Math.sign(vector.y);

  if (x === 0 && y === -1) return "tilt-up";
  if (x === 0 && y === 1) return "tilt-down";
  if (x === -1 && y === 0) return "pan-left";
  if (x === 1 && y === 0) return "pan-right";
  if (x === -1 && y === -1) return "up-left";
  if (x === 1 && y === -1) return "up-right";
  if (x === -1 && y === 1) return "down-left";
  if (x === 1 && y === 1) return "down-right";

  return null;
};

export const useControlKeyboardShortcuts = ({
  enabled,
  speed,
  zoomSpeed,
  config,
  onCommand,
  onError,
}: UseControlKeyboardShortcutsOptions): UseControlKeyboardShortcutsResult => {
  const speedRef = useRef(speed);
  const zoomSpeedRef = useRef(zoomSpeed);
  const onCommandRef = useRef(onCommand);
  const onErrorRef = useRef(onError);
  const pressedMovementActionsRef = useRef(new Set<KeyboardShortcutActionId>());
  const activeDirectionRef = useRef<PanevoPtzDirection | null>(null);
  const activeZoomRef = useRef<"in" | "out" | null>(null);
  const [activePtzDirection, setActivePtzDirection] =
    useState<PanevoPtzDirection | null>(null);
  const [activeZoom, setActiveZoom] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    zoomSpeedRef.current = zoomSpeed;
  }, [zoomSpeed]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled || !config.enabled) {
      setActivePtzDirection(null);
      setActiveZoom(null);
      pressedMovementActionsRef.current.clear();
      activeDirectionRef.current = null;
      activeZoomRef.current = null;
      return undefined;
    }

    const bindingsByKey = toEnabledBindingsByKey(config.bindings);
    const bindingsByCode = toEnabledBindingsByCode(config.bindings);

    const dispatchAction = async (action: PanevoAction) => {
      const result = await window.panevo.dispatchAction({
        ...action,
        source: "operator",
      });

      if (!result.ok) {
        onErrorRef.current(`${result.error.code}: ${result.error.message}`);
        return;
      }

      if (result.data.command) {
        onCommandRef.current(result.data.command);
      }
      onErrorRef.current("");
    };

    const stopMovement = () => {
      if (!activeDirectionRef.current) {
        return;
      }
      activeDirectionRef.current = null;
      setActivePtzDirection(null);
      void dispatchAction({ type: "camera.stop", target: "movement" });
    };

    const stopZoom = () => {
      if (!activeZoomRef.current) {
        return;
      }
      activeZoomRef.current = null;
      setActiveZoom(null);
      void dispatchAction({ type: "camera.stop", target: "zoom" });
    };

    const updateMovement = () => {
      const nextDirection = toPtzDirection(pressedMovementActionsRef.current);
      if (nextDirection === activeDirectionRef.current) {
        return;
      }
      activeDirectionRef.current = nextDirection;
      setActivePtzDirection(nextDirection);
      if (!nextDirection) {
        void dispatchAction({ type: "camera.stop", target: "movement" });
        return;
      }
      void dispatchAction({
        type: "camera.ptz.move",
        direction: nextDirection,
        speed: speedRef.current,
      });
    };

    const clearActiveInputs = () => {
      pressedMovementActionsRef.current.clear();
      stopMovement();
      stopZoom();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const shortcutKey = toKeyboardShortcutKey(event);
      if (!shortcutKey) {
        return;
      }

      const binding = bindingsByKey.get(shortcutKey);
      if (!binding) {
        return;
      }

      if (movementVectorsById[binding.id]) {
        event.preventDefault();
        if (event.repeat) return;
        pressedMovementActionsRef.current.add(binding.id);
        updateMovement();
        return;
      }

      const zoomDirection = zoomDirectionsById[binding.id];
      if (zoomDirection) {
        event.preventDefault();
        if (event.repeat || zoomDirection === activeZoomRef.current) {
          return;
        }
        activeZoomRef.current = zoomDirection;
        setActiveZoom(zoomDirection);
        void dispatchAction({
          type: "camera.zoom.move",
          direction: zoomDirection,
          speed: zoomSpeedRef.current,
        });
        return;
      }

      if (binding.id === "stop.all" && !event.repeat) {
        event.preventDefault();
        pressedMovementActionsRef.current.clear();
        activeDirectionRef.current = null;
        activeZoomRef.current = null;
        setActivePtzDirection(null);
        setActiveZoom(null);
        void dispatchAction({ type: "camera.stop", target: "all" });
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const bindings = bindingsByCode.get(event.code) ?? [];
      const movementBindings = bindings.filter(
        (binding) => movementVectorsById[binding.id],
      );
      if (movementBindings.length > 0) {
        event.preventDefault();
        for (const binding of movementBindings) {
          pressedMovementActionsRef.current.delete(binding.id);
        }
        updateMovement();
        return;
      }

      if (
        bindings.some(
          (binding) => zoomDirectionsById[binding.id] === activeZoomRef.current,
        )
      ) {
        event.preventDefault();
        stopZoom();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearActiveInputs();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearActiveInputs);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearActiveInputs();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearActiveInputs);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [config, enabled]);

  return { activePtzDirection, activeZoom };
};
