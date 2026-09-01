from datetime import date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split('_')
    return first + ''.join(word.capitalize() for word in rest)


class AssetBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    code: str
    name: str
    type: str
    category: Optional[str] = None
    plate: Optional[str] = None
    serial_number: Optional[str] = None
    responsible: str
    location: Optional[str] = None
    status: str = 'ok'
    last_inspection: Optional[date] = None
    next_maintenance: Optional[date] = None
    days_until_maintenance: int = 0
    mileage: Optional[int] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    notes: Optional[str] = None


class AssetCreate(AssetBase):
    pass


class AssetResponse(AssetBase):
    id: int

    class Config:
        from_attributes = True


class MaintenanceBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    asset_id: int
    asset_name: str
    asset_code: str
    type: str
    description: str
    scheduled_date: date
    completed_date: Optional[date] = None
    responsible: str
    status: str = 'scheduled'
    cost: Optional[float] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    days_until: int = 0


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceResponse(MaintenanceBase):
    id: int

    class Config:
        from_attributes = True


class InspectionBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    asset_id: int
    asset_name: str
    asset_code: str
    date: date
    inspector: str
    image_url: Optional[str] = None
    ai_score: int = Field(..., ge=0, le=100)
    ai_findings: Optional[str] = None
    ai_status: str
    approved: bool = False


class InspectionCreate(InspectionBase):
    pass


class InspectionResponse(InspectionBase):
    id: int

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    type: str
    period: str
    recipients: List[str] = []
    status: str = 'created'
    generated_at: date
    sent_at: Optional[date] = None


class ReportCreate(ReportBase):
    pass


class ReportResponse(ReportBase):
    id: int

    class Config:
        from_attributes = True


class ReportDeliveryResponse(ReportResponse):
    email_sent: bool
    message: str


class PartBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    code: str
    name: str
    quantity: int = Field(default=0, ge=0)
    minimum_quantity: int = Field(default=0, ge=0)
    unit: str = 'un'
    location: Optional[str] = None
    asset_id: Optional[int] = None


class PartCreate(PartBase):
    pass


class PartResponse(PartBase):
    id: int

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: str
