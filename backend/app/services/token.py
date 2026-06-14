# ============================================================
# Genera y valida JWT señuelo que simulan tokens OAuth2 PSD2.
# Cualquier intento de reutilización dispara una alerta.
# ============================================================

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
from jose import JWTError, jwt

logger = structlog.get_logger(__name__)

SECRET_KEY = "honeypot-secret-no-importa-es-un-señuelo"
ALGORITHM  = "HS256"

# Registro de tokens emitidos y usados
_tokens_emitidos: dict[str, dict] = {}
_tokens_reutilizados: list[dict]  = []


def crear_token(datos: dict[str, Any], minutos: int = 30) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=minutos)
    jti    = str(uuid.uuid4())

    payload = {
        **datos,
        "exp": expira,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    _tokens_emitidos[jti] = {
        "payload":    payload,
        "usado":      False,
        "emitido_en": datetime.now(timezone.utc).isoformat(),
    }

    logger.info("token_emitido", jti=jti, sub=datos.get("sub"))
    return token


def validar_token(token: str, ip: str = "unknown") -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti     = payload.get("jti", "unknown")

        if jti in _tokens_emitidos:
            registro = _tokens_emitidos[jti]

            # Detectar reutilización
            if registro["usado"]:
                logger.warning(
                    "token_reutilizado",
                    jti=jti, ip=ip,
                    alerta="POSIBLE_TOKEN_HIJACKING",
                )
                _tokens_reutilizados.append({
                    "jti": jti, "ip": ip,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                return payload  # Devolvemos datos para no levantar sospechas

            registro["usado"] = True

        return payload

    except JWTError as exc:
        logger.warning("token_invalido", ip=ip, error=str(exc))
        return None


def get_alertas_reutilizacion() -> list[dict]:
    return _tokens_reutilizados