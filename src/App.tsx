import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Assets from './components/Assets'
import Maintenance from './components/Maintenance'
import PhotoInspection from './components/PhotoInspection'
import Reports from './components/Reports'

type Page = 'dashboard' | 'assets' | 'maintenance' | 'inspection' | 'reports'

const NAV = [
  { id: 'dashboard' as Page, icon: GridIcon, label: 'Dashboard' },
  { id: 'assets' as Page, icon: TruckIcon, label: 'Ativos' },
  { id: 'maintenance' as Page, icon: WrenchIcon, label: 'Manutenções' },
  { id: 'inspection' as Page, icon: CameraIcon, label: 'Inspeção por Foto' },
  { id: 'reports' as Page, icon: FileIcon, label: 'Relatórios' },
]

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
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
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'assets' && <Assets />}
          {page === 'maintenance' && <Maintenance />}
          {page === 'inspection' && <PhotoInspection />}
          {page === 'reports' && <Reports />}
        </main>
      </div>
    </div>
  )
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
