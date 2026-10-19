import hmac

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import Usuario
from backend.app.schemas import AuthStatus, LoginRequest, LoginResponse, MasterCreate
from backend.app.security import (
    create_access_token,
    hash_password,
    optional_authenticated_user,
    verify_password,
)

router = APIRouter()

INVALID_CREDENTIALS = 'E-mail ou senha inválidos.'


@router.get('/status', response_model=AuthStatus)
def auth_status(db: Session = Depends(get_db)):
    return AuthStatus(masterExists=db.query(Usuario.id).filter(Usuario.perfil == 'master').first() is not None)


@router.post('/master', response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def create_master(payload: MasterCreate, db: Session = Depends(get_db), caller: str | None = Depends(optional_authenticated_user)):
    master_exists = db.query(Usuario.id).filter(Usuario.perfil == 'master').first() is not None
    if master_exists and caller is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Já existe um usuário master. Entre para criar outros.')

    nome = payload.nome.strip()
    email = payload.email.strip().casefold()
    if not nome or '@' not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Informe nome e e-mail válidos.')
    if len(payload.password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='A senha deve ter ao menos 6 caracteres.')
    if db.query(Usuario.id).filter(Usuario.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Este e-mail já está cadastrado.')

    db.add(Usuario(nome=nome, email=email, senha_hash=hash_password(payload.password), perfil='master'))
    db.commit()
    return LoginResponse(token=create_access_token(email), user=nome)


@router.post('/login', response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().casefold()

    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.ativo.is_(True)).first()
    if usuario and verify_password(payload.password, usuario.senha_hash):
        return LoginResponse(token=create_access_token(usuario.email), user=usuario.nome)

    if settings.admin_password:
        email_matches = hmac.compare_digest(email, settings.admin_email.strip().casefold())
        password_matches = hmac.compare_digest(payload.password, settings.admin_password)
        if email_matches and password_matches:
            return LoginResponse(token=create_access_token(), user='admin')

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)
