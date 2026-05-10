import { useRef, type ReactNode } from 'react';
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, Square } from 'lucide-react';

interface PtzActions {
  panLeft: () => void;
  panRight: () => void;
  tiltUp: () => void;
  tiltDown: () => void;
  moveUpLeft: () => void;
  moveUpRight: () => void;
  moveDownLeft: () => void;
  moveDownRight: () => void;
  stop: () => void;
}

interface PtzControlsProps {
  actions: PtzActions;
}

interface PadButtonProps {
  label: string;
  onStart: () => void;
  onStop: () => void;
  children: ReactNode;
  className?: string;
}

const PadButton = ({ label, onStart, onStop, children, className = '' }: PadButtonProps) => {
  const activePointerId = useRef<number | null>(null);

  const stopIfActive = () => {
    if (activePointerId.current === null) {
      return;
    }

    activePointerId.current = null;
    onStop();
  };

  return (
    <button
      type="button"
      className={`pad-button ${className}`.trim()}
      aria-label={label}
      title={label}
      onPointerDown={(event) => {
        activePointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        onStart();
      }}
      onPointerUp={stopIfActive}
      onPointerCancel={stopIfActive}
      onLostPointerCapture={stopIfActive}
      onPointerLeave={stopIfActive}
    >
      {children}
    </button>
  );
};

export const PtzControls = ({ actions }: PtzControlsProps) => {
  return (
    <div className="ptz-pad" aria-label="PTZ movement controls">
      <PadButton label="Move up left" onStart={actions.moveUpLeft} onStop={actions.stop}>
        <ArrowUpLeft size={26} />
      </PadButton>
      <PadButton label="Tilt up" onStart={actions.tiltUp} onStop={actions.stop}>
        <ArrowUp size={28} />
      </PadButton>
      <PadButton label="Move up right" onStart={actions.moveUpRight} onStop={actions.stop}>
        <ArrowUpRight size={26} />
      </PadButton>
      <PadButton label="Pan left" onStart={actions.panLeft} onStop={actions.stop}>
        <ArrowLeft size={28} />
      </PadButton>
      <button type="button" className="pad-button stop-button" aria-label="Stop movement" title="Stop movement" onClick={actions.stop}>
        <Square size={24} />
      </button>
      <PadButton label="Pan right" onStart={actions.panRight} onStop={actions.stop}>
        <ArrowRight size={28} />
      </PadButton>
      <PadButton label="Move down left" onStart={actions.moveDownLeft} onStop={actions.stop}>
        <ArrowDownLeft size={26} />
      </PadButton>
      <PadButton label="Tilt down" onStart={actions.tiltDown} onStop={actions.stop}>
        <ArrowDown size={28} />
      </PadButton>
      <PadButton label="Move down right" onStart={actions.moveDownRight} onStop={actions.stop}>
        <ArrowDownRight size={26} />
      </PadButton>
    </div>
  );
};
