type PerformanceSemiGaugeProps = {
  value: number;
  min?: number;
  max?: number;
  label: string;
  displayValue: string;
  zones?: { upTo: number; color: string }[];
};

const DEFAULT_ZONES = [
  { upTo: 55, color: "#22c55e" },
  { upTo: 75, color: "#eab308" },
  { upTo: 100, color: "#f97316" },
];

export function PerformanceSemiGauge({
  value,
  min = 0,
  max = 100,
  label,
  displayValue,
  zones = DEFAULT_ZONES,
}: PerformanceSemiGaugeProps) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -180 + pct * 180;
  const r = 42;
  const cx = 50;
  const cy = 52;

  const polar = (deg: number, radius = r) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (fromDeg: number, toDeg: number, radius = r) => {
    const a = polar(fromDeg, radius);
    const b = polar(toDeg, radius);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  let zoneColor = zones[zones.length - 1]?.color ?? "#f97316";
  for (const z of zones) {
    if (pct * 100 <= z.upTo) {
      zoneColor = z.color;
      break;
    }
  }

  const needle = polar(angle, r - 6);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 58" className="h-[5.5rem] w-full max-w-[11rem]" aria-hidden>
        <path d={arcPath(-180, 0)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeLinecap="round" />
        <path
          d={arcPath(-180, -180 + pct * 180)}
          fill="none"
          stroke={zoneColor}
          strokeWidth="7"
          strokeLinecap="round"
          opacity={0.9}
        />
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="2.5" fill="#e2e8f0" />
      </svg>
      <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-center text-lg font-bold tabular-nums text-white">{displayValue}</p>
    </div>
  );
}

export function PerformancePowerGauge({
  oeHp,
  targetHp,
  maxPotential = 600,
}: {
  oeHp: number;
  targetHp: number;
  maxPotential?: number;
}) {
  const pct = Math.max(0, Math.min(1, (targetHp - oeHp) / (maxPotential - oeHp)));
  const angle = -180 + pct * 180;
  const r = 42;
  const cx = 50;
  const cy = 52;

  const polar = (deg: number, radius = r) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (fromDeg: number, toDeg: number) => {
    const a = polar(fromDeg);
    const b = polar(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  const needle = polar(angle, r - 6);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 58" className="h-[5.5rem] w-full max-w-[11rem]" aria-hidden>
        <path d={arcPath(-180, 0)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeLinecap="round" />
        <path
          d={arcPath(-180, angle)}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="7"
          strokeLinecap="round"
          opacity={0.85}
        />
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="2.5" fill="#e2e8f0" />
        <text x="8" y="56" fill="#64748b" fontSize="5.5" fontWeight="600">
          {oeHp} hp
        </text>
        <text x="68" y="56" fill="#64748b" fontSize="5.5" fontWeight="600">
          {maxPotential}+ hp
        </text>
      </svg>
      <p className="text-2xl font-bold tabular-nums text-cyan-200">{targetHp} hp</p>
      <p className="text-[9px] uppercase tracking-wide text-neutral-500">Target power</p>
    </div>
  );
}
