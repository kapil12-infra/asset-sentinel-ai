// Line chart used by the dashboard and monitoring pages.
export function LineChart({ data, height = 180, unit = '' }: { data: { label: string; value: number }[]; height?: number; unit?: string }) {
  const W = 600, H = height, P = 28;
  if (!data.length) return <p className="empty">No data</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  const step = Math.ceil(data.length / 7);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart">
        <defs>
          <linearGradient id="lc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8b3dff" stopOpacity=".45" />
            <stop offset="1" stopColor="#8b3dff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={P} x2={W - P} y1={y(max * f)} y2={y(max * f)} stroke="#1f2750" />
            <text x={4} y={y(max * f) + 4} fill="#9aa3c7" fontSize="11">{Math.round(max * f)}{unit}</text>
          </g>
        ))}
        <path d={area} fill="url(#lc)" />
        <path d={line} stroke="#a855f7" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#a855f7"><title>{`${d.label}: ${d.value}${unit}`}</title></circle>
            {i % step === 0 && <text x={x(i)} y={H - 8} fill="#9aa3c7" fontSize="11" textAnchor="middle">{d.label}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
