from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Asset
from backend.app.schemas import AssetCreate, AssetResponse

router = APIRouter()


@router.get('', response_model=list[AssetResponse])
def list_assets(db: Session = Depends(get_db)):
    return db.query(Asset).all()


@router.get('/{asset_id}', response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset not found')
    return asset


@router.post('', response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Asset code already exists')

    asset = Asset(**payload.dict())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.put('/{asset_id}', response_model=AssetResponse)
def update_asset(asset_id: int, payload: AssetCreate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset not found')

    for field, value in payload.dict().items():
        setattr(asset, field, value)

    db.commit()
    db.refresh(asset)
    return asset


@router.delete('/{asset_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset not found')

    db.delete(asset)
    db.commit()
