import { SummaryCard } from '../../../components/activity/SummaryCard'
import { LineChart } from '../../../components/activity/LineChart'
import { BarChart } from '../../../components/activity/BarChart'

async function fetchUsage(search: string) {
  const res = await fetch(`/api/activity/usage${search}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load usage')
  return res.json()
}

function formatUSD(n: number) {
  return `$${(Math.round((n || 0) * 100) / 100).toFixed(2)}`
}

function formatNum(n: number) {
  return new Intl.NumberFormat().format(n || 0)
}

export default async function ActivityPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const range = (typeof searchParams.range === 'string' ? searchParams.range : '30d') || '30d'
  const type = (typeof searchParams.type === 'string' ? searchParams.type : '') || ''
  const provider = (typeof searchParams.provider === 'string' ? searchParams.provider : '') || ''
  const family = (typeof searchParams.family === 'string' ? searchParams.family : '') || ''
  const compare = (typeof searchParams.compare === 'string' ? searchParams.compare : '') || ''
  const query = new URLSearchParams()
  query.set('range', range)
  if (type) query.set('type', type)
  if (provider) query.set('provider', provider)
  if (family) query.set('family', family)
  if (compare) query.set('compare', compare)

  const data = await fetchUsage(`?${query.toString()}`)

  const dailyCost = (data?.timeseries || []).map((d: any) => Number(d.cost || 0))
  const dailyCostPrev = Array.isArray(data?.timeseriesPrev) ? data.timeseriesPrev.map((n: any) => Number(n || 0)) : undefined
  const providerBars = (data?.topProviders || []).map((p: any) => ({ label: p.provider, value: Number(p.cost || 0) }))
  const typeBreakdown = data?.totals?.byType || {}

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Activity</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ color: '#666' }}>Unified analytics across Credits, API keys, and CLI (MCP)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href={`/api/activity/usage?${query.toString()}&format=csv`} style={{ color: '#4f46e5', textDecoration: 'none' }}>Download CSV</a>
          <div style={{ borderLeft: '1px solid #eee', height: 16 }} />
          <a href={`/dashboard/activity?range=7d`} style={{ color: range==='7d' ? '#111' : '#555', textDecoration: 'none' }}>7d</a>
          <a href={`/dashboard/activity?range=30d`} style={{ color: range==='30d' ? '#111' : '#555', textDecoration: 'none' }}>30d</a>
          <a href={`/dashboard/activity?range=90d`} style={{ color: range==='90d' ? '#111' : '#555', textDecoration: 'none' }}>90d</a>
          <div style={{ borderLeft: '1px solid #eee', height: 16 }} />
          <span style={{ fontSize: 12, color: '#888' }}>Type:</span>
          {['', 'api', 'credits', 'cli'].map((t) => (
            <a key={t || 'all'} href={`/dashboard/activity?range=${range}${t?`&type=${t}`:''}${provider?`&provider=${encodeURIComponent(provider)}`:''}${family?`&family=${encodeURIComponent(family)}`:''}${compare?`&compare=${encodeURIComponent(compare)}`:''}`} style={{ color: t===type ? '#111' : '#555', textDecoration: 'none' }}>{t || 'all'}</a>
          ))}
          <div style={{ borderLeft: '1px solid #eee', height: 16 }} />
          <span style={{ fontSize: 12, color: '#888' }}>Compare:</span>
          <a href={`/dashboard/activity?range=${range}${type?`&type=${type}`:''}${provider?`&provider=${encodeURIComponent(provider)}`:''}${family?`&family=${encodeURIComponent(family)}`:''}`} style={{ color: compare ? '#555' : '#111', textDecoration: 'none' }}>off</a>
          <a href={`/dashboard/activity?range=${range}${type?`&type=${type}`:''}${provider?`&provider=${encodeURIComponent(provider)}`:''}${family?`&family=${encodeURIComponent(family)}`:''}&compare=1`} style={{ color: compare ? '#111' : '#555', textDecoration: 'none' }}>on</a>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        <SummaryCard title="Total Cost" value={formatUSD(data?.totals?.cost || 0)} sub={`Range: ${range}`} />
        <SummaryCard title="Total Tokens" value={formatNum(data?.totals?.tokens || 0)} />
        <SummaryCard title="Requests" value={formatNum(data?.totals?.count || 0)} />
        <SummaryCard
          title="Breakdown"
          value={
            ['api', 'credits', 'cli']
              .map((t) => `${t}: ${formatUSD(typeBreakdown[t]?.cost || 0)}`)
              .join('  ·  ')
          }
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>Daily Cost {data?.compare?.deltaCostPct!=null ? (<span style={{ fontSize: 12, color: data.compare.deltaCostPct>=0 ? '#16a34a' : '#dc2626' }}>({data.compare.deltaCostPct>=0 ? '+' : ''}{data.compare.deltaCostPct}%) vs prior</span>) : null}</div>
          <LineChart data={dailyCost} data2={compare ? dailyCostPrev : undefined} />
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>Cost by Provider</div>
          <BarChart data={providerBars} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <a href={`/dashboard/activity?range=${range}${type?`&type=${type}`:''}`} style={{ color: provider ? '#555' : '#111', textDecoration: 'none', fontSize: 12 }}>All</a>
            {providerBars.map((p) => (
              <a key={p.label} href={`/dashboard/activity?range=${range}${type?`&type=${type}`:''}&provider=${encodeURIComponent(p.label)}`} style={{ color: provider===p.label ? '#111' : '#555', textDecoration: 'none', fontSize: 12 }}>
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Type breakdown mini-cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        {['api','credits','cli'].map((t) => (
          <SummaryCard
            key={t}
            title={t.toUpperCase()}
            value={`${formatUSD(typeBreakdown[t]?.cost || 0)} · ${formatNum(typeBreakdown[t]?.tokens || 0)} tokens`}
            sub={`${formatNum(typeBreakdown[t]?.count || 0)} requests`}
          />
        ))}
      </div>

      {/* Top model families */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Top Model Families</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={`/dashboard/activity?range=${range}${type?`&type=${type}`:''}${provider?`&provider=${encodeURIComponent(provider)}`:''}${compare?`&compare=${encodeURIComponent(compare)}`:''}`} style={{ color: family ? '#555' : '#111', textDecoration: 'none', fontSize: 12 }}>All</a>
          {(data?.topFamilies || []).map((f: any) => (
            <a key={f.family} href={`/dashboard/activity?range=${range}${type?`&type=${type}`:''}${provider?`&provider=${encodeURIComponent(provider)}`:''}&family=${encodeURIComponent(f.family)}${compare?`&compare=${encodeURIComponent(compare)}`:''}`} style={{ color: family===f.family ? '#111' : '#555', textDecoration: 'none', fontSize: 12 }}>
              {f.family} ({formatUSD(f.cost)})
            </a>
          ))}
        </div>
      </div>

      {/* Top models */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Top Models</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Provider</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Model</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Cost</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Tokens</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Requests</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topModels || []).map((m: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>{m.provider}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>{m.model}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa', textAlign: 'right' }}>{formatUSD(m.cost)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa', textAlign: 'right' }}>{formatNum(m.tokens)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa', textAlign: 'right' }}>{formatNum(m.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent activity with links back to sessions */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Recent Activity</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>When</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Type</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Provider</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Model</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Cost</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Tokens</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Session</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent || []).map((r: any) => (
                <tr key={r.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>{new Date(r.when).toLocaleString()}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>{r.type}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>{r.provider}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>{r.model}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa', textAlign: 'right' }}>{formatUSD(r.cost)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa', textAlign: 'right' }}>{formatNum(r.tokens)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>
                    {r.sessionUrl ? (
                      <a href={r.sessionUrl} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                        View
                      </a>
                    ) : (
                      <span style={{ color: '#999' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
