import { Gamepad2, RefreshCw } from "lucide-react";
import { cn } from "@/renderer/lib/utils";
import { Button } from "@/renderer/components/ui/button";
import {
  type GamepadDeviceStatus,
  useGamepadDevices,
} from "@/renderer/hooks/useGamepadDevices";

export interface DeviceSelection {
  key: string;
  name: string;
  index: number;
  mapping: string;
}

interface DeviceStatusPanelProps {
  hideHeader?: boolean;
  mode?: "select" | "monitor";
  selectedDeviceKey?: string;
  onDeviceSelect?: (device: DeviceSelection) => void;
}

const formatInputValue = (value: number): string =>
  value > -0.005 && value < 0.005 ? "0.00" : value.toFixed(2);

const getDeviceName = (device: GamepadDeviceStatus): string =>
  device.id || `Gamepad ${device.index + 1}`;

export const DeviceStatusPanel = ({
  hideHeader = false,
  mode = "monitor",
  selectedDeviceKey,
  onDeviceSelect,
}: DeviceStatusPanelProps) => {
  const { connectedCount, devices, lastUpdated, refresh, supported } =
    useGamepadDevices();
  const isSelectMode = mode === "select";

  return (
    <div className="input-device-panel">
      {!hideHeader && (
        <div className="input-device-panel-header">
          <div className="integration-detail-heading">
            <span className="integration-icon">
              <Gamepad2 size={18} />
            </span>
            <div>
              <strong>
                {isSelectMode ? "Select input device" : "Input monitor"}
              </strong>
              <span>
                {supported
                  ? `${connectedCount} device${connectedCount === 1 ? "" : "s"} connected`
                  : "Gamepad API is not available"}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={!supported}
          >
            <RefreshCw />
            Refresh
          </Button>
        </div>
      )}

      {!supported && (
        <div className="input-device-empty">
          Standard gamepad discovery is not available in this runtime.
        </div>
      )}

      {supported && devices.length === 0 && (
        <div className="input-device-empty">
          Connect a gamepad, joystick, or radio-style input device and move a
          stick or press a button if the device does not appear immediately.
        </div>
      )}

      {devices.length > 0 && (
        <div className="input-device-list">
          {devices.map((device) => {
            const DeviceElement = isSelectMode ? "button" : "div";
            const deviceName = getDeviceName(device);
            const isSelected = selectedDeviceKey === device.key;

            return (
              <DeviceElement
                className={cn(
                  "input-device-device",
                  isSelectMode && "input-device-device--selectable",
                )}
                data-selected={isSelected || undefined}
                key={device.key}
                onClick={
                  isSelectMode
                    ? () =>
                        onDeviceSelect?.({
                          key: device.key,
                          name: deviceName,
                          index: device.index,
                          mapping: device.mapping,
                        })
                    : undefined
                }
                type={isSelectMode ? "button" : undefined}
              >
                <div className="input-device-device-summary">
                  <div>
                    <strong>{deviceName}</strong>
                    <span>
                      Index {device.index} · {device.mapping || "custom"}{" "}
                      mapping
                    </span>
                  </div>
                  <div className="input-device-device-meta">
                    <span>{device.axes} axes</span>
                    <span>{device.buttons} buttons</span>
                    <span data-connected={device.connected || undefined}>
                      {device.connected ? "Connected" : "Disconnected"}
                    </span>
                    {(isSelectMode || isSelected) && (
                      <span data-selected={isSelected || undefined}>
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    )}
                  </div>
                </div>

                {!isSelectMode && (
                  <div className="input-device-live">
                    <div className="input-device-live-group">
                      <span className="input-device-live-label">Axes</span>
                      <div className="input-device-axis-list">
                        {device.axisValues.map((axisValue, axisIndex) => (
                          <div
                            className="input-device-axis"
                            key={`${device.index}-axis-${axisIndex}`}
                          >
                            <span>Axis {axisIndex}</span>
                            <div
                              aria-hidden="true"
                              className="input-device-axis-track"
                            >
                              <span
                                style={{
                                  left: `${((axisValue + 1) / 2) * 100}%`,
                                }}
                              />
                            </div>
                            <strong>{formatInputValue(axisValue)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="input-device-live-group">
                      <span className="input-device-live-label">Buttons</span>
                      <div className="input-device-button-grid">
                        {device.buttonValues.map((buttonValue, buttonIndex) => (
                          <span
                            data-pressed={
                              device.pressedButtons.includes(buttonIndex) ||
                              buttonValue > 0
                                ? true
                                : undefined
                            }
                            key={`${device.index}-button-${buttonIndex}`}
                          >
                            B{buttonIndex}
                            {buttonValue > 0 && (
                              <small>{formatInputValue(buttonValue)}</small>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </DeviceElement>
            );
          })}
        </div>
      )}

      {lastUpdated && (
        <span className="input-device-updated">
          Last checked {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
