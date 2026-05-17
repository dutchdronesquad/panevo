import { useCallback, useEffect, useRef, useState } from "react";

export interface GamepadDeviceStatus {
  axes: number;
  axisValues: number[];
  buttons: number;
  buttonValues: number[];
  connected: boolean;
  id: string;
  index: number;
  key: string;
  mapping: string;
  pressedButtons: number[];
  timestamp: number;
}

interface GamepadDeviceSnapshot {
  connectedCount: number;
  devices: GamepadDeviceStatus[];
  lastUpdated: number | null;
  supported: boolean;
}

export interface GamepadDeviceState extends GamepadDeviceSnapshot {
  refresh: () => void;
}

const hasGamepadApi = (): boolean =>
  typeof navigator !== "undefined" && "getGamepads" in navigator;

const readGamepads = (): GamepadDeviceStatus[] => {
  if (!hasGamepadApi()) {
    return [];
  }

  return Array.from(navigator.getGamepads())
    .filter((gamepad): gamepad is Gamepad => Boolean(gamepad))
    .map((gamepad) => ({
      axes: gamepad.axes.length,
      axisValues: gamepad.axes.map((axis) => Number(axis.toFixed(2))),
      buttons: gamepad.buttons.length,
      buttonValues: gamepad.buttons.map((button) =>
        Number(button.value.toFixed(2)),
      ),
      pressedButtons: gamepad.buttons
        .map((button, index) => (button.pressed ? index : null))
        .filter((index): index is number => index !== null),
      connected: gamepad.connected,
      id: gamepad.id,
      index: gamepad.index,
      key: `${gamepad.index}:${gamepad.id}`,
      mapping: gamepad.mapping || "custom",
      timestamp: gamepad.timestamp,
    }))
    .sort((a, b) => a.index - b.index);
};

const toDeviceSignature = (devices: GamepadDeviceStatus[]): string =>
  JSON.stringify(
    devices.map((device) => ({
      axes: device.axes,
      axisValues: device.axisValues,
      buttons: device.buttons,
      buttonValues: device.buttonValues,
      connected: device.connected,
      id: device.id,
      index: device.index,
      key: device.key,
      mapping: device.mapping,
    })),
  );

export const useGamepadDevices = (): GamepadDeviceState => {
  const [state, setState] = useState<GamepadDeviceSnapshot>(() => {
    const supported = hasGamepadApi();
    const devices = supported ? readGamepads() : [];

    return {
      connectedCount: devices.filter((device) => device.connected).length,
      devices,
      lastUpdated: supported ? Date.now() : null,
      supported,
    };
  });
  const lastSignatureRef = useRef("");

  const refresh = useCallback((force = false) => {
    if (!hasGamepadApi()) {
      setState((currentState) => ({
        ...currentState,
        supported: false,
      }));
      return;
    }

    const devices = readGamepads();
    const signature = toDeviceSignature(devices);
    if (!force && signature === lastSignatureRef.current) {
      return;
    }

    lastSignatureRef.current = signature;
    setState({
      connectedCount: devices.filter((device) => device.connected).length,
      devices,
      lastUpdated: Date.now(),
      supported: true,
    });
  }, []);

  useEffect(() => {
    if (!hasGamepadApi()) {
      return undefined;
    }

    const onGamepadChange = () => refresh(true);

    refresh();
    const interval = window.setInterval(refresh, 100);
    window.addEventListener("gamepadconnected", onGamepadChange);
    window.addEventListener("gamepaddisconnected", onGamepadChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("gamepadconnected", onGamepadChange);
      window.removeEventListener("gamepaddisconnected", onGamepadChange);
    };
  }, [refresh]);

  return {
    ...state,
    refresh: () => refresh(true),
  };
};
