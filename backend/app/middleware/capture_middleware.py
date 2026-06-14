# ============================================================
# app/middleware/capture_middleware.py
# Middleware FastAPI que captura automáticamente
# cada request entrante sin tocar los routers
# ============================================================

import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.database.connection import SessionLocal
from app.database.repository import guardar_evento

from app.services.capture import capture_request

logger = structlog.get_logger(__name__)


class CaptureMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        body_bytes = await request.body()

        async def receive():
            return {"type": "http.request", "body": body_bytes}

        request._receive = receive

        try:
            evento = await capture_request(request)
            # Guardar en PostgreSQL
            db = SessionLocal()
            try:
                guardar_evento(db, evento)
            finally:
                db.close()
        except Exception as exc:
            logger.error("capture_middleware_failed", error=str(exc))

        request._receive = receive
        response = await call_next(request)

        logger.info("response_enviada",
            path=str(request.url.path),
            status_code=response.status_code,
            metodo=request.method,
        )

        return response