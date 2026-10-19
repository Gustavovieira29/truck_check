from datetime import date

from backend.app.models import Asset, InspectionReport, MaintenanceRecord


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

    maintenances = [
        ('VEI-003', 'preventive', 'Revisão 60.000 km — troca de óleo, filtros e correia dentada', date(2025, 7, 25), 'Lucas Ferreira', 'overdue', 'Toyota Center SP', None, -10),
        ('FER-001', 'inspection', 'Renovação de laudo INMETRO e inspeção de segurança anual', date(2025, 8, 5), 'Marcio Santos', 'scheduled', 'Metrolab Certificações', 1200, 1),
        ('VEI-002', 'preventive', 'Troca de filtro de ar, vela de ignição e fluido de freio', date(2025, 8, 8), 'Carla Mendes', 'scheduled', 'Oficina Central', 480, 4),
        ('EQP-002', 'preventive', 'Troca de óleo motor, filtro e teste de carga completo', date(2025, 8, 12), 'Paulo Gomes', 'scheduled', None, 850, 8),
        ('VEI-001', 'preventive', 'Revisão programada 50.000 km', date(2025, 8, 20), 'Roberto Alves', 'scheduled', 'Mercedes-Benz SP', 2100, 16),
        ('EQP-001', 'preventive', 'Limpeza de filtros, troca de óleo e calibração de pressão', date(2025, 9, 1), 'Marcio Santos', 'scheduled', None, 320, 28),
        ('FER-002', 'corrective', 'Substituição de conjunto de baterias tracionárias', date(2025, 7, 30), 'João Silva', 'in_progress', 'Yale Service', 4800, -5),
        ('VEI-004', 'inspection', 'Vistoria DETRAN semestral e renovação de licença', date(2025, 10, 15), 'Ana Ribeiro', 'scheduled', None, 650, 72),
    ]
    assets_by_code = {a.code: a for a in db.query(Asset).all()}
    known_maintenances = {(m.asset_code, m.scheduled_date) for m in db.query(MaintenanceRecord).all()}
    for code, kind, description, scheduled, responsible, status, provider, cost, days in maintenances:
        asset = assets_by_code.get(code)
        if asset and (code, scheduled) not in known_maintenances:
            db.add(MaintenanceRecord(asset_id=asset.id, asset_name=asset.name, asset_code=code, type=kind, description=description, scheduled_date=scheduled, responsible=responsible, status=status, provider=provider, cost=cost, days_until=days))

    inspections = [
        ('VEI-001', date(2025, 7, 15), 'Roberto Alves', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&auto=format', 94, ['Pneus em boas condições', 'Faróis funcionando normalmente', 'Sem danos visíveis na carroceria', 'Espelhos retrovisores íntegros'], 'ok', True),
        ('VEI-002', date(2025, 6, 10), 'Carla Mendes', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&auto=format', 71, ['Arranhão leve no para-choque traseiro', 'Pneu dianteiro direito com desgaste acentuado', 'Vidro lateral com pequena trinca — monitorar', 'Carroceria sem danos estruturais'], 'warning', False),
        ('FER-001', date(2025, 4, 10), 'Marcio Santos', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop&auto=format', 58, ['Corrente com sinais de oxidação', 'Gancho com deformação leve detectada', 'Estrutura principal sem fraturas visíveis', 'Etiqueta de capacidade ilegível — substituir'], 'critical', False),
    ]
    known_inspections = {(i.asset_code, i.date) for i in db.query(InspectionReport).all()}
    for code, day, inspector, image, score, findings, status, approved in inspections:
        asset = assets_by_code.get(code)
        if asset and (code, day) not in known_inspections:
            db.add(InspectionReport(asset_id=asset.id, asset_name=asset.name, asset_code=code, date=day, inspector=inspector, image_url=image, ai_score=score, ai_findings='\n'.join(findings), ai_status=status, approved=approved))
    db.flush()
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
