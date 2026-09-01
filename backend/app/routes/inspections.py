from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import InspectionReport
from backend.app.schemas import InspectionCreate, InspectionResponse

router = APIRouter()


def serialize(item: InspectionReport) -> InspectionResponse:
    return InspectionResponse(
        id=item.id,
        asset_id=item.asset_id,
        asset_name=item.asset_name,
        asset_code=item.asset_code,
        date=item.date,
        inspector=item.inspector,
        image_url=item.image_url,
        ai_score=item.ai_score,
        ai_findings=item.ai_findings,
        ai_status=item.ai_status,
        approved=item.approved,
    )


@router.get('', response_model=list[InspectionResponse])
def list_inspections(db: Session = Depends(get_db)):
    return [serialize(item) for item in db.query(InspectionReport).order_by(InspectionReport.id.desc()).all()]


@router.post('', response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def create_inspection(payload: InspectionCreate, db: Session = Depends(get_db)):
    item = InspectionReport(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize(item)


@router.put('/{inspection_id}', response_model=InspectionResponse)
def update_inspection(inspection_id: int, payload: InspectionCreate, db: Session = Depends(get_db)):
    item = db.query(InspectionReport).filter(InspectionReport.id == inspection_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Inspection not found')

    for field, value in payload.model_dump().items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return serialize(item)


@router.delete('/{inspection_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(inspection_id: int, db: Session = Depends(get_db)):
    item = db.query(InspectionReport).filter(InspectionReport.id == inspection_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Inspection not found')

    db.delete(item)
    db.commit()
