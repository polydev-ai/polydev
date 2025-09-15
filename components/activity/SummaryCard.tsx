export function SummaryCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, background: '#fff' }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{sub}</div> : null}
    </div>
  )
}

