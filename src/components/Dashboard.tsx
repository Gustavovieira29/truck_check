import { useEffect, useState } from 'react'
import { apiUrl } from '../config'
import { ASSETS, INSPECTIONS, MAINTENANCES, type Asset, type InspectionReport, type MaintenanceRecord } from '../data/mockData'

type Page = 'dashboard' | 'assets' | 'maintenance' | 'inspection' | 'reports'

interface Props {
  onNavigate: (page: Page) => void
}

const STATUS_LABELS: Record<string, string> = {
  ok: 'Regular',
  warning: 'Atenção',
  critical: 'Crítico',
  overdue: 'Vencido',
  inactive: 'Inativo',
}

export default function Dashboard({ onNavigate }: Props) {
  const [assets, setAssets] = useState<Asset[]>(ASSETS)
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>(MAINTENANCES)
  const [inspections, setInspections] = useState<InspectionReport[]>(INSPECTIONS)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([fetch(apiUrl('/api/assets')), fetch(apiUrl('/api/maintenance')), fetch(apiUrl('/api/inspections'))])
      .then(async ([assetsResponse, maintenanceResponse, inspectionsResponse]) => {
        if (!assetsResponse.ok || !maintenanceResponse.ok || !inspectionsResponse.ok) return
        const [assetsData, maintenanceData, inspectionsData] = await Promise.all([assetsResponse.json(), maintenanceResponse.json(), inspectionsResponse.json()])
        setAssets(assetsData as Asset[])
        setMaintenances(maintenanceData as MaintenanceRecord[])
        setInspections((inspectionsData as Array<InspectionReport & { aiFindings: string | string[] }>).map(item => ({
          ...item,
          aiFindings: Array.isArray(item.aiFindings) ? item.aiFindings : (item.aiFindings || '').split('\n').filter(Boolean),
        })))
      })
      .catch(() => undefined)
  }, [])

  const visibleAssets = assets.filter(asset => {
    const term = search.trim().toLowerCase()
    return !term || [asset.name, asset.code, asset.responsible, asset.location].some(value => value.toLowerCase().includes(term))
  })

  const total = visibleAssets.length
  const ok = visibleAssets.filter(a => a.status === 'ok').length
  const warning = visibleAssets.filter(a => a.status === 'warning').length
  const critical = visibleAssets.filter(a => a.status === 'critical').length
  const overdue = visibleAssets.filter(a => a.status === 'overdue').length
  const inactive = visibleAssets.filter(a => a.status === 'inactive').length
  const today = new Date().toISOString().slice(0, 10)

  const overdueMaints = maintenances.filter(m => m.status === 'overdue').length
  const upcomingMaints = maintenances.filter(m => m.status !== 'completed' && m.scheduledDate > today && m.scheduledDate <= new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)).length
  const inProgress = maintenances.filter(m => m.status === 'in_progress').length

  const urgentAssets = assets.filter(a => a.status === 'overdue')
  const upcoming = maintenances
    .filter(m => m.status !== 'completed' && m.scheduledDate > today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <input
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Pesquisar ativo, código, responsável ou local..."
        aria-label="Pesquisar ativos no dashboard"
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: '9px 12px', color: 'var(--foreground)', fontSize: 13 }}
      />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <KpiCard label="Total de Ativos" value={total} sub="veículos + ferramentas" color="var(--foreground)" />
        <KpiCard label="Regulares" value={ok} sub={`${total ? Math.round(ok / total * 100) : 0}% da frota`} color="var(--status-ok)" onClick={() => onNavigate('assets')} />
        <KpiCard label="Atenção" value={warning} sub="próximos ao vencimento" color="var(--status-warning)" onClick={() => onNavigate('assets')} />
        <KpiCard label="Críticos / Vencidos" value={critical + overdue} sub="requer ação imediata" color="var(--status-critical)" onClick={() => onNavigate('assets')} />
        <KpiCard label="Manutenções Vencidas" value={overdueMaints} sub="atraso" color="var(--status-overdue)" onClick={() => onNavigate('maintenance')} />
        <KpiCard label="Próximos 7 dias" value={upcomingMaints} sub="agendamentos" color="var(--status-warning)" onClick={() => onNavigate('maintenance')} />
      </div>

      {/* Fleet health bar */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
            SAÚDE DA FROTA
          </span>
          <span className="font-mono" style={{ fontSize: 11, color: ok > total/2 ? 'var(--status-ok)' : 'var(--status-warning)' }}>
            {total ? Math.round(ok / total * 100) : 0}% OPERACIONAL
          </span>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
          {ok > 0 && <div style={{ flex: ok, background: 'var(--status-ok)' }} title={`Regular: ${ok}`} />}
          {warning > 0 && <div style={{ flex: warning, background: 'var(--status-warning)' }} title={`Atenção: ${warning}`} />}
          {critical > 0 && <div style={{ flex: critical, background: 'var(--status-critical)' }} title={`Crítico: ${critical}`} />}
          {overdue > 0 && <div style={{ flex: overdue, background: 'var(--status-overdue)' }} title={`Vencido: ${overdue}`} />}
          {inactive > 0 && <div style={{ flex: inactive, background: 'var(--status-inactive)' }} title={`Inativo: ${inactive}`} />}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          {[
            { label: 'Regular', val: ok, color: 'var(--status-ok)' },
            { label: 'Atenção', val: warning, color: 'var(--status-warning)' },
            { label: 'Crítico', val: critical, color: 'var(--status-critical)' },
            { label: 'Vencido', val: overdue, color: 'var(--status-overdue)' },
            { label: 'Inativo', val: inactive, color: 'var(--status-inactive)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{s.label}</span>
              <span className="font-mono" style={{ fontSize: 12, color: 'var(--foreground)', fontWeight: 500 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Urgent */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
              AÇÃO IMEDIATA
            </span>
            <span style={{ fontSize: 11, color: 'var(--status-overdue)' }}>⚠ {urgentAssets.length} ativo(s)</span>
          </div>
          <div style={{ padding: 8 }}>
            {urgentAssets.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                Nenhum ativo crítico
              </div>
            ) : (
              urgentAssets.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 3,
                    marginBottom: 2,
                    background: a.status === 'overdue' ? 'rgba(220,38,38,0.06)' : 'rgba(239,68,68,0.04)',
                    borderLeft: `2px solid ${a.status === 'overdue' ? 'var(--status-overdue)' : 'var(--status-critical)'}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                      {a.code} · {a.notes || `Próxima manutenção: ${new Date(a.nextMaintenance).toLocaleDateString('pt-BR')}`}
                    </div>
                  </div>
                  <span className={`badge-${a.status}`} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 2 }}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming maintenances */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
              PRÓXIMAS MANUTENÇÕES
            </span>
            <button onClick={() => onNavigate('maintenance')} style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Ver todas →
            </button>
          </div>
          <div style={{ padding: 8 }}>
            {upcoming.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                Nenhuma manutenção futura programada.
              </div>
            ) : upcoming.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 3,
                  marginBottom: 2,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{m.assetName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {m.description.substring(0, 50)}…
                  </div>
                </div>
                <div className="font-mono" style={{ fontSize: 12, color: m.daysUntil <= 3 ? 'var(--status-critical)' : m.daysUntil <= 7 ? 'var(--status-warning)' : 'var(--muted-foreground)', textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  {new Date(`${m.scheduledDate}T00:00:00`).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent inspections */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
            ÚLTIMAS INSPEÇÕES POR IA
          </span>
          <button onClick={() => onNavigate('inspection')} style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Ver todas →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {inspections.slice(0, 3).map((ins, i) => (
            <div key={ins.id} style={{ padding: '16px 20px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{ins.assetCode}</span>
                <ScoreRing score={ins.aiScore} status={ins.aiStatus} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 4 }}>{ins.assetName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8 }}>
                {new Date(ins.date).toLocaleDateString('pt-BR')} · {ins.inspector}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                {ins.aiFindings[0]}
                {ins.aiFindings.length > 1 && ` +${ins.aiFindings.length - 1} observações`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color, onClick }: { label: string; value: number; sub: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)')}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
    >
      <div className="font-mono" style={{ fontSize: 28, fontWeight: 300, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)', marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function ScoreRing({ score, status }: { score: number; status: string }) {
  const color = status === 'ok' ? 'var(--status-ok)' : status === 'warning' ? 'var(--status-warning)' : 'var(--status-critical)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span className="font-mono" style={{ fontSize: 16, fontWeight: 500, color }}>{score}</span>
      <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>pts</span>
    </div>
  )
}
