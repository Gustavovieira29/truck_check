from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from datetime import datetime

from sqlalchemy.orm import relationship

from backend.app.database import Base


class Asset(Base):
    __tablename__ = 'assets'

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    category = Column(String, nullable=True)
    plate = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    responsible = Column(String, nullable=False)
    location = Column(String, nullable=True)
    status = Column(String, nullable=False, default='ok')
    last_inspection = Column(Date, nullable=True)
    next_maintenance = Column(Date, nullable=True)
    days_until_maintenance = Column(Integer, default=0)
    mileage = Column(Integer, nullable=True)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    maintenance_records = relationship('MaintenanceRecord', back_populates='asset')
    inspections = relationship('InspectionReport', back_populates='asset')


class MaintenanceRecord(Base):
    __tablename__ = 'maintenance_records'

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=False)
    asset_name = Column(String, nullable=False)
    asset_code = Column(String, nullable=False)
    type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    scheduled_date = Column(Date, nullable=False)
    completed_date = Column(Date, nullable=True)
    responsible = Column(String, nullable=False)
    status = Column(String, nullable=False, default='scheduled')
    cost = Column(Float, nullable=True)
    provider = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    days_until = Column(Integer, default=0)

    asset = relationship('Asset', back_populates='maintenance_records')


class InspectionReport(Base):
    __tablename__ = 'inspection_reports'

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=False)
    asset_name = Column(String, nullable=False)
    asset_code = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    inspector = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    ai_score = Column(Integer, nullable=False)
    ai_findings = Column(Text, nullable=True)
    ai_status = Column(String, nullable=False)
    approved = Column(Boolean, default=False)

    asset = relationship('Asset', back_populates='inspections')


class ReportLog(Base):
    __tablename__ = 'report_logs'

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)
    period = Column(String, nullable=False)
    recipients = Column(Text, nullable=True)
    status = Column(String, nullable=False, default='created')
    generated_at = Column(Date, nullable=False)
    sent_at = Column(Date, nullable=True)


class Part(Base):
    __tablename__ = 'parts'

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    minimum_quantity = Column(Integer, nullable=False, default=0)
    unit = Column(String, nullable=False, default='un')
    location = Column(String, nullable=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=True)

    asset = relationship('Asset')

class Usuario(Base):
    __tablename__ = 'usuarios'

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    perfil = Column(String, nullable=False, default='master')
    ativo = Column(Boolean, nullable=False, default=True)
    criado_em = Column(DateTime, nullable=False, default=datetime.utcnow)
    totp_secret = Column(String, nullable=True)
    totp_ativo = Column(Boolean, nullable=False, default=False)


class Sessao(Base):
    __tablename__ = 'sessoes'

    jti = Column(String, primary_key=True)
    email = Column(String, index=True, nullable=False)
    ip = Column(String, nullable=True)
    criado_em = Column(DateTime, nullable=False, default=datetime.utcnow)
    ultimo_uso = Column(DateTime, nullable=False, default=datetime.utcnow)
    expira_em = Column(DateTime, nullable=False)
    revogada = Column(Boolean, nullable=False, default=False)


class Auditoria(Base):
    __tablename__ = 'auditoria'

    id = Column(Integer, primary_key=True, index=True)
    criado_em = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    evento = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True, index=True)
    ip = Column(String, nullable=True, index=True)
    detalhe = Column(String, nullable=True)
