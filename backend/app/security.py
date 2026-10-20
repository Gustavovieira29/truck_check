import base64
import hashlib
import hmac
import json
import os
import secrets
import struct
import time
from datetime import datetime, timedelta
from urllib.parse import quote

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Sessao, Usuario

_bearer_scheme = HTTPBearer(auto_error=False)
_TOKEN_LIFETIME_SECONDS = 8 * 60 * 60
_IDLE_TIMEOUT_SECONDS = 30 * 60


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode('ascii')


def _signing_secret() -> bytes:
    secret = settings.auth_token_secret
    if not secret and settings.app_env.casefold() != 'production':
        secret = settings.admin_password
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Configure AUTH_TOKEN_SECRET no ambiente do backend.',
        )
    return secret.encode('utf-8')


def create_access_token(db: Session, subject: str = 'admin', ip: str | None = None) -> str:
    """Cria a sessão no banco (revogável) e devolve o token assinado que a referencia."""
    jti = secrets.token_urlsafe(24)
    now = datetime.utcnow()
    db.add(Sessao(jti=jti, email=subject, ip=ip, criado_em=now, ultimo_uso=now,
                  expira_em=now + timedelta(seconds=_TOKEN_LIFETIME_SECONDS)))
    db.query(Sessao).filter(Sessao.expira_em < now - timedelta(days=1)).delete()
    db.commit()
    payload = _encode(json.dumps(
        {'sub': subject, 'jti': jti, 'exp': int(time.time()) + _TOKEN_LIFETIME_SECONDS},
        separators=(',', ':'),
    ).encode('utf-8'))
    signature = _encode(hmac.new(_signing_secret(), payload.encode('ascii'), hashlib.sha256).digest())
    return f'{payload}.{signature}'


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> str:
    if credentials is None or credentials.scheme.casefold() != 'bearer':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Autenticação necessária.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    try:
        payload_part, signature_part = credentials.credentials.split('.', 1)
        expected_signature = _encode(hmac.new(
            _signing_secret(),
            payload_part.encode('ascii'),
            hashlib.sha256,
        ).digest())
        if not hmac.compare_digest(signature_part, expected_signature):
            raise ValueError('Invalid token signature')

        padded_payload = payload_part + '=' * (-len(payload_part) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded_payload))
        if not payload.get('sub') or int(payload.get('exp', 0)) <= int(time.time()):
            raise ValueError('Expired or invalid token')
    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Sessão inválida ou expirada. Entre novamente.',
            headers={'WWW-Authenticate': 'Bearer'},
        ) from None

    subject = str(payload['sub'])
    now = datetime.utcnow()
    sessao = db.query(Sessao).filter(Sessao.jti == str(payload.get('jti', ''))).first()
    valid = (
        sessao is not None
        and not sessao.revogada
        and sessao.email == subject
        and sessao.expira_em > now
        and now - sessao.ultimo_uso <= timedelta(seconds=_IDLE_TIMEOUT_SECONDS)
        and (subject == 'admin' or db.query(Usuario.id).filter(Usuario.email == subject, Usuario.ativo.is_(True)).first())
    )
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Sessão inválida ou expirada. Entre novamente.',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    if now - sessao.ultimo_uso > timedelta(seconds=60):
        sessao.ultimo_uso = now
        db.commit()

    return subject


def revoke_session(db: Session, credentials: HTTPAuthorizationCredentials | None) -> None:
    if credentials is None:
        return
    try:
        payload_part = credentials.credentials.split('.', 1)[0]
        payload = json.loads(base64.urlsafe_b64decode(payload_part + '=' * (-len(payload_part) % 4)))
        db.query(Sessao).filter(Sessao.jti == str(payload.get('jti', ''))).update({'revogada': True})
        db.commit()
    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        return


def bearer_credentials(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme)) -> HTTPAuthorizationCredentials | None:
    return credentials


def generate_totp_secret() -> str:
    return base64.b32encode(os.urandom(20)).decode('ascii').rstrip('=')


def _totp_at(secret: str, counter: int) -> str:
    key = base64.b32decode(secret + '=' * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack('>Q', counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF) % 1_000_000
    return f'{code:06d}'


def verify_totp(secret: str, code: str) -> bool:
    code = (code or '').strip().replace(' ', '')
    if len(code) != 6 or not code.isdigit():
        return False
    counter = int(time.time() // 30)
    return any(hmac.compare_digest(_totp_at(secret, counter + drift), code) for drift in (-1, 0, 1))


def totp_uri(secret: str, email: str) -> str:
    return f'otpauth://totp/TruckCheck:{quote(email)}?secret={secret}&issuer=TruckCheck&digits=6&period=30'

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2**14, r=8, p=1)
    return '$'.join(['scrypt', _encode(salt), _encode(digest)])


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt_part, digest_part = stored.split('$')
        if scheme != 'scrypt':
            return False
        salt = base64.urlsafe_b64decode(salt_part + '=' * (-len(salt_part) % 4))
        expected = base64.urlsafe_b64decode(digest_part + '=' * (-len(digest_part) % 4))
        actual = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

def optional_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> str | None:
    if credentials is None:
        return None
    return require_authenticated_user(credentials, db)


_DUMMY_HASH = hash_password('senha-falsa-para-igualar-tempo')


def burn_password_time(password: str) -> None:
    """Gasta o mesmo tempo de uma verificação real para não revelar se o e-mail existe."""
    verify_password(password, _DUMMY_HASH)


def validate_password_strength(password: str) -> str | None:
    if len(password) < 8:
        return 'A senha deve ter ao menos 8 caracteres.'
    if len(password) > 128:
        return 'A senha deve ter no máximo 128 caracteres.'
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return 'A senha deve conter letras e números.'
    return None
