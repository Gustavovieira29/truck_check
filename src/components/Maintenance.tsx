import { useState } from 'react'
import { MAINTENANCES, type MaintenanceRecord } from '../data/mockData'

const STATUS_MAP: Record<MaintenanceRecord['status'], { label: string; badge: string }> = {
  scheduled: { label: 'Agendado', badge: 'badge-inactive' },
  in_progress: { label: 'Em andamento', badge: 'badge-warning' },
  completed: { label: 'Concluído', badge: 'badge-ok' },
  overdue: { label: 'Vencido', badge: 'badge-overdue' },
  cancelled: { label: 'Cancelado', badge: 'badge-inactive' },
}

const TYPE_MAP: Record<MaintenanceRecord['type'], string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  inspection: 'Inspeção',
  calibration: 'Calibração',
}

export default function Maintenance() {
  const [statusFilter, setStatusFilter] = useState<MaintenanceRecord['status'] | 'all'>('all')
  const [showModal, setShowModal] = useState(false)

  const sorted = [...MAINTENANCES].sort((a, b) => a.daysUntil - b.daysUntil)
  const filtered = sorted.filter(m => statusFilter === 'all' || m.status === statusFilter)

  const countsByStatus = {
    overdue: MAINTENANCES.filter(m => m.status === 'overdue').length,
    in_progress: MAINTENANCES.filter(m => m.status === 'in_progress').length,
    scheduled: MAINTENANCES.filter(m => m.status === 'scheduled').length,
    completed: MAINTENANCES.filter(m => m.status === 'completed').length,
  }

  const totalCost = MAINTENANCES
    .filter(m => m.cost && m.status !== 'cancelled')
    .reduce((acc, m) => acc + (m.cost || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Vencidas', value: countsByStatus.overdue, color: 'var(--status-overdue)', status: 'overdue' as const },
          { label: 'Em andamento', value: countsByStatus.in_progress, color: 'var(--status-warning)', status: 'in_progress' as const },
          { label: 'Agendadas', value: countsByStatus.scheduled, color: 'var(--primary)', status: 'scheduled' as const },
          { label: 'Custo previsto', value: `R$ ${totalCost.toLocaleString('pt-BR')}`, color: 'var(--foreground)', status: null },
        ].map(card => (
          <div
            key={card.label}
            onClick={() => card.status && setStatusFilter(s => s === card.status ? 'all' : card.status!)}
            style={{
              background: 'var(--card)',
              border: `1px solid ${statusFilter === card.status ? card.color : 'var(--border)'}`,
              borderRadius: 4,
              padding: '14px 18px',
              cursor: card.status ? 'pointer' : 'default',
              transition: 'border-color 0.15s',
            }}
          >
            <div className="font-mono" style={{ fontSize: 24, fontWeight: 300, color: card.color, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'overdue', 'in_progress', 'scheduled', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 3,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                border: `1px solid ${statusFilter === s ? 'var(--primary)' : 'var(--border)'}`,
                background: statusFilter === s ? 'rgba(59,130,246,0.12)' : 'var(--card)',
                color: statusFilter === s ? 'var(--primary)' : 'var(--muted-foreground)',
                transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? 'Todas' : STATUS_MAP[s]?.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Nova Manutenção
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Prazo</th>
              <th>Ativo</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Responsável</th>
              <th>Fornecedor</th>
              <th>Custo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td style={{ minWidth: 100 }}>
                  <div className="font-mono" style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: m.daysUntil < 0 ? 'var(--status-overdue)' :
                      m.daysUntil === 0 ? 'var(--status-critical)' :
                      m.daysUntil <= 3 ? 'var(--status-critical)' :
                      m.daysUntil <= 7 ? 'var(--status-warning)' : 'var(--foreground)',
                  }}>
                    {m.daysUntil < 0 ? `−${Math.abs(m.daysUntil)}d` : m.daysUntil === 0 ? 'HOJE' : `+${m.daysUntil}d`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {new Date(m.scheduledDate).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{m.assetName}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 1 }}>{m.assetCode}</div>
                </td>
                <td>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 2,
                    background: 'var(--secondary)',
                    color: 'var(--secondary-foreground)',
                    border: '1px solid var(--border)',
                  }}>
                    {TYPE_MAP[m.type]}
                  </span>
                </td>
                <td style={{ maxWidth: 280 }}>
                  <span style={{ fontSize: 12, color: 'var(--foreground)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.description}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{m.responsible}</span>
                </td>
                <td>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{m.provider || '—'}</span>
                </td>
                <td>
                  {m.cost ? (
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--foreground)' }}>
                      R$ {m.cost.toLocaleString('pt-BR')}
                    </span>
                  ) : <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                </td>
                <td>
                  <span className={STATUS_MAP[m.status].badge} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2, fontWeight: 500 }}>
                    {STATUS_MAP[m.status].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
            {filtered.length} registro(s) · Custo total previsto: R$ {totalCost.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Modal */}
      {showModal && <NewMaintenanceModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

function NewMaintenanceModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4,
          width: 500, padding: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Nova Manutenção</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ModalField label="Ativo">
            <select style={selectStyle}>
              <option>VEI-001 — Caminhão Mercedes Atego</option>
              <option>VEI-002 — Van Fiorino Cargo</option>
              <option>FER-001 — Guindaste Manual 3T</option>
            </select>
          </ModalField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ModalField label="Tipo">
              <select style={selectStyle}>
                <option>Preventiva</option>
                <option>Corretiva</option>
                <option>Inspeção</option>
                <option>Calibração</option>
              </select>
            </ModalField>
            <ModalField label="Data programada">
              <input type="date" style={inputStyle} defaultValue="2025-08-15" />
            </ModalField>
          </div>
          <ModalField label="Descrição">
            <textarea
              rows={3}
              placeholder="Descreva a manutenção a ser realizada…"
              style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
            />
          </ModalField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ModalField label="Responsável">
              <input style={inputStyle} placeholder="Nome do responsável" />
            </ModalField>
            <ModalField label="Custo previsto (R$)">
              <input type="number" style={inputStyle} placeholder="0,00" />
            </ModalField>
          </div>
          <ModalField label="Fornecedor / Oficina">
            <input style={inputStyle} placeholder="Nome do fornecedor (opcional)" />
          </ModalField>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onClose}>Salvar Manutenção</button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--secondary)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '7px 10px',
  color: 'var(--foreground)',
  fontSize: 13,
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}
