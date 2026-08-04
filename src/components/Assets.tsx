import { useState } from 'react'
import { ASSETS, type Asset, type AssetType, type StatusType } from '../data/mockData'

const STATUS_LABELS: Record<StatusType, string> = {
  ok: 'Regular',
  warning: 'Atenção',
  critical: 'Crítico',
  overdue: 'Vencido',
  inactive: 'Inativo',
}

const TYPE_LABELS: Record<AssetType, string> = {
  vehicle: 'Veículo',
  tool: 'Ferramenta',
  equipment: 'Equipamento',
}

export default function Assets() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusType | 'all'>('all')
  const [selected, setSelected] = useState<Asset | null>(null)

  const filtered = ASSETS.filter(a => {
    const matchSearch = search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.responsible.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || a.type === typeFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Table panel */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ativo, código ou responsável…"
            style={{
              flex: 1,
              minWidth: 200,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '7px 12px',
              color: 'var(--foreground)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <FilterPill label="Todos" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
          <FilterPill label="Veículos" active={typeFilter === 'vehicle'} onClick={() => setTypeFilter('vehicle')} />
          <FilterPill label="Ferramentas" active={typeFilter === 'tool'} onClick={() => setTypeFilter('tool')} />
          <FilterPill label="Equipamentos" active={typeFilter === 'equipment'} onClick={() => setTypeFilter('equipment')} />
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <FilterPill label="OK" active={statusFilter === 'ok'} onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')} color="var(--status-ok)" />
          <FilterPill label="Atenção" active={statusFilter === 'warning'} onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')} color="var(--status-warning)" />
          <FilterPill label="Crítico" active={statusFilter === 'critical'} onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')} color="var(--status-critical)" />
          <FilterPill label="Vencido" active={statusFilter === 'overdue'} onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')} color="var(--status-overdue)" />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', flex: 1 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Ativo</th>
                  <th>Tipo</th>
                  <th>Responsável</th>
                  <th>Local</th>
                  <th>Próx. Manutenção</th>
                  <th>Prazo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => (
                  <tr
                    key={asset.id}
                    onClick={() => setSelected(selected?.id === asset.id ? null : asset)}
                    style={{
                      cursor: 'pointer',
                      background: selected?.id === asset.id ? 'rgba(59,130,246,0.06)' : undefined,
                    }}
                  >
                    <td>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{asset.code}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{asset.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>{asset.brand} {asset.model} · {asset.year}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{TYPE_LABELS[asset.type]}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{asset.responsible}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{asset.location}</span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--foreground)' }}>
                        {new Date(asset.nextMaintenance).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{
                        fontSize: 12,
                        color: asset.daysUntilMaintenance < 0 ? 'var(--status-overdue)' :
                          asset.daysUntilMaintenance <= 7 ? 'var(--status-critical)' :
                          asset.daysUntilMaintenance <= 30 ? 'var(--status-warning)' : 'var(--muted-foreground)',
                        fontWeight: asset.daysUntilMaintenance < 0 ? 500 : 400,
                      }}>
                        {asset.daysUntilMaintenance < 0 ? `${Math.abs(asset.daysUntilMaintenance)}d atraso` : `${asset.daysUntilMaintenance}d`}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-${asset.status}`} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2, fontWeight: 500 }}>
                        {STATUS_LABELS[asset.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
              {filtered.length} de {ASSETS.length} ativos
            </span>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          width: 300,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>DETALHE DO ATIVO</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)', letterSpacing: '0.06em', marginBottom: 4 }}>{selected.code}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>{selected.name}</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge-${selected.status}`} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2 }}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
            </div>

            <DetailSection title="IDENTIFICAÇÃO">
              <DetailRow label="Marca / Modelo" value={`${selected.brand} ${selected.model}`} />
              <DetailRow label="Ano" value={String(selected.year)} />
              {selected.plate && <DetailRow label="Placa" value={selected.plate} mono />}
              {selected.serialNumber && <DetailRow label="Nº de Série" value={selected.serialNumber} mono />}
              <DetailRow label="Categoria" value={selected.category} />
            </DetailSection>

            <DetailSection title="OPERACIONAL">
              <DetailRow label="Responsável" value={selected.responsible} />
              <DetailRow label="Localização" value={selected.location} />
              {selected.mileage && <DetailRow label="Hodômetro" value={`${selected.mileage.toLocaleString('pt-BR')} km`} mono />}
            </DetailSection>

            <DetailSection title="MANUTENÇÃO">
              <DetailRow label="Última inspeção" value={new Date(selected.lastInspection).toLocaleDateString('pt-BR')} mono />
              <DetailRow label="Próxima manutenção" value={new Date(selected.nextMaintenance).toLocaleDateString('pt-BR')} mono />
              <DetailRow
                label="Prazo"
                value={selected.daysUntilMaintenance < 0
                  ? `${Math.abs(selected.daysUntilMaintenance)} dias em atraso`
                  : `${selected.daysUntilMaintenance} dias restantes`}
                valueColor={selected.daysUntilMaintenance < 0 ? 'var(--status-overdue)' : selected.daysUntilMaintenance <= 7 ? 'var(--status-critical)' : undefined}
              />
            </DetailSection>

            {selected.notes && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 3, padding: '10px 12px' }}>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--status-warning)', marginBottom: 4, letterSpacing: '0.06em' }}>OBSERVAÇÃO</div>
                <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{selected.notes}</div>
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Registrar Manutenção
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 3,
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        border: `1px solid ${active ? (color || 'var(--primary)') : 'var(--border)'}`,
        background: active ? (color ? `${color}18` : 'rgba(59,130,246,0.12)') : 'var(--card)',
        color: active ? (color || 'var(--primary)') : 'var(--muted-foreground)',
      }}
    >
      {label}
    </button>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>{label}</span>
      <span className={mono ? 'font-mono' : ''} style={{ fontSize: 12, color: valueColor || 'var(--foreground)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}
