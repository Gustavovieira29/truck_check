from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Part
from backend.app.schemas import PartCreate, PartResponse

router = APIRouter()


@router.get('', response_model=list[PartResponse])
def list_parts(db: Session = Depends(get_db)):
    return db.query(Part).order_by(Part.name).all()


@router.post('', response_model=PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(payload: PartCreate, db: Session = Depends(get_db)):
    if db.query(Part).filter(Part.code == payload.code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Part code already exists')
    item = Part(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put('/{part_id}', response_model=PartResponse)
def update_part(part_id: int, payload: PartCreate, db: Session = Depends(get_db)):
    item = db.query(Part).filter(Part.id == part_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Part not found')
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete('/{part_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_part(part_id: int, db: Session = Depends(get_db)):
    item = db.query(Part).filter(Part.id == part_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Part not found')
    db.delete(item)
    db.commit()