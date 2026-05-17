import { Gamepad2 } from "lucide-react";
import { SectionCard } from "@/renderer/components/SectionCard";

interface DeviceOverviewCardProps {
  deadmanActive: boolean;
  liveControlStatus: string;
  profileIsSafe: boolean;
  profileName: string;
  selectedDeviceName: string;
}

export const DeviceOverviewCard = ({
  deadmanActive,
  liveControlStatus,
  profileIsSafe,
  profileName,
  selectedDeviceName,
}: DeviceOverviewCardProps) => (
  <SectionCard
    contentClassName="input-devices-overview"
    icon={Gamepad2}
    label="Control device"
    title={selectedDeviceName}
    action={
      <span
        className="input-devices-live-badge"
        data-live={deadmanActive || undefined}
      >
        {deadmanActive ? "Live" : "Standby"}
      </span>
    }
  >
    <div>
      <span>Profile</span>
      <strong>{profileName}</strong>
    </div>
    <div data-safe={profileIsSafe || undefined}>
      <span>Safety</span>
      <strong>
        {profileIsSafe ? "Deadman configured" : "Deadman required"}
      </strong>
    </div>
    <div data-live={deadmanActive || undefined}>
      <span>Camera</span>
      <strong>{deadmanActive ? "Live" : "Standby"}</strong>
      <small>{liveControlStatus}</small>
    </div>
  </SectionCard>
);
