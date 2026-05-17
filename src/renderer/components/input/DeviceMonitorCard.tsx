import { Gamepad2, RefreshCw } from "lucide-react";
import { SectionCard } from "@/renderer/components/SectionCard";
import { Button } from "@/renderer/components/ui/button";
import { DeviceStatusPanel } from "./DeviceStatusPanel";

interface DeviceMonitorCardProps {
  connectedCount: number;
  onRefresh: () => void;
  selectedDeviceKey: string;
  supported: boolean;
}

export const DeviceMonitorCard = ({
  connectedCount,
  onRefresh,
  selectedDeviceKey,
  supported,
}: DeviceMonitorCardProps) => (
  <SectionCard
    className="input-devices-monitor"
    contentClassName="input-devices-monitor-content"
    icon={Gamepad2}
    label={`${connectedCount} device${connectedCount === 1 ? "" : "s"} connected`}
    title="Live device monitor"
    action={
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={!supported}
      >
        <RefreshCw />
        Refresh
      </Button>
    }
  >
    <DeviceStatusPanel
      hideHeader
      mode="monitor"
      selectedDeviceKey={selectedDeviceKey}
    />
  </SectionCard>
);
