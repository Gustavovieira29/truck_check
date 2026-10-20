import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Usuario
from backend.app.schemas import AuthStatus, LoginRequest, LoginResponse, MasterCreate
from backend.app.security import (
    create_access_token,
    hash_password,
    burn_password_time,
    optional_authenticated_user,
    validate_password_strength,
    verify_password,
)
from backend.app.protection import client_ip, login_guard

router = APIRouter()
logger = logging.getLogger('truck_check_security')

INVALID_CREDENTIALS = 'E-mail ou senha inválidos.'


@router.get('/status', response_model=AuthStatus)
def auth_status(db: Session = Depends(get_db)):
    return AuthStatus(masterExists=db.query(Usuario.id).filter(Usuario.perfil == 'master').first() is not None)


@router.post('/master', response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def create_master(payload: MasterCreate, request: Request, db: Session = Depends(get_db), caller: str | None = Depends(optional_authenticated_user)):
    login_guard.check(client_ip(request), 'master-setup')
    master_exists = db.query(Usuario.id).filter(Usuario.perfil == 'master').first() is not None
    if master_exists and caller is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Já existe um usuário master. Entre para criar outros.')

    nome = payload.nome.strip()
    email = payload.email.strip().casefold()
    if not nome or '@' not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Informe nome e e-mail válidos.')
    password_error = validate_password_strength(payload.password)
    if password_error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=password_error)
    if db.query(Usuario.id).filter(Usuario.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Este e-mail já está cadastrado.')

    db.add(Usuario(nome=nome, email=email, senha_hash=hash_password(payload.password), perfil='master'))
    db.commit()
    return LoginResponse(token=create_access_token(email), user=nome)


@router.post('/login', response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().casefold()[:254]
    ip = client_ip(request)
    login_guard.check(ip, email)

    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.ativo.is_(True)).first()
    if usuario:
        if verify_password(payload.password, usuario.senha_hash):
            login_guard.register_success(ip, email)
            logger.info('Login ok: %s (%s)', email, ip)
            return LoginResponse(token=create_access_token(usuario.email), user=usuario.nome)
    else:
        burn_password_time(payload.password)

    if settings.admin_password:
        email_matches = hmac.compare_digest(email, settings.admin_email.strip().casefold())
        password_matches = hmac.compare_digest(payload.password, settings.admin_password)
        if email_matches and password_matches:
            login_guard.register_success(ip, email)
            logger.info('Login ok (admin de ambiente): %s', ip)
            return LoginResponse(token=create_access_token(), user='admin')

    login_guard.register_failure(ip, email)
    logger.warning('Login falhou: %s (%s)', email, ip)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)
