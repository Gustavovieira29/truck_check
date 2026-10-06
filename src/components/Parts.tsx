import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiUrl } from '../config'

type Part = {
  id: number
  code: string
  name: string
  quantity: number
  minimumQuantity: number
  unit: string
  location?: string
  assetId?: number
}

const API_URL = apiUrl('/api/parts')

const emptyForm = { code: '', name: '', quantity: '0', minimumQuantity: '0', unit: 'un', location: '' }

export default function Parts() {
  const [parts, setParts] = useState<Part[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)

  const loadParts = async () => {
    try {
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setParts(await response.json() as Part[])
    } catch (error) {
      toast.error('Falha ao carregar estoque', { description: error instanceof Error ? error.message : 'Erro inesperado.' })
    }
  }

  useEffect(() => { void loadParts() }, [])

  const savePart = async () => {
    const missingFields = [!form.code.trim() && 'Código', !form.name.trim() && 'Nome', !form.unit.trim() && 'Unidade'].filter(Boolean)
    if (missingFields.length > 0) {
      toast.error('Campos obrigatórios não preenchidos', { description: missingFields.join(', ') })
      return
    }
    const quantity = Number(form.quantity)
    const minimumQuantity = Number(form.minimumQuantity)
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(minimumQuantity) || minimumQuantity < 0) {
      toast.error('Quantidade inválida', { description: 'Informe números inteiros iguais ou maiores que zero.' })
      return
    }

    try {
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, code: form.code.trim().toUpperCase(), name: form.name.trim(), quantity, minimumQuantity, location: form.location.trim() || null }),
      })
      if (!response.ok) throw new Error(await response.text())
      toast.success(editingId ? 'Peça atualizada' : 'Peça cadastrada')
      setForm(emptyForm)
      setEditingId(null)
      void loadParts()
    } catch (error) {
      toast.error('Falha ao salvar peça', { description: error instanceof Error ? error.message : 'Erro inesperado.' })
    }
  }

  const editPart = (part: Part) => {
    setEditingId(part.id)
    setForm({ code: part.code, name: part.name, quantity: String(part.quantity), minimumQuantity: String(part.minimumQuantity), unit: part.unit, location: part.location ?? '' })
  }

  const deletePart = async (part: Part) => {
    try {
      const response = await fetch(`${API_URL}/${part.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      toast.success('Peça excluída', { description: part.name })
      void loadParts()
    } catch (error) {
      toast.error('Falha ao excluir peça', { description: error instanceof Error ? error.message : 'Erro inesperado.' })
    }
  }

  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
      <section style={panelStyle}>
        <h2 style={headingStyle}>{editingId ? 'Editar Peça / Insumo' : 'Nova Peça / Insumo'}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Código" tip="Identificador único no estoque."><input required value={form.code} onChange={event => update('code', event.target.value)} style={inputStyle} placeholder="EX: FIL-001" /></Field>
          <Field label="Nome"><input required value={form.name} onChange={event => update('name', event.target.value)} style={inputStyle} placeholder="Ex: Filtro de óleo" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Quantidade"><input required type="number" min="0" step="1" value={form.quantity} onChange={event => update('quantity', event.target.value)} style={inputStyle} /></Field>
            <Field label="Estoque mínimo" tip="O item fica em atenção quando a quantidade é menor ou igual a este valor."><input required type="number" min="0" step="1" value={form.minimumQuantity} onChange={event => update('minimumQuantity', event.target.value)} style={inputStyle} /></Field>
          </div>
          <Field label="Unidade"><input required value={form.unit} onChange={event => update('unit', event.target.value)} style={inputStyle} placeholder="un, L, kg" /></Field>
          <Field label="Localização"><input value={form.location} onChange={event => update('location', event.target.value)} style={inputStyle} placeholder="Almoxarifado" /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            {editingId && <button className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(emptyForm) }}>Cancelar</button>}
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => void savePart()}>{editingId ? 'Salvar alterações' : 'Cadastrar peça'}</button>
          </div>
        </div>
      </section>
      <section style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><h2 style={headingStyle}>Estoque de Peças e Insumos</h2></div>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Código</th><th>Item</th><th>Estoque</th><th>Local</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>{parts.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)' }}>Nenhuma peça cadastrada.</td></tr> : parts.map(part => {
            const lowStock = part.quantity <= part.minimumQuantity
            return <tr key={part.id}><td className="font-mono">{part.code}</td><td>{part.name}</td><td>{part.quantity} {part.unit}</td><td>{part.location || '-'}</td><td><span className={lowStock ? 'badge-warning' : 'badge-ok'}>{lowStock ? 'Atenção' : 'Regular'}</span></td><td><button className="btn btn-ghost" onClick={() => editPart(part)}>Editar</button> <button className="btn btn-ghost" onClick={() => void deletePart(part)}>Excluir</button></td></tr>
          })}</tbody>
        </table>
      </section>
    </div>
  )
}

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return <label style={{ fontSize: 11, color: 'var(--muted-foreground)' }} title={tip}>{label}{children}</label>
}

const panelStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: 20 }
const headingStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 16 }
const inputStyle: React.CSSProperties = { width: '100%', marginTop: 5, padding: '7px 10px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--secondary)', color: 'var(--foreground)', outline: 'none' }