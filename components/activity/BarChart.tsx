export function BarChart({ data, height = 140, color = '#22c55e' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const width = Math.max(240, data.length * 28)
  const max = Math.max(1, ...data.map((d) => d.value))
  const barWidth = (width - 24) / (data.length || 1)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const h = ((d.value || 0) / max) * (height - 24)
        const x = 12 + i * barWidth + 4
        const y = height - 12 - h
        return <rect key={i} x={x} y={y} width={Math.max(6, barWidth - 8)} height={h} fill={color} rx={3} />
      })}
    </svg>
  )
}

