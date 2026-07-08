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
from app.database.models import Usuario

from app.services.capture import capture_request

# Si ya tienes un helper para decodificar el JWT, úsalo en su lugar.
import jwt  # PyJWT

logger = structlog.get_logger(__name__)

# Ajusta a tu configuración real (idealmente desde variables de entorno / settings)
JWT_SECRET = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"


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
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
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

        return response