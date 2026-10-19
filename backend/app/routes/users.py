from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Usuario
from backend.app.schemas import UsuarioCreate, UsuarioMe, UsuarioResponse
from backend.app.security import hash_password, require_authenticated_user

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
        return UsuarioMe(nome=usuario.nome, email=usuario.email, perfil=usuario.perfil)
    return UsuarioMe(nome='admin', email=subject, perfil='master' if subject == 'admin' else 'usuario')


@router.get('', response_model=list[UsuarioResponse], dependencies=[Depends(require_master)])
def list_users(db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.id).all()


@router.post('', response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_master)])
def create_user(payload: UsuarioCreate, db: Session = Depends(get_db)):
    nome = payload.nome.strip()
    email = payload.email.strip().casefold()
    if not nome or '@' not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Informe nome e e-mail válidos.')
    if len(payload.password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='A senha deve ter ao menos 6 caracteres.')
    if payload.perfil not in ('master', 'usuario'):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Perfil inválido.')
    if db.query(Usuario.id).filter(Usuario.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Este e-mail já está cadastrado.')

    usuario = Usuario(nome=nome, email=email, senha_hash=hash_password(payload.password), perfil=payload.perfil)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), subject: str = Depends(require_master)):
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Usuário não encontrado.')
    if usuario.email == subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Você não pode excluir o próprio usuário.')
    db.delete(usuario)
    db.commit()
