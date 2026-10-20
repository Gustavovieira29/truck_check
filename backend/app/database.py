from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.config import settings

connect_args = {'check_same_thread': False} if settings.database_url.startswith('sqlite') else {}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_columns() -> None:
    """Adiciona colunas novas em tabelas já existentes (create_all não altera tabelas)."""
    wanted = {'usuarios': {'totp_secret': 'VARCHAR', 'totp_ativo': 'BOOLEAN NOT NULL DEFAULT FALSE'}}
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table, columns in wanted.items():
            if not inspector.has_table(table):
                continue
            existing = {column['name'] for column in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing:
                    connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))
