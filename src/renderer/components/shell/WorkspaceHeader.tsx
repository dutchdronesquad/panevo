import { OctagonX } from "lucide-react";
import { Button } from "@/renderer/components/ui/button";

interface WorkspaceHeaderProps {
  title: string;
  onEmergencyStop: () => void;
  emergencyStopDisabled?: boolean;
}

export const WorkspaceHeader = ({
  title,
  onEmergencyStop,
  emergencyStopDisabled = false,
}: WorkspaceHeaderProps) => {
  return (
    <header className="workspace-header">
      <h2>{title}</h2>
      <Button
        variant="destructive"
        size="sm"
        className="emergency-stop-button"
        disabled={emergencyStopDisabled}
        title={
          emergencyStopDisabled
            ? "No active camera"
            : "Stop active camera movement"
        }
        onClick={onEmergencyStop}
      >
        <OctagonX size={13} />
        Stop
      </Button>
    </header>
  );
};
