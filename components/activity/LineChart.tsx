type Point = { x: number; y: number }

export function LineChart({
  data,
  data2,
  height = 160,
  stroke = '#4f46e5',
  fill = 'rgba(79,70,229,0.08)',
  stroke2 = '#10b981',
}: {
  data: number[]
  data2?: number[]
  height?: number
  stroke?: string
  fill?: string
  stroke2?: string
}) {
  const width = Math.max(260, data.length * 26)
  const max = Math.max(1, ...data, ...(data2 || []))
  const mk = (arr: number[]) => arr.map((v, i) => ({ x: (i / (arr.length - 1 || 1)) * (width - 24) + 12, y: height - (v / max) * (height - 24) - 12 }))
  const points: Point[] = mk(data)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L ${points.length ? points[points.length - 1].x.toFixed(1) : 12} ${height - 12} L 12 ${height - 12} Z`
  const points2: Point[] = data2 && data2.length === data.length ? mk(data2) : []
  const path2 = points2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points2.length ? (
        <path d={path2} fill="none" stroke={stroke2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
    </svg>
  )
}
