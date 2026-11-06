export function Quantity({ value, onChange, label = 'Cups', disabled = false }: { value: number; onChange(value: number): void; label?: string; disabled?: boolean }) {
  return <div className="quantity" role="group" aria-label={`${label} quantity`}>
    <button type="button" aria-label={`Decrease ${label} quantity`} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>−</button><span>{value}</span>
    <button type="button" aria-label={`Increase ${label} quantity`} disabled={disabled || value >= 10} onClick={() => onChange(value + 1)}>+</button>
  </div>;
}