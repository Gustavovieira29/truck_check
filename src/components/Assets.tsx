import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiUrl } from '../config'
import { ASSETS, type Asset, type AssetType, type StatusType } from '../data/mockData'

const API_URL = apiUrl('/api/assets')

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
  const [assets, setAssets] = useState<Asset[]>(ASSETS)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusType | 'all'>('all')
  const [viewMode, setViewMode] = useState<'all' | 'vehicles'>('all')
  const [selected, setSelected] = useState<Asset | null>(null)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Asset | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadAssets() {
      try {
        const response = await fetch(API_URL)
        if (!response.ok) {
          throw new Error('Falha ao carregar ativos')
        }

        const data = await response.json() as Asset[]
        if (isMounted) {
          setAssets(data)
        }
      } catch {
        toast.error('Não foi possível carregar os ativos da API', {
          description: 'Usando dados locais temporariamente. Verifique se a API está ativa.',
        })
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadAssets()

    return () => {
      isMounted = false
    }
  }, [])

  const filtered = assets.filter(a => {
    const matchSearch = search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.responsible.toLowerCase().includes(search.toLowerCase())
    const effectiveTypeFilter = viewMode === 'vehicles' ? 'vehicle' : typeFilter
    const matchType = effectiveTypeFilter === 'all' || a.type === effectiveTypeFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const vehicleCount = assets.filter(asset => asset.type === 'vehicle').length

  const handleOpenCreateVehicle = () => {
    setEditingVehicle(null)
    setShowVehicleModal(true)
  }

  const handleOpenEditVehicle = () => {
    if (!selected) {
      toast.error('Selecione um veículo para editar')
      return
    }

    setEditingVehicle(selected)
    setShowVehicleModal(true)
  }

  const handleSaveVehicle = async (vehicle: Asset) => {
    const isEditing = Boolean(editingVehicle)
    const url = isEditing ? `${API_URL}/${vehicle.id}` : API_URL
    const method = isEditing ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicle),
      })

      if (!response.ok) {
        throw new Error('Falha ao salvar veículo')
      }

      const savedVehicle = await response.json() as Asset

      setAssets(current => {
        if (isEditing) {
          return current.map(item => item.id === savedVehicle.id ? savedVehicle : item)
        }

        return [savedVehicle, ...current]
      })

      setSelected(savedVehicle)
      setShowVehicleModal(false)
      setEditingVehicle(null)

      toast.success(isEditing ? 'Ativo atualizado' : 'Ativo adicionado', {
        description: `${savedVehicle.code} · ${savedVehicle.name}`,
      })
    } catch {
      toast.error('Falha ao salvar veículo', {
        description: 'Verifique se a API está rodando em 127.0.0.1:8000.',
      })
    }
  }

  const handleDeleteVehicle = async () => {
    if (!selected) {
      toast.error('Selecione um veículo para excluir')
      return
    }

    try {
      const response = await fetch(`${API_URL}/${selected.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Falha ao excluir veículo')
      }

      setAssets(current => current.filter(item => item.id !== selected.id))
      toast.success('Ativo excluído', {
        description: `${selected.code} · ${selected.name}`,
      })
      setSelected(null)
    } catch {
      toast.error('Falha ao excluir veículo', {
        description: 'Verifique se a API está rodando em 127.0.0.1:8000.',
      })
    }
  }

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
          <FilterPill label="Todos" active={viewMode === 'all' && typeFilter === 'all'} onClick={() => { setViewMode('all'); setTypeFilter('all') }} />
          <FilterPill label={`Só Veículos (${vehicleCount})`} active={viewMode === 'vehicles'} onClick={() => setViewMode('vehicles')} />
          <FilterPill label="Veículos" active={viewMode === 'all' && typeFilter === 'vehicle'} onClick={() => { setViewMode('all'); setTypeFilter('vehicle') }} />
          <FilterPill label="Ferramentas" active={typeFilter === 'tool'} onClick={() => setTypeFilter('tool')} />
          <FilterPill label="Equipamentos" active={typeFilter === 'equipment'} onClick={() => setTypeFilter('equipment')} />
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <FilterPill label="OK" active={statusFilter === 'ok'} onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')} color="var(--status-ok)" />
          <FilterPill label="Atenção" active={statusFilter === 'warning'} onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')} color="var(--status-warning)" />
          <FilterPill label="Crítico" active={statusFilter === 'critical'} onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')} color="var(--status-critical)" />
          <FilterPill label="Vencido" active={statusFilter === 'overdue'} onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')} color="var(--status-overdue)" />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" type="button" onClick={handleDeleteVehicle}>
              Excluir Ativo
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleOpenEditVehicle}>
              Editar Ativo
            </button>
            <button className="btn btn-primary" type="button" onClick={handleOpenCreateVehicle}>
              + Novo Ativo
            </button>
          </div>
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
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      Nenhum ativo encontrado.
                    </td>
                  </tr>
                )}
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
              {isLoading ? 'Carregando ativos...' : `${filtered.length} de ${assets.length} ativos`}
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
            <button className="btn btn-secondary" type="button" style={{ width: '100%', justifyContent: 'center' }} onClick={handleOpenEditVehicle}>
              Editar Ativo
            </button>
            <button className="btn btn-ghost" type="button" style={{ width: '100%', justifyContent: 'center' }} onClick={handleDeleteVehicle}>
              Excluir Ativo
            </button>
          </div>
        </div>
      )}

      {showVehicleModal && (
        <VehicleModal
          asset={editingVehicle}
          onClose={() => {
            setShowVehicleModal(false)
            setEditingVehicle(null)
          }}
          onSave={handleSaveVehicle}
        />
      )}
    </div>
  )
}

type VehicleModalProps = {
  asset: Asset | null
  onClose: () => void
  onSave: (vehicle: Asset) => void | Promise<void>
}

function VehicleModal({ asset, onClose, onSave }: VehicleModalProps) {
  const [form, setForm] = useState({
    code: asset?.code ?? `VEI-${String(Date.now()).slice(-3)}`,
    name: asset?.name ?? '',
    category: asset?.category ?? 'Veículo',
    plate: asset?.plate ?? '',
    responsible: asset?.responsible ?? '',
    location: asset?.location ?? '',
    status: asset?.status ?? 'ok',
    brand: asset?.brand ?? '',
    model: asset?.model ?? '',
    year: String(asset?.year ?? new Date().getFullYear()),
    mileage: asset?.mileage ? String(asset.mileage) : '',
    nextMaintenance: asset?.nextMaintenance ?? new Date().toISOString().slice(0, 10),
    lastInspection: asset?.lastInspection ?? new Date().toISOString().slice(0, 10),
    notes: asset?.notes ?? '',
    type: asset?.type ?? 'vehicle',
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const handleSubmit = () => {
    const missingFields = [
      !form.code.trim() && 'Código',
      !form.name.trim() && 'Nome',
      !form.responsible.trim() && 'Responsável',
      !form.location.trim() && 'Localização',
      !form.brand.trim() && 'Marca',
      !form.model.trim() && 'Modelo',
      !form.year.trim() && 'Ano',
      !form.nextMaintenance && 'Próxima manutenção',
    ].filter(Boolean)
    if (missingFields.length > 0) {
      toast.error('Campos obrigatórios não preenchidos', { description: missingFields.join(', ') })
      return
    }

    const normalizedPlate = form.plate.trim().toUpperCase()
    const platePattern = /^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/
    if (normalizedPlate && !platePattern.test(normalizedPlate)) {
      toast.error('Placa inválida', {
        description: 'Use o formato ABC-1D23 ou ABC1234.',
      })
      return
    }

    const year = Number(form.year)
    if (!Number.isFinite(year) || year < 1950 || year > new Date().getFullYear() + 1) {
      toast.error('Ano inválido', {
        description: 'Informe um ano válido para o veículo.',
      })
      return
    }

    const mileage = form.mileage.trim() ? Number(form.mileage) : undefined
    if (form.mileage.trim() && (!Number.isFinite(mileage) || mileage < 0)) {
      toast.error('Hodômetro inválido', {
        description: 'O hodômetro deve ser um número positivo.',
      })
      return
    }

    const nextMaintenanceDate = new Date(`${form.nextMaintenance}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysUntilMaintenance = Math.ceil((nextMaintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const vehicle: Asset = {
      id: asset?.id ?? `a-${Date.now()}`,
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type as AssetType,
      category: form.category.trim(),
      plate: normalizedPlate || undefined,
      responsible: form.responsible.trim(),
      location: form.location.trim(),
      status: form.status as StatusType,
      lastInspection: form.lastInspection,
      nextMaintenance: form.nextMaintenance,
      daysUntilMaintenance,
      mileage,
      brand: form.brand.trim(),
      model: form.model.trim(),
      year,
      notes: form.notes.trim() || undefined,
    }

    void onSave(vehicle)
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
          width: 640, padding: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>{asset ? 'Editar Ativo' : 'Novo Ativo'}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <ModalField label="Tipo de ativo">
            <select style={inputStyle} value={form.type} onChange={e => handleChange('type', e.target.value)}>
              <option value="vehicle">Veículo</option>
              <option value="tool">Ferramenta</option>
              <option value="equipment">Equipamento</option>
            </select>
          </ModalField>
          <ModalField label="Código">
            <input required style={inputStyle} value={form.code} onChange={e => handleChange('code', e.target.value)} />
          </ModalField>
          <ModalField label="Nome">
            <input required style={inputStyle} value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </ModalField>
          <ModalField label="Marca">
            <input required style={inputStyle} value={form.brand} onChange={e => handleChange('brand', e.target.value)} />
          </ModalField>
          <ModalField label="Modelo">
            <input required style={inputStyle} value={form.model} onChange={e => handleChange('model', e.target.value)} />
          </ModalField>
          <ModalField label="Ano">
            <input required type="number" min="1950" max={new Date().getFullYear() + 1} style={inputStyle} value={form.year} onChange={e => handleChange('year', e.target.value)} />
          </ModalField>
          <ModalField label="Placa">
            <input
              style={inputStyle}
              value={form.plate}
              placeholder="ABC-1D23"
              title="Aceita placas Mercosul e antigas. Exemplo: ABC-1D23."
              onChange={e => handleChange('plate', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{3})(.{0,4}).*$/, '$1-$2'))}
            />
          </ModalField>
          <ModalField label="Responsável">
            <input required style={inputStyle} value={form.responsible} onChange={e => handleChange('responsible', e.target.value)} />
          </ModalField>
          <ModalField label="Localização">
            <input required style={inputStyle} value={form.location} onChange={e => handleChange('location', e.target.value)} />
          </ModalField>
          <ModalField label="Categoria">
            <input style={inputStyle} value={form.category} onChange={e => handleChange('category', e.target.value)} />
          </ModalField>
          <ModalField label="Hodômetro (km)">
            <input type="number" min="0" style={inputStyle} value={form.mileage} title="Informe somente quilômetros, sem ponto ou vírgula." onChange={e => handleChange('mileage', e.target.value)} />
          </ModalField>
          <ModalField label="Última inspeção">
            <input type="date" style={inputStyle} value={form.lastInspection} onChange={e => handleChange('lastInspection', e.target.value)} />
          </ModalField>
          <ModalField label="Próxima manutenção">
            <input required type="date" style={inputStyle} value={form.nextMaintenance} onChange={e => handleChange('nextMaintenance', e.target.value)} />
          </ModalField>
          <ModalField label="Status">
            <select style={inputStyle} value={form.status} onChange={e => handleChange('status', e.target.value)}>
              <option value="ok">Regular</option>
              <option value="warning">Atenção</option>
              <option value="critical">Crítico</option>
              <option value="overdue">Vencido</option>
              <option value="inactive">Inativo</option>
            </select>
          </ModalField>
          <ModalField label="Observações">
            <textarea rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
          </ModalField>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" type="button" onClick={handleSubmit}>{asset ? 'Salvar alterações' : 'Cadastrar ativo'}</button>
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

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
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
