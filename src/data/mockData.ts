export type AssetType = 'vehicle' | 'tool' | 'equipment'
export type StatusType = 'ok' | 'warning' | 'critical' | 'overdue' | 'inactive'

export interface Asset {
  id: string
  code: string
  name: string
  type: AssetType
  category: string
  plate?: string
  serialNumber?: string
  responsible: string
  location: string
  status: StatusType
  lastInspection: string
  nextMaintenance: string
  daysUntilMaintenance: number
  mileage?: number
  brand: string
  model: string
  year: number
  notes?: string
}

export interface MaintenanceRecord {
  id: string
  assetId: string
  assetName: string
  assetCode: string
  type: 'preventive' | 'corrective' | 'inspection' | 'calibration'
  description: string
  scheduledDate: string
  completedDate?: string
  responsible: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  cost?: number
  provider?: string
  notes?: string
  daysUntil: number
}

export interface InspectionReport {
  id: string
  assetId: string
  assetName: string
  assetCode: string
  date: string
  inspector: string
  imageUrl: string
  aiScore: number
  aiFindings: string[]
  aiStatus: StatusType
  approved: boolean
}

export const ASSETS: Asset[] = [
  {
    id: 'a1',
    code: 'VEI-001',
    name: 'Caminhão Mercedes Atego',
    type: 'vehicle',
    category: 'Caminhão Leve',
    plate: 'ABC-1D23',
    serialNumber: 'MB2024001',
    responsible: 'Roberto Alves',
    location: 'Garagem Norte',
    status: 'ok',
    lastInspection: '2025-07-15',
    nextMaintenance: '2025-08-20',
    daysUntilMaintenance: 16,
    mileage: 48320,
    brand: 'Mercedes-Benz',
    model: 'Atego 1719',
    year: 2022,
  },
  {
    id: 'a2',
    code: 'VEI-002',
    name: 'Van Fiorino Cargo',
    type: 'vehicle',
    category: 'Van',
    plate: 'DEF-4G56',
    serialNumber: 'FI2021042',
    responsible: 'Carla Mendes',
    location: 'Garagem Sul',
    status: 'warning',
    lastInspection: '2025-06-10',
    nextMaintenance: '2025-08-08',
    daysUntilMaintenance: 4,
    mileage: 91540,
    brand: 'Fiat',
    model: 'Fiorino Cargo 1.4',
    year: 2021,
    notes: 'Filtro de ar necessita substituição',
  },
  {
    id: 'a3',
    code: 'VEI-003',
    name: 'Caminhonete Hilux',
    type: 'vehicle',
    category: 'Picape',
    plate: 'GHI-7J89',
    serialNumber: 'TH2023019',
    responsible: 'Lucas Ferreira',
    location: 'Campo Externo',
    status: 'overdue',
    lastInspection: '2025-05-01',
    nextMaintenance: '2025-07-25',
    daysUntilMaintenance: -10,
    mileage: 62100,
    brand: 'Toyota',
    model: 'Hilux 2.8 TDI',
    year: 2023,
    notes: 'Revisão programada VENCIDA — agendar urgente',
  },
  {
    id: 'a4',
    code: 'EQP-001',
    name: 'Compressor de Ar Industrial',
    type: 'equipment',
    category: 'Pneumático',
    serialNumber: 'CP2019088',
    responsible: 'Marcio Santos',
    location: 'Oficina Central',
    status: 'ok',
    lastInspection: '2025-07-01',
    nextMaintenance: '2025-09-01',
    daysUntilMaintenance: 28,
    brand: 'Schulz',
    model: 'CSL 40/425',
    year: 2019,
  },
  {
    id: 'a5',
    code: 'FER-001',
    name: 'Guindaste Manual 3T',
    type: 'tool',
    category: 'Içamento',
    serialNumber: 'GU2020033',
    responsible: 'Marcio Santos',
    location: 'Galpão A',
    status: 'critical',
    lastInspection: '2025-04-10',
    nextMaintenance: '2025-08-05',
    daysUntilMaintenance: 1,
    brand: 'Tander',
    model: 'HC-3000',
    year: 2020,
    notes: 'Laudo INMETRO expira em 3 dias — renovar certificado',
  },
  {
    id: 'a6',
    code: 'VEI-004',
    name: 'Ônibus Rodoviário',
    type: 'vehicle',
    category: 'Ônibus',
    plate: 'JKL-0M12',
    serialNumber: 'MB2020077',
    responsible: 'Ana Ribeiro',
    location: 'Garagem Norte',
    status: 'ok',
    lastInspection: '2025-07-20',
    nextMaintenance: '2025-10-15',
    daysUntilMaintenance: 72,
    mileage: 210450,
    brand: 'Mercedes-Benz',
    model: 'OF-1721',
    year: 2020,
  },
  {
    id: 'a7',
    code: 'EQP-002',
    name: 'Gerador a Diesel 80kVA',
    type: 'equipment',
    category: 'Elétrico',
    serialNumber: 'GD2018055',
    responsible: 'Paulo Gomes',
    location: 'Subestação',
    status: 'warning',
    lastInspection: '2025-06-30',
    nextMaintenance: '2025-08-12',
    daysUntilMaintenance: 8,
    brand: 'Stemac',
    model: 'SG-80',
    year: 2018,
  },
  {
    id: 'a8',
    code: 'FER-002',
    name: 'Empilhadeira Elétrica',
    type: 'tool',
    category: 'Movimentação',
    serialNumber: 'EM2022011',
    responsible: 'João Silva',
    location: 'Galpão B',
    status: 'inactive',
    lastInspection: '2025-03-20',
    nextMaintenance: '2025-08-01',
    daysUntilMaintenance: -3,
    brand: 'Yale',
    model: 'ERP25',
    year: 2022,
    notes: 'Em manutenção corretiva — bateria',
  },
]

export const MAINTENANCES: MaintenanceRecord[] = [
  {
    id: 'm1',
    assetId: 'a3',
    assetName: 'Caminhonete Hilux',
    assetCode: 'VEI-003',
    type: 'preventive',
    description: 'Revisão 60.000 km — troca de óleo, filtros e correia dentada',
    scheduledDate: '2025-07-25',
    responsible: 'Lucas Ferreira',
    status: 'overdue',
    provider: 'Toyota Center SP',
    daysUntil: -10,
  },
  {
    id: 'm2',
    assetId: 'a5',
    assetName: 'Guindaste Manual 3T',
    assetCode: 'FER-001',
    type: 'inspection',
    description: 'Renovação de laudo INMETRO e inspeção de segurança anual',
    scheduledDate: '2025-08-05',
    responsible: 'Marcio Santos',
    status: 'scheduled',
    provider: 'Metrolab Certificações',
    cost: 1200,
    daysUntil: 1,
  },
  {
    id: 'm3',
    assetId: 'a2',
    assetName: 'Van Fiorino Cargo',
    assetCode: 'VEI-002',
    type: 'preventive',
    description: 'Troca de filtro de ar, vela de ignição e fluido de freio',
    scheduledDate: '2025-08-08',
    responsible: 'Carla Mendes',
    status: 'scheduled',
    provider: 'Oficina Central',
    cost: 480,
    daysUntil: 4,
  },
  {
    id: 'm4',
    assetId: 'a7',
    assetName: 'Gerador a Diesel 80kVA',
    assetCode: 'EQP-002',
    type: 'preventive',
    description: 'Troca de óleo motor, filtro e teste de carga completo',
    scheduledDate: '2025-08-12',
    responsible: 'Paulo Gomes',
    status: 'scheduled',
    cost: 850,
    daysUntil: 8,
  },
  {
    id: 'm5',
    assetId: 'a1',
    assetName: 'Caminhão Mercedes Atego',
    assetCode: 'VEI-001',
    type: 'preventive',
    description: 'Revisão programada 50.000 km',
    scheduledDate: '2025-08-20',
    responsible: 'Roberto Alves',
    status: 'scheduled',
    provider: 'Mercedes-Benz SP',
    cost: 2100,
    daysUntil: 16,
  },
  {
    id: 'm6',
    assetId: 'a4',
    assetName: 'Compressor de Ar Industrial',
    assetCode: 'EQP-001',
    type: 'preventive',
    description: 'Limpeza de filtros, troca de óleo e calibração de pressão',
    scheduledDate: '2025-09-01',
    responsible: 'Marcio Santos',
    status: 'scheduled',
    cost: 320,
    daysUntil: 28,
  },
  {
    id: 'm7',
    assetId: 'a8',
    assetName: 'Empilhadeira Elétrica',
    assetCode: 'FER-002',
    type: 'corrective',
    description: 'Substituição de conjunto de baterias tracionárias',
    scheduledDate: '2025-07-30',
    responsible: 'João Silva',
    status: 'in_progress',
    provider: 'Yale Service',
    cost: 4800,
    daysUntil: -5,
  },
  {
    id: 'm8',
    assetId: 'a6',
    assetName: 'Ônibus Rodoviário',
    assetCode: 'VEI-004',
    type: 'inspection',
    description: 'Vistoria DETRAN semestral e renovação de licença',
    scheduledDate: '2025-10-15',
    responsible: 'Ana Ribeiro',
    status: 'scheduled',
    cost: 650,
    daysUntil: 72,
  },
]

export const INSPECTIONS: InspectionReport[] = [
  {
    id: 'i1',
    assetId: 'a1',
    assetName: 'Caminhão Mercedes Atego',
    assetCode: 'VEI-001',
    date: '2025-07-15',
    inspector: 'Roberto Alves',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&auto=format',
    aiScore: 94,
    aiFindings: ['Pneus em boas condições', 'Faróis funcionando normalmente', 'Sem danos visíveis na carroceria', 'Espelhos retrovisores íntegros'],
    aiStatus: 'ok',
    approved: true,
  },
  {
    id: 'i2',
    assetId: 'a2',
    assetName: 'Van Fiorino Cargo',
    assetCode: 'VEI-002',
    date: '2025-06-10',
    inspector: 'Carla Mendes',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&auto=format',
    aiScore: 71,
    aiFindings: ['Arranhão leve no para-choque traseiro', 'Pneu dianteiro direito com desgaste acentuado', 'Vidro lateral com pequena trinca — monitorar', 'Carroceria sem danos estruturais'],
    aiStatus: 'warning',
    approved: false,
  },
  {
    id: 'i3',
    assetId: 'a5',
    assetName: 'Guindaste Manual 3T',
    assetCode: 'FER-001',
    date: '2025-04-10',
    inspector: 'Marcio Santos',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop&auto=format',
    aiScore: 58,
    aiFindings: ['Corrente com sinais de oxidação', 'Gancho com deformação leve detectada', 'Estrutura principal sem fraturas visíveis', 'Etiqueta de capacidade ilegível — substituir'],
    aiStatus: 'critical',
    approved: false,
  },
]
