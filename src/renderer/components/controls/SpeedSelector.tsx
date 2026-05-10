interface SpeedSelectorProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export const SpeedSelector = ({ label, value, min, max, onChange }: SpeedSelectorProps) => {
  return (
    <label className="speed-control">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
};

