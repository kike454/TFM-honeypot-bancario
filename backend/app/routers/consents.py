
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.token import crear_token
from app.services.fake_data import ENTIDADES
from app.database.connection import get_db
from app.database.repository import (
    guardar_credencial, guardar_auth_code,
    get_auth_code, marcar_auth_code_usado, guardar_token
)
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1", tags=["consents"])


class ConsentRequest(BaseModel):
    entidad:  str = Field(max_length=20)
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)
    scope:    str = Field(default="accounts balances transactions", max_length=100)


class TokenRequest(BaseModel):
    grant_type: str
    code:       str
    entidad:    str


@router.post("/consents")
async def crear_consentimiento(body: ConsentRequest, db: Session = Depends(get_db)):
    if body.entidad not in ENTIDADES:
        raise HTTPException(status_code=400, detail="Entidad no soportada")

    logger.warning(
        "credenciales_capturadas",
        entidad=body.entidad,
        username=body.username,
        password=body.password,
        alerta="CREDENCIALES_PSD2_INTERCEPTADAS",
    )

    # Guardar credenciales en PostgreSQL
    guardar_credencial(
        db       = db,
        ip       = "unknown",
        entidad  = body.entidad,
        username = body.username,
        password = body.password,
        endpoint = "/v1/consents",
        alerta   = "CREDENCIALES_PSD2_INTERCEPTADAS",
    )

    # Generar y guardar auth code
    auth_code  = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    guardar_auth_code(
        db         = db,
        code       = auth_code,
        entidad    = body.entidad,
        username   = body.username,
        scope      = body.scope,
        expires_at = expires_at,
    )

    return {
        "consentId":  str(uuid.uuid4()),
        "status":     "received",
        "scaStatus":  "scaMethodSelected",
        "authCode":   auth_code,
        "_links": {
            "scaStatus": {"href": f"/v1/consents/sca/{auth_code}"},
            "token":     {"href": "/v1/token"},
        }
    }


@router.get("/consents/sca/{auth_code}")
async def sca_status(auth_code: str, db: Session = Depends(get_db)):
    datos = get_auth_code(db, auth_code)
    if not datos:
        raise HTTPException(status_code=404, detail="Consent not found")

    return {
        "scaStatus": "finalised",
        "authCode":  auth_code,
        "_links": {
            "token": {"href": "/v1/token"}
        }
    }


@router.post("/token")
async def get_token(body: TokenRequest, db: Session = Depends(get_db)):
    if body.grant_type != "authorization_code":
        raise HTTPException(status_code=400, detail="Invalid grant_type")

    datos_consent = get_auth_code(db, body.code)
    if not datos_consent:
        raise HTTPException(status_code=400, detail="Invalid code")

    marcar_auth_code_usado(db, body.code)

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    token_data = {
        "sub":     datos_consent.username,
        "entidad": datos_consent.entidad,
        "scope":   datos_consent.scope,
    }
    token = crear_token(token_data, minutos=30)

    # Extraer jti del token para guardarlo
    from jose import jwt as jose_jwt
    from app.services.token import SECRET_KEY, ALGORITHM
    payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    guardar_token(
        db         = db,
        jti        = payload["jti"],
        sub        = datos_consent.username,
        entidad    = datos_consent.entidad,
        scope      = datos_consent.scope,
        expires_at = expires_at,
    )

    return {
        "access_token": token,
        "token_type":   "Bearer",
        "expires_in":   1800,
        "scope":        datos_consent.scope,
    }