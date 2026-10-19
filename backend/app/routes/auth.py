import hmac

from fastapi import APIRouter, HTTPException, status
from backend.app.config import settings
from backend.app.schemas import LoginRequest, LoginResponse
from backend.app.security import create_access_token

router = APIRouter()


@router.post('/login', response_model=LoginResponse)
def login(payload: LoginRequest):
    if not settings.admin_password:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail='Configure ADMIN_PASSWORD no ambiente do backend.')

    email_matches = hmac.compare_digest(payload.email.strip().casefold(), settings.admin_email.strip().casefold())
    password_matches = hmac.compare_digest(payload.password, settings.admin_password)
    if email_matches and password_matches:
        return LoginResponse(token=create_access_token(), user='admin')

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='E-mail ou senha inválidos.')
