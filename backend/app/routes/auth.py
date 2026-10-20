import hmac

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.auditoria import audit, ensure_not_locked
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Usuario
from backend.app.protection import client_ip
from backend.app.schemas import AuthStatus, LoginRequest, LoginResponse, MasterCreate
from backend.app.security import (
    bearer_credentials,
    burn_password_time,
    create_access_token,
    generate_totp_secret,
    hash_password,
    optional_authenticated_user,
    require_authenticated_user,
    revoke_session,
    totp_uri,
    validate_password_strength,
    verify_password,
    verify_totp,
)

router = APIRouter()

INVALID_CREDENTIALS = 'E-mail ou senha inválidos.'
INVALID_CODE = 'Código de verificação inválido.'
CODE_REQUIRED = 'CODIGO_2FA_NECESSARIO'


class CodePayload(BaseModel):
    code: str = Field(max_length=10)


@router.get('/status', response_model=AuthStatus)
def auth_status(db: Session = Depends(get_db)):
    return AuthStatus(masterExists=db.query(Usuario.id).filter(Usuario.perfil == 'master').first() is not None)


@router.post('/master', response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def create_master(payload: MasterCreate, request: Request, db: Session = Depends(get_db), caller: str | None = Depends(optional_authenticated_user)):
    ip = client_ip(request)
    master_exists = db.query(Usuario.id).filter(Usuario.perfil == 'master').first() is not None
    if master_exists and caller is None:
        audit(db, 'master_negado', payload.email, ip, 'Tentativa de criar master já existente')
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
    audit(db, 'master_criado', email, ip)
    return LoginResponse(token=create_access_token(db, email, ip), user=nome)


@router.post('/login', response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().casefold()
    ip = client_ip(request)
    ensure_not_locked(db, ip, email)

    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.ativo.is_(True)).first()
    if usuario:
        if verify_password(payload.password, usuario.senha_hash):
            if usuario.totp_ativo:
                if not payload.code:
                    raise HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail=CODE_REQUIRED)
                if not verify_totp(usuario.totp_secret or '', payload.code):
                    audit(db, 'login_falha', email, ip, '2FA inválido')
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CODE)
            audit(db, 'login_ok', email, ip)
            return LoginResponse(token=create_access_token(db, usuario.email, ip), user=usuario.nome)
    else:
        burn_password_time(payload.password)

    if settings.admin_password:
        email_matches = hmac.compare_digest(email, settings.admin_email.strip().casefold())
        password_matches = hmac.compare_digest(payload.password, settings.admin_password)
        if email_matches and password_matches:
            audit(db, 'login_ok', email, ip, 'admin de ambiente')
            return LoginResponse(token=create_access_token(db, 'admin', ip), user='admin')

    audit(db, 'login_falha', email, ip)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    db: Session = Depends(get_db),
    subject: str = Depends(require_authenticated_user),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_credentials),
):
    revoke_session(db, credentials)
    audit(db, 'logout', subject, client_ip(request))


def _own_user(db: Session, subject: str) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.email == subject, Usuario.ativo.is_(True)).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Recurso indisponível para o admin de ambiente.')
    return usuario


@router.post('/2fa/setup')
def setup_2fa(db: Session = Depends(get_db), subject: str = Depends(require_authenticated_user)):
    usuario = _own_user(db, subject)
    if usuario.totp_ativo:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='A verificação em duas etapas já está ativa.')
    usuario.totp_secret = generate_totp_secret()
    db.commit()
    return {'secret': usuario.totp_secret, 'uri': totp_uri(usuario.totp_secret, usuario.email)}


@router.post('/2fa/enable', status_code=status.HTTP_204_NO_CONTENT)
def enable_2fa(payload: CodePayload, request: Request, db: Session = Depends(get_db), subject: str = Depends(require_authenticated_user)):
    usuario = _own_user(db, subject)
    if not usuario.totp_secret or not verify_totp(usuario.totp_secret, payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CODE)
    usuario.totp_ativo = True
    db.commit()
    audit(db, '2fa_ativado', subject, client_ip(request))


@router.post('/2fa/disable', status_code=status.HTTP_204_NO_CONTENT)
def disable_2fa(payload: CodePayload, request: Request, db: Session = Depends(get_db), subject: str = Depends(require_authenticated_user)):
    usuario = _own_user(db, subject)
    if not usuario.totp_ativo or not verify_totp(usuario.totp_secret or '', payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CODE)
    usuario.totp_ativo = False
    usuario.totp_secret = None
    db.commit()
    audit(db, '2fa_desativado', subject, client_ip(request))
