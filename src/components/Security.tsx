import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch, apiUrl } from '../config'

type Me = { nome: string; email: string; perfil: string; totpAtivo?: boolean }
type AuditItem = { id: number; criadoEm: string; evento: string; email: string | null; ip: string | null; detalhe: string | null }
type Setup = { secret: string; uri: string }

const EVENT_LABELS: Record<string, string> = {
  login_ok: 'Login realizado',
  login_falha: 'Falha de login',
  login_bloqueado: 'Login bloqueado',
  logout: 'Saída',
  master_criado: 'Master criado',
  master_negado: 'Criação de master negada',
  usuario_criado: 'Usuário criado',
  usuario_excluido: 'Usuário excluído',
  '2fa_ativado': '2FA ativado',
  '2fa_desativado': '2FA desativado',
}

const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: 20 }
const inputStyle = {
  background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 4,
  padding: '9px 10px', color: 'var(--foreground)', fontSize: 13,
}

async function detailOf(response: Response): Promise<string> {
  try {
    const result = await response.json() as { detail?: string | { msg: string }[] }
    return (Array.isArray(result.detail) ? result.detail[0]?.msg : result.detail) || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

export default function Security({ isMaster }: { isMaster: boolean }) {
  const [me, setMe] = useState<Me | null>(null)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const [audit, setAudit] = useState<AuditItem[]>([])

  const loadMe = useCallback(async () => {
    const response = await apiFetch(apiUrl('/api/usuarios/me'))
    if (response.ok) setMe(await response.json() as Me)
  }, [])

  const loadAudit = useCallback(async () => {
    if (!isMaster) return
    const response = await apiFetch(apiUrl('/api/usuarios/auditoria'))
    if (response.ok) setAudit(await response.json() as AuditItem[])
  }, [isMaster])

  useEffect(() => { void loadMe(); void loadAudit() }, [loadMe, loadAudit])

  const post = async (path: string, body?: object) => {
    const response = await apiFetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) throw new Error(await detailOf(response))
    return response
  }

  const startSetup = async () => {
    try {
      const response = await post('/api/auth/2fa/setup')
      setSetup(await response.json() as Setup)
    } catch (error) {
      toast.error('Não foi possível iniciar o 2FA', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const finish = async (path: string, message: string) => {
    try {
      await post(path, { code })
      toast.success(message)
      setSetup(null)
      setCode('')
      await loadMe()
      await loadAudit()
    } catch (error) {
      toast.error('Código inválido', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960 }}>
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--foreground)', fontSize: 16, marginBottom: 6 }}>Verificação em duas etapas (2FA)</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
          Use um aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy). Mesmo que descubram sua senha, ninguém entra sem o código do seu celular.
        </p>

        {!me && <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Carregando...</div>}

        {me && !me.totpAtivo && !setup && (
          <button className="btn btn-primary" type="button" onClick={() => void startSetup()}>Ativar 2FA</button>
        )}

        {me && !me.totpAtivo && setup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              No aplicativo, adicione uma conta manualmente com esta chave (tipo: baseada em tempo):
            </div>
            <code className="font-mono" style={{ ...inputStyle, userSelect: 'all', letterSpacing: '0.1em' }}>{setup.secret}</code>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Depois digite o código de 6 dígitos que o aplicativo mostrar:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" style={{ ...inputStyle, width: 140 }} />
              <button className="btn btn-primary" type="button" onClick={() => void finish('/api/auth/2fa/enable', '2FA ativado')}>Confirmar</button>
            </div>
          </div>
        )}

        {me && me.totpAtivo && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge-ok" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 2 }}>2FA ativo</span>
            <input value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="Código para desativar" style={{ ...inputStyle, width: 190 }} />
            <button className="btn btn-ghost" type="button" onClick={() => void finish('/api/auth/2fa/disable', '2FA desativado')}>Desativar</button>
          </div>
        )}
      </div>

      {isMaster && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ color: 'var(--foreground)', fontSize: 16 }}>Trilha de auditoria (últimos 200 eventos)</h2>
            <button className="btn btn-ghost" type="button" onClick={() => void loadAudit()}>Atualizar</button>
          </div>
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th>Data</th><th>Evento</th><th>Usuário</th><th>IP</th><th>Detalhe</th></tr>
              </thead>
              <tbody>
                {audit.length === 0 && <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: 'var(--muted-foreground)' }}>Nenhum evento registrado.</td></tr>}
                {audit.map(item => (
                  <tr key={item.id}>
                    <td className="font-mono" style={{ fontSize: 11 }}>{new Date(item.criadoEm).toLocaleString('pt-BR')}</td>
                    <td style={{ fontSize: 12, color: /falha|bloqueado|negado/.test(item.evento) ? 'var(--status-critical)' : 'var(--foreground)' }}>
                      {EVENT_LABELS[item.evento] ?? item.evento}
                    </td>
                    <td className="font-mono" style={{ fontSize: 11 }}>{item.email ?? '-'}</td>
                    <td className="font-mono" style={{ fontSize: 11 }}>{item.ip ?? '-'}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{item.detalhe ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
