from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.auditoria import audit
from backend.app.database import get_db
from backend.app.models import Auditoria, Sessao, Usuario
from backend.app.protection import client_ip
from backend.app.schemas import UsuarioCreate, UsuarioMe, UsuarioResponse
from backend.app.security import hash_password, require_authenticated_user, validate_password_strength

router = APIRouter()


def _current(db: Session, subject: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == subject, Usuario.ativo.is_(True)).first()


def _is_master(db: Session, subject: str) -> bool:
    if subject == 'admin':
        return True
    usuario = _current(db, subject)
    return usuario is not None and usuario.perfil == 'master'


def require_master(db: Session = Depends(get_db), subject: str = Depends(require_authenticated_user)) -> str:
    if not _is_master(db, subject):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Apenas o usuário master pode gerenciar usuários.')
    return subject


@router.get('/me', response_model=UsuarioMe)
def me(db: Session = Depends(get_db), subject: str = Depends(require_authenticated_user)):
    usuario = _current(db, subject)
    if usuario:
        return UsuarioMe(nome=usuario.nome, email=usuario.email, perfil=usuario.perfil, totpAtivo=bool(usuario.totp_ativo))
    return UsuarioMe(nome='admin', email=subject, perfil='master' if subject == 'admin' else 'usuario')


@router.get('/auditoria', dependencies=[Depends(require_master)])
def list_audit(db: Session = Depends(get_db)):
    rows = db.query(Auditoria).order_by(Auditoria.id.desc()).limit(200).all()
    return [
        {'id': r.id, 'criadoEm': r.criado_em.isoformat() + 'Z', 'evento': r.evento, 'email': r.email, 'ip': r.ip, 'detalhe': r.detalhe}
        for r in rows
    ]


@router.get('', response_model=list[UsuarioResponse], dependencies=[Depends(require_master)])
def list_users(db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.id).all()


@router.post('', response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_master)])
def create_user(payload: UsuarioCreate, request: Request, db: Session = Depends(get_db), subject: str = Depends(require_master)):
    nome = payload.nome.strip()
    email = payload.email.strip().casefold()
    if not nome or '@' not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Informe nome e e-mail válidos.')
    password_error = validate_password_strength(payload.password)
    if password_error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=password_error)
    if payload.perfil not in ('master', 'usuario'):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Perfil inválido.')
    if db.query(Usuario.id).filter(Usuario.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Este e-mail já está cadastrado.')

    usuario = Usuario(nome=nome, email=email, senha_hash=hash_password(payload.password), perfil=payload.perfil)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    audit(db, 'usuario_criado', subject, client_ip(request), f'{usuario.email} ({usuario.perfil})')
    return usuario


@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, request: Request, db: Session = Depends(get_db), subject: str = Depends(require_master)):
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Usuário não encontrado.')
    if usuario.email == subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Você não pode excluir o próprio usuário.')
    db.query(Sessao).filter(Sessao.email == usuario.email).update({'revogada': True})
    db.delete(usuario)
    db.commit()
    audit(db, 'usuario_excluido', subject, client_ip(request), usuario.email)
