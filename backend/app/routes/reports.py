import smtplib
import base64
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import ReportLog
from backend.app.schemas import ReportCreate, ReportDeliveryResponse, ReportResponse

router = APIRouter()


def to_response(item: ReportLog) -> ReportResponse:
    return ReportResponse(
        id=item.id,
        type=item.type,
        period=item.period,
        recipients=[email for email in (item.recipients or '').split(',') if email],
        status=item.status,
        generated_at=item.generated_at,
        sent_at=item.sent_at,
    )


def send_email(report: ReportCreate) -> None:
    if settings.google_client_id and settings.google_client_secret and settings.google_refresh_token and settings.google_sender:
        send_gmail_api(report)
        return

    if not settings.smtp_host or not settings.smtp_from:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Envio de e-mail indisponível: configure SMTP_HOST e SMTP_FROM no arquivo backend/.env.',
        )

    message = EmailMessage()
    message['Subject'] = f'Truck Check - Relatório {report.type}'
    message['From'] = settings.smtp_from
    message['To'] = ', '.join(report.recipients)
    message.set_content(
        f'Relatório {report.type} ({report.period}) gerado em {report.generated_at.isoformat()}.\n'
        'Acesse o painel Truck Check para consultar os detalhes.'
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f'Não foi possível enviar o e-mail: {exc}',
        ) from exc


def send_gmail_api(report: ReportCreate) -> None:
    try:
        token_request = Request(
            'https://oauth2.googleapis.com/token',
            data=urlencode({
                'client_id': settings.google_client_id,
                'client_secret': settings.google_client_secret,
                'refresh_token': settings.google_refresh_token,
                'grant_type': 'refresh_token',
            }).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            method='POST',
        )
        with urlopen(token_request, timeout=15) as response:
            access_token = json.loads(response.read().decode())['access_token']

        message = EmailMessage()
        message['Subject'] = f'Truck Check - Relatório {report.type}'
        message['From'] = settings.google_sender
        message['To'] = ', '.join(report.recipients)
        message.set_content(
            f'Relatório {report.type} ({report.period}) gerado em {report.generated_at.isoformat()}.\n'
            'Acesse o painel Truck Check para consultar os detalhes.'
        )
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode().rstrip('=')
        send_request = Request(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            data=json.dumps({'raw': encoded_message}).encode(),
            headers={'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'},
            method='POST',
        )
        with urlopen(send_request, timeout=15):
            return
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='Não foi possível enviar o e-mail pela Gmail API.',
        ) from exc


def is_test_mailbox() -> bool:
    return settings.smtp_host in {'localhost', '127.0.0.1'} and settings.smtp_port == 1025


@router.get('', response_model=list[ReportResponse])
def list_reports(db: Session = Depends(get_db)):
    return [to_response(item) for item in db.query(ReportLog).all()]


@router.post('', response_model=ReportDeliveryResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    email_requested = bool(payload.recipients)
    if email_requested:
        send_email(payload)

    delivered_externally = email_requested and not is_test_mailbox()

    item = ReportLog(
        **payload.model_dump(exclude={'recipients', 'status', 'sent_at'}),
        recipients=','.join(payload.recipients),
        status='sent' if delivered_externally else 'created',
        sent_at=payload.generated_at if delivered_externally else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ReportDeliveryResponse(
        **to_response(item).model_dump(),
        email_sent=delivered_externally,
        message=(
            'E-mail capturado na caixa local Mailpit (http://localhost:8025). '
            'Ele não será entregue ao destinatário externo.'
            if email_requested and is_test_mailbox()
            else 'Relatório gerado e e-mail enviado.'
            if delivered_externally
            else 'Relatório gerado. Nenhum e-mail foi solicitado.'
        ),
    )
