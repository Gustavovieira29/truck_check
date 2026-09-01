import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import { INSPECTIONS, type InspectionReport } from '../data/mockData'

type AIState = 'idle' | 'uploading' | 'analyzing' | 'done'

type ApiAsset = { id: number; code: string; name: string; responsible: string }

const INSPECTIONS_API = 'http://localhost:8000/api/inspections'
const ASSETS_API = 'http://localhost:8000/api/assets'

function normalizeInspection(item: InspectionReport & { aiFindings: string | string[]; id: string | number; assetId: string | number }): InspectionReport {
  return {
    ...item,
    id: String(item.id),
    assetId: String(item.assetId),
    aiFindings: Array.isArray(item.aiFindings) ? item.aiFindings : (item.aiFindings || '').split('\n').filter(Boolean),
  }
}

const MOCK_ANALYSIS: Omit<InspectionReport, 'id' | 'assetId' | 'assetName' | 'assetCode' | 'date' | 'inspector' | 'imageUrl'> = {
  aiScore: 76,
  aiFindings: [
    'Pneu traseiro esquerdo com desgaste acima do limite recomendado',
    'Para-choque dianteiro com amassado leve — sem impacto estrutural',
    'Faróis e lanternas em boas condições de funcionamento',
    'Espelhos retrovisores posicionados corretamente',
    'Carroceria sem sinais de corrosão visível',
    'Identificação do veículo (placa) legível e em conformidade',
  ],
  aiStatus: 'warning',
  approved: false,
}

export default function PhotoInspection() {
  const [selected, setSelected] = useState<InspectionReport | null>(null)
  const [inspections, setInspections] = useState<InspectionReport[]>(INSPECTIONS)
  const [assets, setAssets] = useState<ApiAsset[]>([])
  const [aiState, setAiState] = useState<AIState>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<typeof MOCK_ANALYSIS | null>(null)
  const [selectedAsset, setSelectedAsset] = useState('')
  const [inspector, setInspector] = useState('Roberto Alves')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([fetch(INSPECTIONS_API), fetch(ASSETS_API)])
      .then(async ([inspectionResponse, assetResponse]) => {
        if (!inspectionResponse.ok || !assetResponse.ok) throw new Error('A API não respondeu ao carregar os dados.')
        const [inspectionData, assetData] = await Promise.all([inspectionResponse.json(), assetResponse.json()])
        setInspections((inspectionData as Array<InspectionReport & { aiFindings: string | string[]; id: string | number; assetId: string | number }>).map(normalizeInspection))
        const loadedAssets = assetData as ApiAsset[]
        setAssets(loadedAssets)
        setSelectedAsset(current => current || String(loadedAssets[0]?.id || ''))
      })
      .catch(error => toast.error('Falha ao carregar inspeções', { description: error instanceof Error ? error.message : 'Erro inesperado.' }))
  }, [])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo inválido', { description: 'Selecione uma imagem JPG, PNG ou WEBP.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande', { description: 'O tamanho máximo permitido é 10 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      setPreview(e.target?.result as string)
      runAnalysis()
    }
    reader.readAsDataURL(file)
  }

  const runAnalysis = () => {
    setAiState('uploading')
    setResult(null)
    setTimeout(() => {
      setAiState('analyzing')
      setTimeout(() => {
        setAiState('done')
        setResult(MOCK_ANALYSIS)
      }, 2800)
    }, 900)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDemoImage = () => {
    setPreview('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&auto=format')
    runAnalysis()
  }

  const saveInspection = async (approved: boolean) => {
    const asset = assets.find(item => String(item.id) === selectedAsset)
    if (!asset) {
      toast.error('Selecione um ativo válido')
      return
    }
    if (!inspector.trim()) {
      toast.error('Inspetor obrigatório', { description: 'Informe o responsável pela inspeção.' })
      return
    }
    if (!result || !preview) {
      toast.error('Análise pendente', { description: 'Selecione uma imagem e aguarde o resultado da análise.' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(INSPECTIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          assetName: asset.name,
          assetCode: asset.code,
          date: new Date().toISOString().slice(0, 10),
          inspector: inspector.trim(),
          imageUrl: preview,
          aiScore: result.aiScore,
          aiFindings: result.aiFindings.join('\n'),
          aiStatus: result.aiStatus,
          approved,
        }),
      })
      if (!response.ok) throw new Error(`A API respondeu com HTTP ${response.status}.`)
      const saved = normalizeInspection(await response.json())
      setInspections(current => [saved, ...current])
      setSelected(saved)
      toast.success(approved ? 'Inspeção aprovada e salva' : 'Revisão manual registrada', { description: `${saved.assetCode} foi salvo no banco de dados.` })
    } catch (error) {
      toast.error('Falha ao salvar inspeção', { description: error instanceof Error ? error.message : 'Erro inesperado.' })
    } finally {
      setSaving(false)
    }
  }

  const downloadInspectionPdf = () => {
    if (!result) {
      toast.error('Análise pendente', { description: 'Aguarde a análise da imagem antes de gerar o PDF.' })
      return
    }

    const asset = assets.find(item => String(item.id) === selectedAsset)
    const document = new jsPDF()
    document.setFontSize(18)
    document.text('FLEETGUARD - Relatório de Inspeção', 20, 22)
    document.setFontSize(11)
    document.text(`Ativo: ${asset?.code ?? 'Não selecionado'} - ${asset?.name ?? ''}`, 20, 35)
    document.text(`Inspetor: ${inspector || 'Não informado'}`, 20, 43)
    document.text(`Resultado: ${result.aiScore}/100 - ${result.aiStatus}`, 20, 51)
    document.setFontSize(13)
    document.text('Observações detectadas', 20, 66)
    document.setFontSize(10)
    result.aiFindings.forEach((finding, index) => {
      const lines = document.splitTextToSize(`${index + 1}. ${finding}`, 170)
      document.text(lines, 20, 76 + index * 14)
    })
    document.save(`inspecao-${asset?.code ?? 'ativo'}-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF da inspeção baixado')
  }

  const scoreColor = (score: number) =>
    score >= 85 ? 'var(--status-ok)' : score >= 65 ? 'var(--status-warning)' : 'var(--status-critical)'

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Left: History */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>HISTÓRICO DE INSPEÇÕES</span>
          </div>
          {inspections.map(ins => (
            <div
              key={ins.id}
              onClick={() => setSelected(selected?.id === ins.id ? null : ins)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: selected?.id === ins.id ? 'rgba(59,130,246,0.06)' : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{ins.assetCode}</span>
                <span className="font-mono" style={{ fontSize: 14, fontWeight: 500, color: scoreColor(ins.aiScore) }}>{ins.aiScore}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)', marginBottom: 2 }}>{ins.assetName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                {new Date(ins.date).toLocaleDateString('pt-BR')} · {ins.inspector}
              </div>
              <div style={{ marginTop: 6 }}>
                <span className={`badge-${ins.aiStatus}`} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 2 }}>
                  {ins.approved ? 'Aprovado' : ins.aiStatus === 'ok' ? 'Regular' : ins.aiStatus === 'warning' ? 'Atenção' : 'Pendente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Upload + Analysis */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Nova Inspeção por IA</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 5 }}>Ativo</label>
              <select
                required
                value={selectedAsset}
                onChange={e => setSelectedAsset(e.target.value)}
                style={{ width: '100%', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 3, padding: '7px 10px', color: 'var(--foreground)', fontSize: 13, outline: 'none', appearance: 'none' }}
              >
                {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 5 }}>Inspetor</label>
              <input
                required
                value={inspector}
                onChange={event => setInspector(event.target.value)}
                title="Informe quem realizou a inspeção."
                style={{ width: '100%', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 3, padding: '7px 10px', color: 'var(--foreground)', fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => aiState === 'idle' && inputRef.current?.click()}
            style={{
              border: `2px dashed ${preview ? 'var(--border)' : 'var(--muted-foreground)'}`,
              borderRadius: 4,
              overflow: 'hidden',
              cursor: aiState === 'idle' ? 'pointer' : 'default',
              minHeight: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              background: 'var(--muted)',
              transition: 'border-color 0.15s',
            }}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Foto do ativo para análise"
                  style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                />
                {(aiState === 'uploading' || aiState === 'analyzing') && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(10,12,15,0.8)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                  }}>
                    <ScanAnimation />
                    <div className="font-mono" style={{ fontSize: 12, color: 'var(--primary)', letterSpacing: '0.08em' }}>
                      {aiState === 'uploading' ? 'PROCESSANDO IMAGEM…' : 'ANALISANDO COM IA…'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}>
                  Arraste uma foto ou clique para selecionar
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
                  JPG, PNG ou WEBP · Máximo 10MB
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={e => { e.stopPropagation(); handleDemoImage() }}
                  style={{ fontSize: 12 }}
                >
                  Usar imagem de demonstração
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              required
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>

          {aiState === 'idle' && preview && (
            <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={() => { setPreview(null); setResult(null); setAiState('idle') }}>
              ↩ Remover imagem
            </button>
          )}
        </div>

        {/* AI Result */}
        {result && aiState === 'done' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: result.aiStatus === 'ok' ? 'rgba(34,197,94,0.06)' : result.aiStatus === 'warning' ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>RESULTADO DA ANÁLISE IA</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono" style={{ fontSize: 28, fontWeight: 300, color: scoreColor(result.aiScore), lineHeight: 1 }}>{result.aiScore}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>/ 100 pts</div>
                </div>
                <span className={`badge-${result.aiStatus}`} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 2, fontWeight: 500 }}>
                  {result.aiStatus === 'ok' ? 'Aprovado' : result.aiStatus === 'warning' ? 'Atenção' : 'Reprovado'}
                </span>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--muted-foreground)', letterSpacing: '0.08em', marginBottom: 12 }}>OBSERVAÇÕES DETECTADAS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.aiFindings.map((finding, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                      background: i < 2 ? 'var(--status-warning)' : 'var(--status-ok)',
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{finding}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => void saveInspection(true)} disabled={saving}>{saving ? 'Salvando…' : 'Aprovar e Salvar'}</button>
                <button className="btn btn-ghost" onClick={() => void saveInspection(false)} disabled={saving}>Solicitar revisão manual</button>
                <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={downloadInspectionPdf}>Gerar PDF</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Selected inspection detail */}
      {selected && (
        <div style={{ width: 280, flexShrink: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>INSPEÇÃO {selected.assetCode}</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <img
            src={selected.imageUrl}
            alt={`Foto da inspeção de ${selected.assetName}`}
            style={{ width: '100%', height: 160, objectFit: 'cover', background: 'var(--muted)' }}
          />
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{selected.assetName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                  {new Date(selected.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: 24, fontWeight: 300, color: scoreColor(selected.aiScore) }}>
                {selected.aiScore}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.aiFindings.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--muted-foreground)', flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 11, color: 'var(--foreground)', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScanAnimation() {
  return (
    <div style={{ width: 48, height: 48, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '2px solid rgba(59,130,246,0.2)',
        borderTop: '2px solid var(--primary)',
        animation: 'spin 1s linear infinite',
      }} />
      <div style={{ position: 'absolute', fontSize: 18 }}>🔍</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function scoreColor(score: number) {
  return score >= 85 ? 'var(--status-ok)' : score >= 65 ? 'var(--status-warning)' : 'var(--status-critical)'
}
