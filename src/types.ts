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
