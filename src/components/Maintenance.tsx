import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ASSETS, MAINTENANCES, type Asset, type MaintenanceRecord } from '../data/mockData'

const API_URL = 'http://localhost:3001/maintenances'

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
  const [maintenances, setMaintenances] = useState(MAINTENANCES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadMaintenances() {
      try {
        const response = await fetch(API_URL)
        if (!response.ok) {
          throw new Error('Falha ao carregar manutenções')
        }

        const data = await response.json() as MaintenanceRecord[]
        if (isMounted) {
          setMaintenances(data)
        }
      } catch {
        toast.error('Não foi possível carregar da API', {
          description: 'Usando dados locais temporariamente. Inicie o json-server para persistência.',
        })
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMaintenances()

    return () => {
      isMounted = false
    }
  }, [])

  const sorted = [...maintenances].sort((a, b) => a.daysUntil - b.daysUntil)
  const filtered = sorted.filter(m => statusFilter === 'all' || m.status === statusFilter)

  const countsByStatus = {
    overdue: maintenances.filter(m => m.status === 'overdue').length,
    in_progress: maintenances.filter(m => m.status === 'in_progress').length,
    scheduled: maintenances.filter(m => m.status === 'scheduled').length,
    completed: maintenances.filter(m => m.status === 'completed').length,
  }

  const totalCost = maintenances
    .filter(m => m.cost && m.status !== 'cancelled')
    .reduce((acc, m) => acc + (m.cost || 0), 0)

  const overdueAssets = ASSETS.filter(asset => asset.daysUntilMaintenance < 0)

  const handleCreateMaintenance = async (record: MaintenanceRecord) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      })

      if (!response.ok) {
        throw new Error('Falha ao salvar manutenção')
      }

      const savedRecord = await response.json() as MaintenanceRecord
      setMaintenances(current => [savedRecord, ...current])
      setShowModal(false)

      toast.success('Manutenção adicionada', {
        description: `${savedRecord.assetCode} · ${savedRecord.assetName}`,
      })

      if (savedRecord.daysUntil < 0) {
        toast.warning('Ativo com manutenção atrasada', {
          description: `${savedRecord.assetCode} entrou na lista como vencido.`,
        })
      } else {
        toast.info('Manutenção programada', {
          description: `${savedRecord.description.slice(0, 48)}${savedRecord.description.length > 48 ? '...' : ''}`,
        })
      }
    } catch {
      toast.error('Falha ao salvar manutenção', {
        description: 'Verifique se o json-server está rodando em localhost:3001.',
      })
    }
  }

  const handleDeleteMaintenance = async (record: MaintenanceRecord) => {
    try {
      const response = await fetch(`${API_URL}/${record.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Falha ao excluir manutenção')
      }

      setMaintenances(current => current.filter(item => item.id !== record.id))

      toast.success('Manutenção excluída', {
        description: `${record.assetCode} · ${record.assetName}`,
      })
    } catch {
      toast.error('Falha ao excluir manutenção', {
        description: 'Verifique se o json-server está rodando em localhost:3001.',
      })
    }
  }

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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                  Nenhuma manutenção encontrada.
                </td>
              </tr>
            )}
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
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      void handleDeleteMaintenance(m)
                    }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
            {isLoading ? 'Carregando manutenções...' : `${filtered.length} registro(s) · Custo total previsto: R$ ${totalCost.toLocaleString('pt-BR')}`}
          </span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <NewMaintenanceModal
          overdueAssets={overdueAssets}
          onClose={() => setShowModal(false)}
          onSave={handleCreateMaintenance}
        />
      )}
    </div>
  )
}

type NewMaintenanceModalProps = {
  overdueAssets: Asset[]
  onClose: () => void
  onSave: (record: MaintenanceRecord) => void | Promise<void>
}

function NewMaintenanceModal({ overdueAssets, onClose, onSave }: NewMaintenanceModalProps) {
  const fallbackAssets = overdueAssets.length > 0 ? overdueAssets : ASSETS
  const [selectedAssetId, setSelectedAssetId] = useState(fallbackAssets[0]?.id ?? '')
  const [type, setType] = useState<MaintenanceRecord['type']>('preventive')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [responsible, setResponsible] = useState(fallbackAssets[0]?.responsible ?? '')
  const [cost, setCost] = useState('')
  const [provider, setProvider] = useState('')

  const selectedAsset = fallbackAssets.find(asset => asset.id === selectedAssetId) ?? fallbackAssets[0]

  const handleAssetChange = (assetId: string) => {
    setSelectedAssetId(assetId)
    const nextAsset = fallbackAssets.find(asset => asset.id === assetId)
    if (nextAsset) {
      setResponsible(nextAsset.responsible)
      if (!description) {
        setDescription(`Regularização de manutenção pendente para ${nextAsset.name}`)
      }
    }
  }

  const handleSubmit = () => {
    if (!selectedAsset) {
      toast.error('Nenhum ativo disponível para manutenção')
      return
    }

    if (!description.trim() || !responsible.trim() || !scheduledDate) {
      toast.error('Preencha os campos obrigatórios', {
        description: 'Ativo, data, descrição e responsável são obrigatórios.',
      })
      return
    }

    const targetDate = new Date(`${scheduledDate}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const record: MaintenanceRecord = {
      id: `m-${Date.now()}`,
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      assetCode: selectedAsset.code,
      type,
      description: description.trim(),
      scheduledDate,
      responsible: responsible.trim(),
      status: daysUntil < 0 ? 'overdue' : 'scheduled',
      provider: provider.trim() || undefined,
      cost: cost.trim() ? Number(cost) : undefined,
      daysUntil,
    }

    onSave(record)
  }

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
            <select
              style={selectStyle}
              value={selectedAssetId}
              onChange={e => handleAssetChange(e.target.value)}
            >
              {fallbackAssets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} — {asset.name}
                </option>
              ))}
            </select>
          </ModalField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ModalField label="Tipo">
              <select style={selectStyle} value={type} onChange={e => setType(e.target.value as MaintenanceRecord['type'])}>
                <option value="preventive">Preventiva</option>
                <option value="corrective">Corretiva</option>
                <option value="inspection">Inspeção</option>
                <option value="calibration">Calibração</option>
              </select>
            </ModalField>
            <ModalField label="Data programada">
              <input type="date" style={inputStyle} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </ModalField>
          </div>
          <ModalField label="Descrição">
            <textarea
              rows={3}
              placeholder="Descreva a manutenção a ser realizada…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
            />
          </ModalField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ModalField label="Responsável">
              <input style={inputStyle} placeholder="Nome do responsável" value={responsible} onChange={e => setResponsible(e.target.value)} />
            </ModalField>
            <ModalField label="Custo previsto (R$)">
              <input type="number" style={inputStyle} placeholder="0,00" value={cost} onChange={e => setCost(e.target.value)} />
            </ModalField>
          </div>
          <ModalField label="Fornecedor / Oficina">
            <input style={inputStyle} placeholder="Nome do fornecedor (opcional)" value={provider} onChange={e => setProvider(e.target.value)} />
          </ModalField>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Salvar Manutenção</button>
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
