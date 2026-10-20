import logging
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models import Auditoria

logger = logging.getLogger('truck_check_security')

LOGIN_MAX_FAILURES_PER_EMAIL = 5
LOGIN_MAX_FAILURES_PER_IP = 20
LOGIN_WINDOW = timedelta(minutes=15)


def audit(db: Session, evento: str, email: str | None = None, ip: str | None = None, detalhe: str | None = None) -> None:
    """Registra no banco um evento de segurança (trilha de auditoria)."""
    db.add(Auditoria(evento=evento, email=(email or None) and email[:254], ip=ip, detalhe=(detalhe or None) and detalhe[:500]))
    db.commit()
    logger.info('AUDIT %s email=%s ip=%s %s', evento, email, ip, detalhe or '')


def _recent_failures(db: Session, column, value: str, since: datetime) -> int:
    last_ok = db.query(func.max(Auditoria.criado_em)).filter(Auditoria.evento == 'login_ok', column == value).scalar()
    start = max(since, last_ok) if last_ok else since
    return db.query(func.count(Auditoria.id)).filter(
        Auditoria.evento == 'login_falha', column == value, Auditoria.criado_em > start,
    ).scalar() or 0


def ensure_not_locked(db: Session, ip: str, email: str) -> None:
    """Bloqueio persistente (sobrevive a reinícios) contra força bruta."""
    since = datetime.utcnow() - LOGIN_WINDOW
    locked = (
        _recent_failures(db, Auditoria.email, email, since) >= LOGIN_MAX_FAILURES_PER_EMAIL
        or _recent_failures(db, Auditoria.ip, ip, since) >= LOGIN_MAX_FAILURES_PER_IP
    )
    if locked:
        audit(db, 'login_bloqueado', email, ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail='Muitas tentativas. Tente novamente em 15 minutos.',
            headers={'Retry-After': str(int(LOGIN_WINDOW.total_seconds()))},
        )
