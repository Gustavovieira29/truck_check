import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch, apiUrl } from '../config'

type Usuario = { id: number; nome: string; email: string; perfil: string; ativo: boolean }

const API_URL = apiUrl('/api/usuarios')
const emptyForm = { nome: '', email: '', password: '', perfil: 'usuario' }

export default function Users() {
  const [users, setUsers] = useState<Usuario[]>([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadUsers = async () => {
    try {
      const response = await apiFetch(API_URL)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setUsers(await response.json() as Usuario[])
    } catch (error) {
      toast.error('Falha ao carregar usuários', { description: error instanceof Error ? error.message : 'Erro inesperado.' })
    }
  }

  useEffect(() => { void loadUsers() }, [])

  const update = (field: keyof typeof emptyForm, value: string) => setForm(current => ({ ...current, [field]: value }))

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await apiFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json() as { detail?: string | { msg: string }[] }
      if (!response.ok) throw new Error((Array.isArray(result.detail) ? result.detail[0]?.msg : result.detail) || `HTTP ${response.status}`)
      toast.success('Usuário cadastrado')
      setForm(emptyForm)
      await loadUsers()
    } catch (error) {
      toast.error('Não foi possível cadastrar', { description: error instanceof Error ? error.message : 'Erro inesperado.' })
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (user: Usuario) => {
    if (!window.confirm(`Excluir o usuário ${user.nome}?`)) return
    try {
      const response = await apiFetch(`${API_URL}/${user.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json() as { detail?: string }
        throw new Error(result.detail || `HTTP ${response.status}`)
      }
      toast.success('Usuário excluído')
      await loadUsers()
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : 'Erro inesperado.' })
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
      <section style={panelStyle}>
        <h2 style={headingStyle}>Novo usuário</h2>
        <form onSubmit={event => void createUser(event)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome"><input required value={form.nome} onChange={event => update('nome', event.target.value)} style={inputStyle} /></Field>
          <Field label="E-mail"><input required type="email" value={form.email} onChange={event => update('email', event.target.value)} style={inputStyle} /></Field>
          <Field label="Senha (mín. 6 caracteres)"><input required type="password" minLength={6} value={form.password} onChange={event => update('password', event.target.value)} style={inputStyle} /></Field>
          <Field label="Perfil">
            <select value={form.perfil} onChange={event => update('perfil', event.target.value)} style={inputStyle}>
              <option value="usuario">Usuário</option>
              <option value="master">Master</option>
            </select>
          </Field>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: 'center' }}>{saving ? 'Salvando...' : 'Cadastrar usuário'}</button>
        </form>
      </section>
      <section style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><h2 style={headingStyle}>Usuários cadastrados</h2></div>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ações</th></tr></thead>
          <tbody>{users.length === 0 ? <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)' }}>Nenhum usuário cadastrado.</td></tr> : users.map(user => (
            <tr key={user.id}><td>{user.nome}</td><td>{user.email}</td><td><span className={user.perfil === 'master' ? 'badge-warning' : 'badge-ok'}>{user.perfil === 'master' ? 'Master' : 'Usuário'}</span></td><td><button className="btn btn-ghost" onClick={() => void deleteUser(user)}>Excluir</button></td></tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{label}{children}</label>
}

const panelStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: 20 }
const headingStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 16 }
const inputStyle: React.CSSProperties = { width: '100%', marginTop: 5, padding: '7px 10px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--secondary)', color: 'var(--foreground)', outline: 'none' }
