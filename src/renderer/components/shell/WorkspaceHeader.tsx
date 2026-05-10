import { OctagonX } from 'lucide-react';
import { Button } from '@/renderer/components/ui/button';

interface WorkspaceHeaderProps {
  title: string;
  onEmergencyStop: () => void;
}

export const WorkspaceHeader = ({ title, onEmergencyStop }: WorkspaceHeaderProps) => {
  return (
    <header className="workspace-header">
      <h2>{title}</h2>
      <Button variant="destructive" size="sm" className="emergency-stop-button" onClick={onEmergencyStop}>
        <OctagonX size={13} />
        Stop
      </Button>
    </header>
  );
};
