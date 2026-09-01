from fastapi import APIRouter
from backend.app.schemas import LoginRequest, LoginResponse

router = APIRouter()


@router.post('/login', response_model=LoginResponse)
def login(payload: LoginRequest):
    if payload.email == 'admin@truckcheck.com' and payload.password == '123456':
        return LoginResponse(token='demo-jwt-token', user='admin')

    return LoginResponse(token='invalid', user='guest')
