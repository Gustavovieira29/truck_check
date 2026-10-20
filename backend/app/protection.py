import logging
import threading
import time
from collections import defaultdict, deque

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger('truck_check_security')

MAX_BODY_BYTES = 16 * 1024 * 1024
API_MAX_REQUESTS = 240
API_WINDOW_SECONDS = 60


def client_ip(request: Request) -> str:
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'


SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
}


class SecurityMiddleware(BaseHTTPMiddleware):
    """Cabeçalhos de segurança, limite de tamanho e limite de requisições por IP."""

    def __init__(self, app) -> None:
        super().__init__(app)
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _too_many(self, ip: str) -> bool:
        now = time.time()
        with self._lock:
            hits = self._hits[ip]
            while hits and hits[0] < now - API_WINDOW_SECONDS:
                hits.popleft()
            if len(hits) >= API_MAX_REQUESTS:
                return True
            hits.append(now)
            if len(self._hits) > 5000:
                self._hits = defaultdict(deque, {k: v for k, v in self._hits.items() if v and v[-1] > now - API_WINDOW_SECONDS})
        return False

    async def dispatch(self, request: Request, call_next):
        if request.method != 'OPTIONS':
            length = request.headers.get('content-length')
            if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
                return self._with_headers(JSONResponse({'detail': 'Requisição grande demais.'}, status_code=413))
            if self._too_many(client_ip(request)):
                return self._with_headers(
                    JSONResponse({'detail': 'Muitas requisições. Aguarde um instante.'}, status_code=429, headers={'Retry-After': '60'}),
                )
        return self._with_headers(await call_next(request))

    @staticmethod
    def _with_headers(response):
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        if 'cache-control' not in response.headers:
            response.headers['Cache-Control'] = 'no-store'
        return response
