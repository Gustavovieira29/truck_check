from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from backend.app.config import settings
from backend.app.database import Base, engine
from backend.app.database import SessionLocal
from backend.app.routes.assets import router as assets_router
from backend.app.routes.auth import router as auth_router
from backend.app.routes.inspections import router as inspections_router
from backend.app.routes.maintenance import router as maintenance_router
from backend.app.routes.parts import router as parts_router
from backend.app.routes.reports import router as reports_router
from backend.app.seed import seed_database


app = FastAPI(title='Truck Check API', version='1.0.0')

logger = logging.getLogger('truck_check_api')

app.add_middleware(
	CORSMiddleware,
	allow_origins=[origin.strip() for origin in settings.cors_origins.split(',') if origin.strip()],
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
)


@app.on_event('startup')
def startup_event() -> None:
	try:
		Base.metadata.create_all(bind=engine)
		with SessionLocal() as db:
			seed_database(db)
	except Exception as exc:  # pragma: no cover - protects local demo startup
		logger.warning('Database initialization failed; continuing with app startup. Error: %s', exc)


@app.get('/api/health')
def health_check() -> dict[str, str]:
	return {'status': 'ok', 'service': 'truck-check-api'}


app.include_router(auth_router, prefix='/api/auth', tags=['auth'])
app.include_router(assets_router, prefix='/api/assets', tags=['assets'])
app.include_router(maintenance_router, prefix='/api/maintenance', tags=['maintenance'])
app.include_router(parts_router, prefix='/api/parts', tags=['parts'])
app.include_router(inspections_router, prefix='/api/inspections', tags=['inspections'])
app.include_router(reports_router, prefix='/api/reports', tags=['reports'])
