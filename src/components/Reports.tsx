import { useState } from 'react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import { apiUrl } from '../config'
import { ASSETS, MAINTENANCES } from '../data/mockData'

type Period = 'daily' | 'weekly' | 'monthly'
type ReportType = 'full' | 'critical' | 'maintenance' | 'inspection'

interface ScheduledReport {
  id: string
  type: ReportType
  period: Period
  recipients: string[]
  lastSent: string
  nextSend: string
  active: boolean
}

const SCHEDULED: ScheduledReport[] = [
  { id: 'r1', type: 'critical', period: 'daily', recipients: ['diretoria@empresa.com', 'segurança@empresa.com'], lastSent: '2025-08-03', nextSend: '2025-08-04', active: true },
  { id: 'r2', type: 'full', period: 'weekly', recipients: ['gestão@empresa.com'], lastSent: '2025-07-28', nextSend: '2025-08-04', active: true },
  { id: 'r3', type: 'maintenance', period: 'monthly', recipients: ['manutenção@empresa.com', 'compras@empresa.com'], lastSent: '2025-07-01', nextSend: '2025-08-01', active: false },
]

const TYPE_LABELS: Record<ReportType, string> = {
  full: 'Relatório Completo',
  critical: 'Ativos Críticos',
  maintenance: 'Manutenções',
  inspection: 'Inspeções IA',
}

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

async function getApiError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
      return String(payload.detail)
    }
  } catch {
    // Falls back to the response status below.
  }

  return `A API respondeu com HTTP ${response.status} (${response.statusText}).`
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'generate' | 'schedule'>('generate')
  const [reportType, setReportType] = useState<ReportType>('full')
  const [period, setPeriod] = useState<Period>('monthly')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [schedules, setSchedules] = useState(SCHEDULED)
  const [startDate, setStartDate] = useState('2025-07-01')
  const [endDate, setEndDate] = useState('2025-08-04')
  const [recipient, setRecipient] = useState('')

  const overdue = ASSETS.filter(a => a.status === 'overdue' || a.status === 'critical').length
  const overdueMaints = MAINTENANCES.filter(m => m.status === 'overdue').length
  const totalCost = MAINTENANCES.filter(m => m.cost).reduce((acc, m) => acc + (m.cost || 0), 0)

  const handleGenerate = async () => {
    if (!startDate || !endDate || endDate < startDate) {
      toast.error('Intervalo de datas inválido', {
        description: 'A data final deve ser igual ou posterior à data inicial.',
      })
      return
    }

    if (recipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      toast.error('E-mail do destinatário inválido', {
        description: 'Informe um endereço no formato nome@empresa.com.',
      })
      return
    }

    setGenerating(true)
    setGenerated(false)
    try {
      const response = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          period,
          recipients: recipient ? [recipient] : [],
          generatedAt: new Date().toISOString().slice(0, 10),
        }),
      })

      if (!response.ok) {
        throw new Error(await getApiError(response))
      }

      const result = await response.json() as { emailSent: boolean; message: string }
      setGenerated(true)
      toast[result.emailSent ? 'success' : recipient ? 'info' : 'success'](
        result.emailSent ? 'Relatório enviado por e-mail' : recipient ? 'E-mail de teste capturado' : 'Relatório gerado',
        {
        description: result.message,
        },
      )
    } catch (error) {
      toast.error('Falha ao gerar ou enviar relatório', {
        description: error instanceof Error ? error.message : 'Erro inesperado ao processar relatório.',
      })
    } finally {
      setGenerating(false)
    }
  }

  const toggleSchedule = (id: string) => {
    setSchedules(s => s.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  const sendScheduledReport = (schedule: ScheduledReport) => {
    setReportType(schedule.type)
    setPeriod(schedule.period)
    setRecipient(schedule.recipients[0] ?? '')
    setActiveTab('generate')
    toast.info('Agendamento carregado', { description: 'Revise os dados e confirme o envio do relatório.' })
  }

  const handleDownloadPdf = () => {
    if (!generated) {
      toast.error('Gere o relatório antes de baixar o PDF')
      return
    }

    const document = new jsPDF()
    document.setFontSize(18)
    document.text('FLEETGUARD - Relatório de Frota', 20, 22)
    document.setFontSize(11)
    document.text(`Tipo: ${TYPE_LABELS[reportType]}`, 20, 34)
    document.text(`Período: ${startDate} a ${endDate}`, 20, 42)
    document.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 50)
    document.setFontSize(13)
    document.text('Resumo operacional', 20, 65)
    document.setFontSize(11)
    document.text(`Total de ativos: ${ASSETS.length}`, 20, 75)
    document.text(`Ativos críticos ou vencidos: ${overdue}`, 20, 83)
    document.text(`Manutenções vencidas: ${overdueMaints}`, 20, 91)
    document.text(`Custo previsto: R$ ${totalCost.toLocaleString('pt-BR')}`, 20, 99)
    document.save(`relatorio-fleetguard-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF baixado', { description: 'O relatório foi salvo no seu dispositivo.' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 0 }}>
        {(['generate', 'schedule'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--foreground)' : 'var(--muted-foreground)',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {tab === 'generate' ? 'Gerar Relatório' : 'Envios Automáticos'}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'flex-start' }}>
          {/* Config */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Configurações</h3>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8 }}>Tipo de relatório</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(Object.entries(TYPE_LABELS) as [ReportType, string][]).map(([t, label]) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 3, background: reportType === t ? 'rgba(59,130,246,0.08)' : 'transparent', border: `1px solid ${reportType === t ? 'rgba(59,130,246,0.3)' : 'transparent'}` }}>
                    <input type="radio" name="type" checked={reportType === t} onChange={() => setReportType(t)} style={{ accentColor: 'var(--primary)' }} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                        {t === 'full' ? 'Todos os ativos, manutenções e inspeções' :
                          t === 'critical' ? 'Apenas ativos em estado crítico ou vencido' :
                          t === 'maintenance' ? 'Agenda e histórico de manutenções' :
                          'Inspeções por foto com resultado da IA'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8 }}>Período</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 3,
                      border: `1px solid ${period === p ? 'var(--primary)' : 'var(--border)'}`,
                      background: period === p ? 'rgba(59,130,246,0.12)' : 'var(--secondary)',
                      color: period === p ? 'var(--primary)' : 'var(--muted-foreground)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6 }}>Intervalo de datas</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input required type="date" value={startDate} onChange={event => setStartDate(event.target.value)} style={inputSt} />
                <input required type="date" value={endDate} onChange={event => setEndDate(event.target.value)} style={inputSt} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6 }}>Enviar por e-mail (opcional)</label>
              <input
                type="email"
                placeholder="email@empresa.com"
                value={recipient}
                onChange={event => setRecipient(event.target.value)}
                style={inputSt}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Processando relatório…' : recipient ? 'Gerar e enviar relatório' : 'Gerar Relatório PDF'}
            </button>
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            {generated ? (
              <>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>PRÉVIA DO RELATÓRIO</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={handleDownloadPdf}>⬇ Download PDF</button>
                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleGenerate} disabled={generating}>✉ Enviar por e-mail</button>
                  </div>
                </div>
                <div style={{ padding: 24 }}>
                  {/* Mock PDF preview */}
                  <div style={{ background: 'white', borderRadius: 3, padding: 32, maxWidth: 600, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e40af' }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: 4 }}>FLEETGUARD</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{TYPE_LABELS[reportType]}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Período: {PERIOD_LABELS[period]} · 01/07/2025 – 04/08/2025</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Gerado em</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>04/08/2025</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                      {[
                        { label: 'Total de Ativos', value: ASSETS.length, color: '#0f172a' },
                        { label: 'Críticos/Vencidos', value: overdue, color: '#dc2626' },
                        { label: 'Manut. Vencidas', value: overdueMaints, color: '#d97706' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 4 }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Ativos por Status</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            {['Código', 'Nome', 'Responsável', 'Próx. Manut.', 'Status'].map(h => (
                              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ASSETS.slice(0, 5).map(a => (
                            <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '7px 8px', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{a.code}</td>
                              <td style={{ padding: '7px 8px', fontWeight: 500, color: '#0f172a' }}>{a.name.substring(0, 22)}</td>
                              <td style={{ padding: '7px 8px', color: '#475569' }}>{a.responsible.split(' ')[0]}</td>
                              <td style={{ padding: '7px 8px', fontFamily: 'monospace', fontSize: 11 }}>{new Date(a.nextMaintenance).toLocaleDateString('pt-BR')}</td>
                              <td style={{ padding: '7px 8px' }}>
                                <span style={{
                                  fontSize: 10, padding: '2px 6px', borderRadius: 2, fontWeight: 600,
                                  background: a.status === 'ok' ? '#dcfce7' : a.status === 'warning' ? '#fef3c7' : '#fee2e2',
                                  color: a.status === 'ok' ? '#15803d' : a.status === 'warning' ? '#92400e' : '#991b1b',
                                }}>{a.status === 'ok' ? 'Regular' : a.status === 'warning' ? 'Atenção' : 'Crítico/Vencido'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                      Relatório gerado automaticamente pelo sistema FleetGuard · Conforme exigências regulatórias
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Prévia do relatório</div>
                <div style={{ fontSize: 12 }}>Configure e gere o relatório para visualizar a prévia aqui</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
              Relatórios enviados automaticamente por e-mail conforme periodicidade configurada.
            </p>
            <button className="btn btn-primary" onClick={() => toast.info('Configure o relatório e gere o envio para criar um agendamento.')}>+ Novo Agendamento</button>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Periodicidade</th>
                  <th>Destinatários</th>
                  <th>Último envio</th>
                  <th>Próximo envio</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{TYPE_LABELS[s.type]}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 2, fontWeight: 500,
                        background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)',
                      }}>
                        {PERIOD_LABELS[s.period]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {s.recipients.map(r => (
                          <span key={r} className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--foreground)' }}>
                        {new Date(s.lastSent).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--foreground)' }}>
                        {new Date(s.nextSend).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td>
                      <span className={s.active ? 'badge-ok' : 'badge-inactive'} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2, fontWeight: 500 }}>
                        {s.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => {
                            toggleSchedule(s.id)
                            toast.success(s.active ? 'Agendamento pausado' : 'Agendamento ativado')
                          }}
                        >
                          {s.active ? 'Pausar' : 'Ativar'}
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => sendScheduledReport(s)}>
                          ✉ Enviar agora
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Email config info */}
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4, padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 4 }}>Configuração de e-mail</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                Para ativar o envio automático por e-mail, configure as credenciais SMTP nas configurações do sistema (SMTP Host, Porta, Usuário e Senha). Os relatórios são gerados automaticamente em PDF e enviados conforme a periodicidade definida, garantindo rastreabilidade e conformidade regulatória.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputSt: React.CSSProperties = {
  width: '100%',
  background: 'var(--secondary)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '7px 10px',
  color: 'var(--foreground)',
  fontSize: 13,
  outline: 'none',
}
