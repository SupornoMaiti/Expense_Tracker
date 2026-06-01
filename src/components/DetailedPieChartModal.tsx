
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { Category } from '../lib/db'

interface Props {
  onClose: () => void
  pieData: { name: string; value: number }[]
  categories: Category[]
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function DetailedPieChartModal({ onClose, pieData, categories }: Props) {
  const renderLabel = ({ name, percent }: { name?: string; percent?: number }) =>
    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">Category Breakdown</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
          {pieData.length === 0 ? (
            <div className="empty-state">No data available</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderLabel}
                    labelLine={true}
                  >
                    {pieData.map((entry) => {
                      const color = categories.find(c => c.name === entry.name)?.color || '#888888'
                      return <Cell key={entry.name} fill={color} />
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [typeof v === 'number' ? formatINR(v) : v, 'Amount']}
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)', maxHeight: 200, overflowY: 'auto' }}>
                {pieData.map(d => {
                  const cat = categories.find(c => c.name === d.name)
                  const icon = cat?.icon || '📌'
                  const color = cat?.color || '#888888'
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                        <span style={{ textTransform: 'capitalize', color, fontWeight: 600 }}>{d.name}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {formatINR(d.value)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  )
}
