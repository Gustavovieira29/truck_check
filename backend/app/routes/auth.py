import secrets

from fastapi import APIRouter, HTTPException, status
from backend.app.config import settings
from backend.app.schemas import LoginRequest, LoginResponse

router = APIRouter()


@router.post('/login', response_model=LoginResponse)
def login(payload: LoginRequest):
    if not settings.admin_password:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail='Configure ADMIN_PASSWORD no ambiente do backend.')

    if payload.email == settings.admin_email and payload.password == settings.admin_password:
        return LoginResponse(token=secrets.token_urlsafe(32), user='admin')

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='E-mail ou senha inválidos.')
