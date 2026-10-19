import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.config import settings

_bearer_scheme = HTTPBearer(auto_error=False)
_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60


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


def create_access_token() -> str:
    payload = _encode(json.dumps(
        {'sub': 'admin', 'exp': int(time.time()) + _TOKEN_LIFETIME_SECONDS},
        separators=(',', ':'),
    ).encode('utf-8'))
    signature = _encode(hmac.new(_signing_secret(), payload.encode('ascii'), hashlib.sha256).digest())
    return f'{payload}.{signature}'


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
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
        if payload.get('sub') != 'admin' or int(payload.get('exp', 0)) <= int(time.time()):
            raise ValueError('Expired or invalid token')
    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Sessão inválida ou expirada. Entre novamente.',
            headers={'WWW-Authenticate': 'Bearer'},
        ) from None

    return 'admin'
