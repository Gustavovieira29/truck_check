from datetime import date

from backend.app.models import Asset, MaintenanceRecord


def seed_database(db) -> None:
    assets = [
        Asset(code='VEI-001', name='Caminhão Mercedes Atego', type='vehicle', category='Caminhão Leve', plate='ABC-1D23', responsible='Roberto Alves', location='Garagem Norte', status='ok', last_inspection=date(2025, 7, 15), next_maintenance=date(2025, 8, 20), days_until_maintenance=16, mileage=48320, brand='Mercedes-Benz', model='Atego 1719', year=2022),
        Asset(code='VEI-002', name='Van Fiorino Cargo', type='vehicle', category='Van', plate='DEF-4G56', responsible='Carla Mendes', location='Garagem Sul', status='warning', last_inspection=date(2025, 6, 10), next_maintenance=date(2025, 8, 8), days_until_maintenance=4, mileage=91540, brand='Fiat', model='Fiorino Cargo 1.4', year=2021),
        Asset(code='VEI-003', name='Caminhonete Hilux', type='vehicle', category='Picape', plate='GHI-7J89', responsible='Lucas Ferreira', location='Campo Externo', status='overdue', last_inspection=date(2025, 5, 1), next_maintenance=date(2025, 7, 25), days_until_maintenance=-10, mileage=62100, brand='Toyota', model='Hilux 2.8 TDI', year=2023),
        Asset(code='EQP-001', name='Compressor de Ar Industrial', type='equipment', category='Pneumático', responsible='Marcio Santos', location='Oficina Central', status='ok', last_inspection=date(2025, 7, 1), next_maintenance=date(2025, 9, 1), days_until_maintenance=28, brand='Schulz', model='CSL 40/425', year=2019),
        Asset(code='FER-001', name='Guindaste Manual 3T', type='tool', category='Içamento', responsible='Marcio Santos', location='Galpão A', status='critical', last_inspection=date(2025, 4, 10), next_maintenance=date(2025, 8, 5), days_until_maintenance=1, brand='Tander', model='HC-3000', year=2020),
        Asset(code='VEI-004', name='Ônibus Rodoviário', type='vehicle', category='Ônibus', plate='JKL-0M12', responsible='Ana Ribeiro', location='Garagem Norte', status='ok', last_inspection=date(2025, 7, 20), next_maintenance=date(2025, 10, 15), days_until_maintenance=72, mileage=210450, brand='Mercedes-Benz', model='OF-1721', year=2020),
        Asset(code='EQP-002', name='Gerador a Diesel 80kVA', type='equipment', category='Elétrico', responsible='Paulo Gomes', location='Subestação', status='warning', last_inspection=date(2025, 6, 30), next_maintenance=date(2025, 8, 12), days_until_maintenance=8, brand='Stemac', model='SG-80', year=2018),
        Asset(code='FER-002', name='Empilhadeira Elétrica', type='tool', category='Movimentação', responsible='João Silva', location='Galpão B', status='inactive', last_inspection=date(2025, 3, 20), next_maintenance=date(2025, 8, 1), days_until_maintenance=-3, brand='Yale', model='ERP25', year=2022),
    ]
    known_codes = {code for (code,) in db.query(Asset.code).all()}
    db.add_all([asset for asset in assets if asset.code not in known_codes])
    db.flush()

    if not db.query(MaintenanceRecord).filter(MaintenanceRecord.asset_code == 'VEI-003').first():
        hilux = db.query(Asset).filter(Asset.code == 'VEI-003').first()
        if hilux:
            db.add(MaintenanceRecord(asset_id=hilux.id, asset_name='Caminhonete Hilux', asset_code='VEI-003', type='preventive', description='Revisão 60.000 km', scheduled_date=date(2025, 7, 25), responsible='Lucas Ferreira', status='overdue', days_until=-10))

    completed_asset_ids = {
        asset_id for (asset_id,) in db.query(MaintenanceRecord.asset_id)
        .filter(MaintenanceRecord.status == 'completed')
        .all()
    }
    if completed_asset_ids:
        db.query(Asset).filter(Asset.id.in_(completed_asset_ids), Asset.status == 'overdue').update(
            {'status': 'ok', 'days_until_maintenance': 0},
            synchronize_session=False,
        )

    overdue_maintenances = db.query(MaintenanceRecord).filter(MaintenanceRecord.status == 'overdue').all()
    for maintenance in overdue_maintenances:
        asset = db.query(Asset).filter(Asset.id == maintenance.asset_id).first()
        if asset:
            asset.status = 'overdue'
            asset.next_maintenance = maintenance.scheduled_date
            asset.days_until_maintenance = maintenance.days_until
    db.commit()