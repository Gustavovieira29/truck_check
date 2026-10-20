import { useEffect, useState } from 'react'
import { apiFetch, apiUrl } from './config'
import Dashboard from './components/Dashboard'
import Assets from './components/Assets'
import Maintenance from './components/Maintenance'
import PhotoInspection from './components/PhotoInspection'
import Parts from './components/Parts'
import Reports from './components/Reports'
import Users from './components/Users'
import Security from './components/Security'

type Page = 'dashboard' | 'assets' | 'maintenance' | 'parts' | 'inspection' | 'reports' | 'users' | 'security'

const AUTH_TOKEN_KEY = 'truck-check-token'
const LOGIN_AT_KEY = 'truck-check-login-at'
const RELOAD_WINDOW_MS = 5 * 60 * 1000

// Recarregar a página só mantém a sessão por 5 minutos após o login.
function restoreToken(): string | null {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  const loginAt = Number(window.localStorage.getItem(LOGIN_AT_KEY))
  if (token && loginAt && Date.now() - loginAt <= RELOAD_WINDOW_MS) return token
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(LOGIN_AT_KEY)
  return null
}

const NAV = [
  { id: 'dashboard' as Page, icon: GridIcon, label: 'Dashboard' },
  { id: 'assets' as Page, icon: TruckIcon, label: 'Ativos' },
  { id: 'maintenance' as Page, icon: WrenchIcon, label: 'Manutenções' },
  { id: 'parts' as Page, icon: BoxIcon, label: 'Peças e Insumos' },
  { id: 'inspection' as Page, icon: CameraIcon, label: 'Inspeção por Foto' },
  { id: 'reports' as Page, icon: FileIcon, label: 'Relatórios' },
  { id: 'users' as Page, icon: UsersIcon, label: 'Usuários' },
  { id: 'security' as Page, icon: FileIcon, label: 'Segurança' },
]

function pageFromHash(): Page {
  const page = window.location.hash.replace(/^#\/?/, '')
  return NAV.some(item => item.id === page) ? page as Page : 'dashboard'
}

export default function App() {
  const [token, setToken] = useState(restoreToken)
  const [page, setPage] = useState<Page>(pageFromHash)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMaster, setIsMaster] = useState(false)

  useEffect(() => {
    const handleHashChange = () => setPage(pageFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const handleExpiredSession = () => setToken(null)
    window.addEventListener('truck-check-auth-expired', handleExpiredSession)
    return () => window.removeEventListener('truck-check-auth-expired', handleExpiredSession)
  }, [])

  useEffect(() => {
    if (!token) { setIsMaster(false); return }
    apiFetch(apiUrl('/api/usuarios/me'))
      .then(response => response.json() as Promise<{ perfil?: string }>)
      .then(result => setIsMaster(result.perfil === 'master'))
      .catch(() => setIsMaster(false))
  }, [token])

  const visibleNav = NAV.filter(item => item.id !== 'users' || isMaster)

  const navigate = (nextPage: Page) => {
    window.location.hash = nextPage
  }

  const handleLogin = (value: string) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, value)
    window.localStorage.setItem(LOGIN_AT_KEY, String(Date.now()))
    setToken(value)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 220 : 56,
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '16px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 57,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              background: 'var(--primary)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldIcon size={15} color="white" />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div className="font-mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                FLEETGUARD
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                Gestão de Ativos
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleNav.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`nav-item ${page === id ? 'active' : ''}`}
              style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={16} />
              {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="btn-ghost btn"
          style={{
            margin: '8px',
            justifyContent: sidebarOpen ? 'flex-end' : 'center',
            borderColor: 'transparent',
          }}
        >
          <ChevronIcon dir={sidebarOpen ? 'left' : 'right'} />
        </button>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header
          style={{
            height: 57,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            background: 'var(--card)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>
              {NAV.find(n => n.id === page)?.label}
            </h1>
            <StatusDot />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                marginLeft: 8,
              }}
            >
              RC
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                void apiFetch(apiUrl('/api/auth/logout'), { method: 'POST' }).catch(() => undefined)
                window.localStorage.removeItem(AUTH_TOKEN_KEY)
                window.localStorage.removeItem(LOGIN_AT_KEY)
                setToken(null)
              }}
            >
              Sair
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {page === 'assets' && <Assets />}
          {page === 'maintenance' && <Maintenance />}
          {page === 'parts' && <Parts />}
          {page === 'inspection' && <PhotoInspection />}
          {page === 'reports' && <Reports />}
          {page === 'users' && isMaster && <Users />}
          {page === 'security' && <Security isMaster={isMaster} />}
        </main>
      </div>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'master'>('login')
  const [masterExists, setMasterExists] = useState(true)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isMaster = mode === 'master'

  useEffect(() => {
    fetch(apiUrl('/api/auth/status'))
      .then(response => response.json() as Promise<{ masterExists?: boolean }>)
      .then(result => setMasterExists(result.masterExists !== false))
      .catch(() => setMasterExists(true))
  }, [])

  const switchMode = (next: 'login' | 'master') => {
    setMode(next)
    setError('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(apiUrl(isMaster ? '/api/auth/master' : '/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isMaster ? { nome, email, password } : { email, password, code: needsCode ? code : undefined }),
      })
      const result = await response.json() as { token?: string; user?: string; detail?: string | { msg: string }[] }
      if (response.status === 428 && result.detail === 'CODIGO_2FA_NECESSARIO') {
        setNeedsCode(true)
        setError('Informe o código de 6 dígitos do seu aplicativo autenticador.')
        return
      }
      if (!response.ok || !result.token || result.user === 'guest') {
        const detail = Array.isArray(result.detail) ? result.detail[0]?.msg : result.detail
        throw new Error(detail || 'E-mail ou senha inválidos.')
      }
      onLogin(result.token)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--background)', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: 28 }}>
        <div className="font-mono" style={{ color: 'var(--primary)', fontSize: 12, letterSpacing: '0.08em', marginBottom: 8 }}>FLEETGUARD</div>
        <h1 style={{ color: 'var(--foreground)', fontSize: 22, marginBottom: 22 }}>{isMaster ? 'Criar usuário master' : 'Acessar sistema'}</h1>
        {isMaster && (
          <>
            <label style={{ display: 'block', color: 'var(--muted-foreground)', fontSize: 12, marginBottom: 6 }}>Nome</label>
            <input value={nome} onChange={event => setNome(event.target.value)} type="text" required style={loginInputStyle} />
          </>
        )}
        <label style={{ display: 'block', color: 'var(--muted-foreground)', fontSize: 12, margin: isMaster ? '14px 0 6px' : '0 0 6px' }}>E-mail</label>
        <input value={email} onChange={event => setEmail(event.target.value)} type="email" required style={loginInputStyle} />
        <label style={{ display: 'block', color: 'var(--muted-foreground)', fontSize: 12, margin: '14px 0 6px' }}>Senha</label>
        <input value={password} onChange={event => setPassword(event.target.value)} type="password" required minLength={isMaster ? 8 : undefined} title={isMaster ? "Mínimo de 8 caracteres, com letras e números" : undefined} style={loginInputStyle} />
        {needsCode && !isMaster && (
          <>
            <label style={{ display: 'block', color: 'var(--muted-foreground)', fontSize: 12, margin: '14px 0 6px' }}>Código de verificação (2FA)</label>
            <input value={code} onChange={event => setCode(event.target.value)} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus style={loginInputStyle} />
          </>
        )}
        {error && <div style={{ color: 'var(--status-critical)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
          {loading ? 'Aguarde...' : isMaster ? 'Criar e entrar' : 'Entrar'}
        </button>
        {(isMaster || !masterExists) && (
          <button type="button" onClick={() => switchMode(isMaster ? 'login' : 'master')} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}>
            {isMaster ? 'Voltar ao login' : 'Criar usuário master'}
          </button>
        )}
      </form>
    </div>
  )
}
const loginInputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '9px 10px',
  color: 'var(--foreground)',
  fontSize: 13,
}

function StatusDot() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-ok)' }} />
      <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
        SISTEMA ATIVO
      </span>
    </div>
  )
}

// ---- Icons ----
function GridIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  )
}
function TruckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1 3h9v8H1zM10 5l3 2v4h-3V5z" />
      <circle cx="3.5" cy="11.5" r="1.5" />
      <circle cx="11.5" cy="11.5" r="1.5" />
    </svg>
  )
}
function WrenchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10.5 1a3.5 3.5 0 0 0-3.3 4.7L1.5 11.5a1.5 1.5 0 1 0 2.1 2.1l5.8-5.7A3.5 3.5 0 0 0 10.5 1z" />
    </svg>
  )
}
function UsersIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="6" cy="5" r="2.5" /><path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5M11 3.2a2.5 2.5 0 010 4.6M12.5 9.8c1.2.6 2 1.9 2 4.2" /></svg>
}
function BoxIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M2 5.5L8 2l6 3.5v7L8 16l-6-3.5v-7z" /><path d="M2 5.5L8 9l6-3.5M8 9v7" /></svg>
}
function CameraIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1" y="4" width="14" height="10" rx="1.5" />
      <circle cx="8" cy="9" r="2.5" />
      <path d="M5.5 4l1-2h3l1 2" />
    </svg>
  )
}
function FileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1z" />
      <path d="M9 1v5h5" />
      <line x1="4" y1="9" x2="12" y2="9" />
      <line x1="4" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function ShieldIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M8 1L2 3.5V8c0 3 2.5 5.5 6 6.5C12.5 13.5 14 11 14 8V3.5L8 1z" />
      <polyline points="5,8 7,10 11,6" />
    </svg>
  )
}
function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {dir === 'left' ? (
        <polyline points="9,2 4,7 9,12" />
      ) : (
        <polyline points="5,2 10,7 5,12" />
      )}
    </svg>
  )
}



