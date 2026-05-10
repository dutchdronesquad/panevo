import { AlertTriangle, CheckCircle2, CircleOff, Cpu } from 'lucide-react';
import type { CameraConnectionStatus, CommandResponse } from '../../types/camera';

interface ConnectionStatusProps {
  status: CameraConnectionStatus;
  error: string | null;
  lastCommand: CommandResponse | null;
}

export const ConnectionStatus = ({ status, error, lastCommand }: ConnectionStatusProps) => {
  const icon = error ? <AlertTriangle size={16} /> : status.connected ? <CheckCircle2 size={16} /> : <CircleOff size={16} />;
  const label = error ? 'Command error' : status.mockMode ? 'Mock mode' : status.connected ? 'Connected' : 'Disconnected';

  return (
    <div className={`status-pill ${error ? 'status-error' : status.connected ? 'status-ok' : 'status-idle'}`}>
      <span className="status-icon">{status.mockMode && !error ? <Cpu size={16} /> : icon}</span>
      <span className="status-copy">
        <strong>{label}</strong>
        <span>{error || lastCommand?.command || status.message}</span>
      </span>
    </div>
  );
};

