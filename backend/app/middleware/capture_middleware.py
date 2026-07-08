# ============================================================
# app/middleware/capture_middleware.py
# Middleware FastAPI que captura automáticamente
# cada request entrante sin tocar los routers
# ============================================================

import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from jose import jwt

from app.database.connection import SessionLocal
from app.database.repository import guardar_evento
from app.database.models import Usuario
from app.services.token import SECRET_KEY, ALGORITHM
from app.services.capture import capture_request

logger = structlog.get_logger(__name__)


def _extraer_sub(request: Request) -> str | None:
    """Extrae el 'sub' del JWT del header Authorization, sin bloquear la captura."""
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        # verify_exp=False: en un honeypot queremos atribuir el evento
        # aunque el token esté caducado (token replay).
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_exp": False},
        )
        return payload.get("sub")
    except Exception:
        return None


class CaptureMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        body_bytes = await request.body()

        async def receive():
            return {"type": "http.request", "body": body_bytes}

        request._receive = receive

        # Limpiar contexto por si quedara algo de una petición anterior
        structlog.contextvars.clear_contextvars()

        try:
            evento = await capture_request(request)

            # Resolver usuario a partir del JWT (opcional)
            usuario_id = None
            sub = _extraer_sub(request)

            db = SessionLocal()
            try:
                if sub:
                    usuario = db.query(Usuario).filter(Usuario.email == sub).first()
                    usuario_id = usuario.id if usuario else None

                # Bindear el usuario al contexto: todas las líneas de log
                # de esta petición (banking, otp, etc.) llevarán estos campos.
                structlog.contextvars.bind_contextvars(
                    usuario=sub or "anon",
                    usuario_id=str(usuario_id) if usuario_id else None,
                )

                guardar_evento(db, evento, usuario_id=usuario_id)
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

        # Limpiar el contexto para no filtrarlo a la siguiente petición
        structlog.contextvars.clear_contextvars()

        return response