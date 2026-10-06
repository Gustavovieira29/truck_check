import base64
import json
import mimetypes
import uuid
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import InspectionReport
from backend.app.schemas import InspectionCreate, InspectionResponse

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / 'uploads'


class AnalyzeRequest(BaseModel):
    image_data: str = Field(min_length=32)


class AnalyzeResponse(BaseModel):
    image_url: str
    ai_score: int
    ai_findings: list[str]
    ai_status: str
    provider: str


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


@router.post('/analyze', response_model=AnalyzeResponse)
def analyze_inspection(payload: AnalyzeRequest):
    try:
        header, encoded = payload.image_data.split(',', 1)
        media_type = header.split(';', 1)[0].removeprefix('data:')
        raw_image = base64.b64decode(encoded, validate=True)
    except (ValueError, UnicodeError, base64.binascii.Error) as exc:
        raise HTTPException(status_code=400, detail='Imagem base64 inválida.') from exc

    if len(raw_image) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='A imagem excede o limite de 10 MB.')

    extension = mimetypes.guess_extension(media_type) or '.jpg'
    filename = f'{uuid.uuid4().hex}{extension}'
    (UPLOAD_DIR / filename).write_bytes(raw_image)
    image_url = f'/uploads/{filename}'

    if not settings.gemini_api_key:
        return AnalyzeResponse(
            image_url=image_url,
            ai_score=76,
            ai_findings=['Análise demonstrativa: configure GEMINI_API_KEY para uma avaliação real.'],
            ai_status='warning',
            provider='demo',
        )

    endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}'
    request_body = {
        'contents': [{'parts': [
            {'text': 'Analise esta foto de veículo ou equipamento. Responda somente JSON com aiScore (0-100), aiStatus (ok, warning ou critical) e aiFindings (lista de achados em português).'},
            {'inline_data': {'mime_type': media_type, 'data': encoded}},
        ]}],
        'generationConfig': {'responseMimeType': 'application/json'},
    }
    try:
        request = Request(endpoint, data=json.dumps(request_body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode())
        text = result['candidates'][0]['content']['parts'][0]['text']
        analysis = json.loads(text)
        return AnalyzeResponse(
            image_url=image_url,
            ai_score=max(0, min(100, int(analysis['aiScore']))),
            ai_findings=[str(item) for item in analysis.get('aiFindings', [])],
            ai_status=str(analysis.get('aiStatus', 'warning')),
            provider='gemini',
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail='Não foi possível analisar a imagem com o Gemini.') from exc


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
