import uuid
import asyncio
import structlog

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.fake_data import generar_sesion_bancaria
from app.services.token import crear_token
from app.database.connection import get_db, SessionLocal
from app.database.repository import guardar_credencial, guardar_alerta
from app.database.models import OTP
from app.services.email import generar_codigo_otp, enviar_otp_email

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1", tags=["banking"])


# ============================================================
# Función síncrona de envío OTP
# ============================================================

def _enviar_otp_reset(email: str, nombre: str) -> None:
    db = SessionLocal()
    try:
        db.query(OTP).filter(OTP.email == email, OTP.usado == False).update({"usado": True})
        db.commit()
        codigo     = generar_codigo_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.add(OTP(email=email, codigo=codigo, usado=False, expires_at=expires_at))
        db.commit()
        enviar_otp_email(email, codigo, nombre)
    except Exception as exc:
        print(f"ERROR reset OTP: {exc}")
    finally:
        db.close()


# ============================================================
# MODELOS, clases que definen la estructura y validación del body que llega en cada request. 
# En caso de que no cumpla el esquema, devuelve un código 422.
# ============================================================

class AuthRequest(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)
    entidad:  str = Field(max_length=20)

#simula transferencia bancaria en formato Berlin group
class TransferRequest(BaseModel):
    iban_origen:  str = Field(max_length=34)
    iban_destino: str = Field(max_length=34)
    importe:      float
    concepto:     str = Field(max_length=200)

class PasswordResetRequest(BaseModel):
    email: str = Field(max_length=200)


DOCUMENTOS_FALSOS = {
    "extracto_enero_2026.pdf":  "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBv==",
    "nomina_marzo_2026.pdf":    "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBv==",
    "contrato_cuenta.pdf":      "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBv==",
    "credenciales_backup.txt":  "dXNlcjpwYXNzd29yZA==",
    "config_prod.json":         "eyJkYiI6InBvc3RncmVzcWwiLCJob3N0IjoibG9jYWxob3N0In0=",
}

URLS_INTERNAS = [
    "169.254.169.254", "localhost", "127.0.0.1",
    "10.0.", "192.168.", "172.16.",
]

IMDS_FAKE_RESPONSE = {
    "Code":            "Success",
    "LastUpdated":     "2026-01-01T00:00:00Z",
    "Type":            "AWS-HMAC",
    "AccessKeyId":     "AKIAIOSFODNN7EXAMPLE",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Token":           "AQoDYXdzEJr//////////wEa...(token falso)...==",
    "Expiration":      "2026-12-31T23:59:59Z",
}


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/auth")
async def auth(body: AuthRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"

    logger.warning("credenciales_capturadas", entidad=body.entidad,
        username=body.username, password=body.password,
        alerta="CREDENCIALES_LOGIN_INTERCEPTADAS")

    guardar_credencial(db=db, ip=ip, entidad=body.entidad,
        username=body.username, password=body.password,
        endpoint="/v1/auth", alerta="CREDENCIALES_LOGIN_INTERCEPTADAS")

    token = crear_token({
        "sub": body.username, "entidad": body.entidad,
        "scope": "accounts balances transactions",
    })

    return {
        "access_token": token, "token_type": "Bearer", "expires_in": 1800,
        "user": {"id": str(uuid.uuid4()), "username": body.username, "entidad": body.entidad}
    }


@router.post("/transfer")
async def transfer(body: TransferRequest, request: Request, db: Session = Depends(get_db)):
    ip          = request.client.host if request.client else "unknown"
    transfer_id = str(uuid.uuid4())

    logger.warning("transferencia_capturada", iban_origen=body.iban_origen,
        iban_destino=body.iban_destino, importe=body.importe,
        alerta="INTENTO_TRANSFERENCIA_INTERCEPTADO")

    guardar_alerta(db=db, ip=ip, tipo="TRANSFERENCIA",
        descripcion=f"Intento de transferencia {body.iban_origen} → {body.iban_destino}",
        payload={"iban_origen": body.iban_origen, "iban_destino": body.iban_destino,
                 "importe": body.importe, "concepto": body.concepto},
        severidad="high")

    return {
        "transferId": transfer_id, "status": "ACSC",
        "iban_origen": body.iban_origen, "iban_destino": body.iban_destino,
        "importe": body.importe, "concepto": body.concepto,
        "_links": {"self": {"href": f"/v1/transfer/{transfer_id}"}}
    }


@router.get("/documents/{filename}")
async def get_document(filename: str, request: Request, db: Session = Depends(get_db)):
    ip           = request.client.host if request.client else "unknown"
    es_traversal = ".." in filename or "/" in filename

    guardar_alerta(db=db, ip=ip,
        tipo="PATH_TRAVERSAL" if es_traversal else "DOCUMENT_ACCESS",
        descripcion=f"Acceso a documento: {filename}",
        payload={"filename": filename, "path_traversal": es_traversal},
        severidad="critical" if es_traversal else "medium")

    if es_traversal:
        raise HTTPException(status_code=403, detail="Forbidden")
    if filename not in DOCUMENTOS_FALSOS:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"filename": filename, "content": DOCUMENTOS_FALSOS[filename],
            "encoding": "base64", "size": len(DOCUMENTOS_FALSOS[filename])}


@router.post("/password-reset")
async def password_reset(body: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    from app.database.models import Usuario
    ip  = request.client.host if request.client else "unknown"
    xss = "<script" in body.email or "javascript:" in body.email.lower()

    guardar_alerta(db=db, ip=ip,
        tipo="XSS" if xss else "PASSWORD_RESET",
        descripcion=f"Password reset solicitado para: {body.email}",
        payload={"email": body.email, "xss_detected": xss},
        severidad="high" if xss else "low")

    usuario = db.query(Usuario).filter(Usuario.email == body.email).first()
    if usuario:
        asyncio.get_event_loop().run_in_executor(
            None, _enviar_otp_reset, body.email, usuario.nombre
        )

    return {"mensaje": f"Si {body.email} está registrado, recibirás un email.", "status": "sent"}


@router.get("/preview")
async def preview(url: str, request: Request, db: Session = Depends(get_db)):
    ip       = request.client.host if request.client else "unknown"
    es_interna = any(ip_priv in url for ip_priv in URLS_INTERNAS)
    es_imds    = "169.254.169.254" in url

    guardar_alerta(db=db, ip=ip,
        tipo="SSRF_IMDS" if es_imds else "SSRF" if es_interna else "PREVIEW",
        descripcion=f"Preview solicitado: {url}",
        payload={"url": url, "es_interna": es_interna, "es_imds": es_imds},
        severidad="critical" if es_imds else "high" if es_interna else "low")

    if es_imds:
        return IMDS_FAKE_RESPONSE
    if es_interna:
        raise HTTPException(status_code=504, detail="Gateway Timeout")

    return {"url": url, "title": "FinConnect - Documento externo",
            "description": "Previsualización no disponible", "status": "ok"}
