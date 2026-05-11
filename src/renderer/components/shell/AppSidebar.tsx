import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CircleOff,
  Gamepad2,
  RadioReceiver,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/renderer/components/ui/tooltip";
import type { CameraConnectionStatus, CameraProfile } from "../../types/camera";

export type AppView = "control" | "cameras" | "settings";

interface AppSidebarProps {
  activeView: AppView;
  activeCamera: CameraProfile;
  status: CameraConnectionStatus;
  error: string | null;
  onViewChange: (view: AppView) => void;
}

export const AppSidebar = ({
  activeView,
  activeCamera,
  status,
  error,
  onViewChange,
}: AppSidebarProps) => {
  const isError = !!error;
  const isVerified =
    status.connected &&
    (status as { responseVerified?: boolean }).responseVerified === true &&
    !isError;
  const isTransportReady =
    status.connected &&
    (status as { responseVerified?: boolean }).responseVerified !== true &&
    !isError;

  const chipClass = isError
    ? "chip-error"
    : isVerified
      ? "chip-live"
      : isTransportReady
        ? "chip-standby"
        : "chip-info";
  const chipLabel = isError
    ? "Error"
    : isVerified
      ? "Verified"
      : isTransportReady
        ? "Transport"
        : "Disconnected";
  const chipIcon = isError ? (
    <AlertTriangle size={10} />
  ) : isVerified ? (
    <CheckCircle2 size={10} />
  ) : (
    <CircleOff size={10} />
  );

  const controlEndpoint =
    activeCamera.controlProtocol === "onvif"
      ? `ONVIF · ${activeCamera.onvifPort}`
      : `VISCA ${activeCamera.protocol.toUpperCase()} · ${activeCamera.port}`;
  const syncEndpoint =
    activeCamera.syncProtocol === "onvif"
      ? `Sync ONVIF · ${activeCamera.onvifPort}`
      : "Sync local only";
  const tooltipText = activeCamera.ipAddress
    ? `${activeCamera.ipAddress} · ${controlEndpoint} · ${syncEndpoint}`
    : "No address configured";

  const navBtn = (view: AppView, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      className={`sidebar-nav-button ${activeView === view ? "active" : ""}`.trim()}
      onClick={() => onViewChange(view)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="brand-row sidebar-brand">
        <div className="brand-mark">
          <RadioReceiver size={18} />
        </div>
        <div>
          <h1>Panevo</h1>
          <p>Live production control</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Panevo views">
        {navBtn("control", <Gamepad2 size={16} />, "Control")}
        {navBtn("cameras", <Camera size={16} />, "Cameras")}
        {navBtn("settings", <Settings size={16} />, "Settings")}
      </nav>

      <div />

      <div className="sidebar-status">
        <span className="sidebar-status-label">Status</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`status-chip ${chipClass} sidebar-status-chip`}>
              {chipIcon}
              {chipLabel}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">{tooltipText}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};
