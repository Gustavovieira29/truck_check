from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Asset, MaintenanceRecord
from backend.app.schemas import MaintenanceCreate, MaintenanceResponse

router = APIRouter()


@router.get('', response_model=list[MaintenanceResponse])
def list_maintenance(db: Session = Depends(get_db)):
    return db.query(MaintenanceRecord).all()


@router.post('', response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance(payload: MaintenanceCreate, db: Session = Depends(get_db)):
    maintenance = MaintenanceRecord(**payload.dict())
    db.add(maintenance)

    if maintenance.status == 'overdue':
        asset = db.query(Asset).filter(Asset.id == maintenance.asset_id).first()
        if asset:
            asset.status = 'overdue'
            asset.next_maintenance = maintenance.scheduled_date
            asset.days_until_maintenance = maintenance.days_until

    db.commit()
    db.refresh(maintenance)
    return maintenance


@router.put('/{maintenance_id}', response_model=MaintenanceResponse)
def update_maintenance(maintenance_id: int, payload: MaintenanceCreate, db: Session = Depends(get_db)):
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == maintenance_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Maintenance not found')

    for field, value in payload.model_dump().items():
        setattr(record, field, value)

    asset = db.query(Asset).filter(Asset.id == record.asset_id).first()
    if asset:
        if record.status == 'completed':
            asset.status = 'ok'
            asset.days_until_maintenance = 0
        elif record.status == 'overdue':
            asset.status = 'overdue'
            asset.next_maintenance = record.scheduled_date
            asset.days_until_maintenance = record.days_until

    db.commit()
    db.refresh(record)
    return record


@router.delete('/{maintenance_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance(maintenance_id: int, db: Session = Depends(get_db)):
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == maintenance_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Maintenance not found')

    db.delete(record)
    db.commit()
