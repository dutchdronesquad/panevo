import { useRef } from 'react';
import { Minus, Plus, Square } from 'lucide-react';
import { SpeedSelector } from './SpeedSelector';

interface ZoomActions {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomStop: () => void;
}

interface ZoomControlsProps {
  zoomSpeed: number;
  onZoomSpeedChange: (value: number) => void;
  actions: ZoomActions;
}

export const ZoomControls = ({ zoomSpeed, onZoomSpeedChange, actions }: ZoomControlsProps) => {
  const activePointerId = useRef<number | null>(null);

  const stopIfActive = () => {
    if (activePointerId.current === null) {
      return;
    }

    activePointerId.current = null;
    actions.zoomStop();
  };

  const pressEvents = (start: () => void) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      activePointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      start();
    },
    onPointerUp: stopIfActive,
    onPointerCancel: stopIfActive,
    onLostPointerCapture: stopIfActive,
    onPointerLeave: stopIfActive,
  });

  return (
    <section className="zoom-panel">
      <div className="panel-title">Zoom</div>
      <div className="zoom-buttons">
        <button type="button" className="zoom-button" aria-label="Zoom out" title="Zoom out" {...pressEvents(actions.zoomOut)}>
          <Minus size={24} />
        </button>
        <button type="button" className="zoom-button zoom-stop" aria-label="Stop zoom" title="Stop zoom" onClick={actions.zoomStop}>
          <Square size={20} />
        </button>
        <button type="button" className="zoom-button" aria-label="Zoom in" title="Zoom in" {...pressEvents(actions.zoomIn)}>
          <Plus size={24} />
        </button>
      </div>
      <SpeedSelector label="Zoom speed" value={zoomSpeed} min={1} max={8} onChange={onZoomSpeedChange} />
    </section>
  );
};
